/* SMFGU Owner growth funnel V1: fully aggregated, read-only, fail-closed.
 * Separate anonymous public GA4 data from the authoritative Supabase account
 * and Free Foundations records. Never return names, IDs, emails or notes.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const string=v=>String(v||'').trim();
const serviceHeaders=key=>({apikey:key,...(key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+key})});
const parseDate=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:NaN};
const utcDay=x=>new Date(x).toISOString().slice(0,10);
async function getJson(url,headers){
 const r=await fetch(url,{method:'GET',headers:{accept:'application/json',...headers},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Growth report data provider unavailable.');
 const j=await r.json();
 return {json:j,headers:r.headers};
}
function config(env){
 const base=string(env.SUPABASE_URL).replace(/\/$/,'');
 const pub=string(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY);
 const secret=string(env.SUPABASE_SECRET_KEY);
 if(!base.startsWith('https://')||!pub||!secret)throw Error('Growth report data service is unavailable.');
 return {base,pub,secret};
}
async function checkOwner(request,c){
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)return {verified:false,status:401};
 let actor;
 try{actor=(await getJson(c.base+'/auth/v1/user',{apikey:c.pub,authorization:'Bearer '+token})).json}
 catch{return {verified:false,status:403}}
 if(!/^[a-f0-9-]{36}$/i.test(actor?.id||''))return {verified:false,status:403};
 const id=encodeURIComponent(actor.id), h=serviceHeaders(c.secret);
 const [roles,profiles,flags]=await Promise.all([
  getJson(c.base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+id,h),
  getJson(c.base+'/rest/v1/profiles?select=account_kind,deleted_at&id=eq.'+id+'&limit=1',h),
  getJson(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+id+'&limit=1',h)
 ]);
 const active=(roles.json||[]).filter(x=>!x.expires_at||parseDate(x.expires_at)>Date.now()).map(x=>x.role_code);
 const profile=profiles.json?.[0],flag=flags.json?.[0];
 const ok=active.includes('OWNER')&&!active.includes('SHOWCASE_VIEWER')&&profile?.account_kind==='member'&&
  !profile?.deleted_at&&!['restricted','suspended'].includes(string(flag?.status).toLowerCase());
 return {verified:ok,status:403};
}
const MAX_PAGES=20,PER_PAGE=500;
async function restRows(c,table,columns,filter=''){
 const rows=[],h=serviceHeaders(c.secret);
 for(let page=0;page<MAX_PAGES;page++){
  const u=c.base+'/rest/v1/'+table+'?select='+encodeURIComponent(columns)+(filter?'&'+filter:'')+
   '&limit='+PER_PAGE+'&offset='+(page*PER_PAGE);
  const result=await getJson(u,h),items=result.json;
  if(!Array.isArray(items))throw Error('Growth report source returned an invalid table.');
  rows.push(...items);
  if(items.length<PER_PAGE)return rows;
 }
 throw Error('The source exceeds the safe analysis page limit; no partial counts shown.');
}
async function authUsers(c){
 const rows=[],h=serviceHeaders(c.secret);
 for(let page=1;page<=MAX_PAGES;page++){
  const u=c.base+'/auth/v1/admin/users?page='+page+'&per_page='+PER_PAGE;
  const {json}=await getJson(u,h);
  if(!Array.isArray(json?.users))throw Error('Auth account list could not be verified.');
  rows.push(...json.users);
  if(json.users.length<PER_PAGE)return rows;
 }
 throw Error('Auth accounts exceed the analysis page limit; no partial counts shown.');
}
function buildCounts(data,days,now){
 const since=now-days*86400000, recentNew=[], allEligible=[];
 const byProfile=new Map(data.profiles.map(x=>[x.id,x]));
 const staff=new Set(data.roles.filter(r=>!r.expires_at||parseDate(r.expires_at)>now).map(x=>x.user_id));
 let excluded=0,missingProfiles=0;
 for(const user of data.users){
  if(user.deleted_at||user.is_anonymous===true)continue;
  const profile=byProfile.get(user.id),name=string(profile?.username).toLowerCase();
  if(staff.has(user.id)||name==='james_test'||profile?.account_kind==='showcase'||profile?.deleted_at){excluded++;continue}
  if(!profile||profile.account_kind!=='member'){missingProfiles++;continue}
  allEligible.push(user);
  const created=parseDate(user.created_at);
  if(Number.isFinite(created)&&created>=since&&created<=now)recentNew.push(user);
 }
 const enrolled=new Set(data.enrollments.filter(e=>e.program_code==='free5').map(e=>e.user_id));
 const started=new Set(data.audits.filter(e=>e.program_code==='free5'&&e.day_number===1&&e.event_kind==='day_started').map(e=>e.member_id));
 for(const p of data.progress)if(p.program_code==='free5'&&p.day_number===1&&p.started_at)started.add(p.user_id);
 const savedDay1=new Set(data.progress.filter(p=>p.program_code==='free5'&&p.day_number===1&&p.status==='reflection_saved'&&p.first_reflected_at).map(p=>p.user_id));
 const savedDay5=new Set(data.progress.filter(p=>p.program_code==='free5'&&p.day_number===5&&p.status==='reflection_saved'&&p.first_reflected_at).map(p=>p.user_id));
 const count=(a,fn)=>a.filter(fn).length;
 const verified=u=>Boolean(u.email_confirmed_at);
 const funnel=members=>({
  registered:members.length,
  verified:count(members,verified),
  free5_enrolled:count(members,u=>verified(u)&&enrolled.has(u.id)),
  day1_started:count(members,u=>verified(u)&&started.has(u.id)),
  day1_saved:count(members,u=>verified(u)&&savedDay1.has(u.id)),
  day5_saved:count(members,u=>verified(u)&&savedDay5.has(u.id))
 });
 const byDay=new Map();
 for(let i=days-1;i>=0;i--){
  const d=utcDay(now-i*86400000);
  byDay.set(d,{day:d,registered:0,verified_to_date:0,day1_started_to_date:0,day1_saved_to_date:0});
 }
 for(const u of recentNew){
  const d=utcDay(parseDate(u.created_at)),row=byDay.get(d);
  if(row){row.registered++;if(verified(u))row.verified_to_date++;if(started.has(u.id))row.day1_started_to_date++;if(savedDay1.has(u.id))row.day1_saved_to_date++;}
 }
 return {cohort:funnel(recentNew),all_time:funnel(allEligible),registration_days:[...byDay.values()],
  exclusions:{staff_and_known_qa:excluded,unclassified_profiles:missingProfiles},
  note:'Cohort stages are current cumulative states of accounts created in the requested UTC window; daily rows are registration cohorts, not daily event totals.'};
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return response({ok:false,error:'This report accepts GET only.'},405);
 const header=request.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(header))return response({ok:false,error:'Authentication required.'},401);
 let c;try{c=config(env)}catch{return response({ok:false,error:'Reporting service unavailable.'},503)}
 let owner;try{owner=await checkOwner(request,c)}catch{return response({ok:false,error:'Reporting service authorization unavailable.'},503)}
 if(!owner.verified)return response({ok:false,error:'Owner authorization required.'},owner.status);
 const url=new URL(request.url),allowed=new Set(['7','30','90']);
 const value=url.searchParams.get('days')||'30';
 if(!allowed.has(value))return response({ok:false,error:'Report range must be 7, 30 or 90 days.'},400);
 const days=Number(value),now=Date.now();
 try{
  const h=await Promise.all([
   authUsers(c),
   restRows(c,'profiles','id,username,account_kind,deleted_at'),
   restRows(c,'admin_user_roles','user_id,role_code,expires_at'),
   restRows(c,'gu_bootcamp_academy_enrollments_v014168','user_id,program_code','program_code=eq.free5'),
   restRows(c,'gu_bootcamp_academy_audit_v014295','member_id,program_code,day_number,event_kind','program_code=eq.free5&day_number=eq.1&event_kind=eq.day_started'),
   restRows(c,'gu_bootcamp_academy_progress_v014168','user_id,program_code,day_number,status,started_at,first_reflected_at','program_code=eq.free5')
  ]);
  return response({ok:true,source:'supabase_authoritative_aggregates',as_of_utc:new Date(now).toISOString(),
   days,window_start_utc:new Date(now-days*86400000).toISOString(),
   ...buildCounts({users:h[0],profiles:h[1],roles:h[2],enrollments:h[3],audits:h[4],progress:h[5]},days,now),
   caveats:['Staff and known James_Test QA identity excluded; other unidentified QA accounts may still require classification.',
     'Email verification means an actual email_confirmed_at value; account creation alone is not verification.',
     'Day starts are derived from genuine Academy audit or progress started_at. Saved is ungraded reflection_saved, not mastery.',
     'Supabase cohorts cannot be attributed to GA4 sessions without consented, privacy-safe identity linkage, which is not collected.',
     'GA4 and Search Console data are separate provider reports; they are not silently inferred from Supabase.']});
 }catch{return response({ok:false,error:'A source could not be fully verified; no partial report is displayed.'},503)}
}
