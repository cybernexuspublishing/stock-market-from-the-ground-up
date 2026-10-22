/* D07 v0.14.0.147. Owner-only READ-ONLY feedback triage.
 * Existing v107 feedback fields only, no member names, IDs, prompts, answers,
 * payment credentials, private rubrics or source content returned.
 */
const H={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0','vary':'Authorization',
 'x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=403)=>Object.assign(new Error(message),{status});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function cfg(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),
 pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!pub||!key)throw fail('Feedback review service not configured.',503);
 const headers={apikey:key,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
  headers.authorization='Bearer '+key;
 return{url,pub,headers};
}
async function query(c,path,options={}){
 const r=await fetch(c.url+'/rest/v1/'+path,{cache:'no-store',...options,
  headers:{...c.headers,...options.headers}});
 if(!r.ok)throw fail('Private feedback source is not available. Verify v107 SQL installation.',503);
 const rows=await r.json().catch(()=>null);
 if(!Array.isArray(rows))throw fail('Invalid feedback source response.',503);
 return{rows,headers:r.headers};
}
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return out({ok:false,error:'Read-only GET required.'},405);
  const c=cfg(env),token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)throw fail('Owner sign-in required.',401);
  const session=await fetch(c.url+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token},cache:'no-store'});
  if(!session.ok)throw fail('Owner session expired.',401);
  const identity=await session.json().catch(()=>null);
  if(!uuid.test(identity?.id||''))throw fail('Invalid session identity.',401);
  const id=encodeURIComponent(identity.id);
  const [profile,roles,flags]=await Promise.all([
   query(c,'profiles?select=account_kind&id=eq.'+id+'&limit=1'),
   query(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id+'&limit=30'),
   query(c,'admin_user_flags?select=status&user_id=eq.'+id+'&limit=1')
  ]);
  if(profile.rows[0]?.account_kind!=='member'||
     ['suspended','restricted'].includes(String(flags.rows[0]?.status||'').toLowerCase())||
     roles.rows.some(x=>['SHOWCASE_VIEWER','TEST'].includes(x.role_code)&&
      (!x.expires_at||Date.parse(x.expires_at)>Date.now()))||
     !roles.rows.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
   throw fail('Owner-only Tutor feedback review.',403);
  // A report by a member is NOT independently proof of a Tutor defect.
  // Pagination is bounded. Never expose the member UUID or full transcript.
  const page=Number(new URL(request.url).searchParams.get('page')||1);
  if(!Number.isSafeInteger(page)||page<1||page>100)throw fail('Invalid feedback page.',400);
  const limit=30;
  const records=await query(c,'gu_member_tutor_exchanges_v014102?select=id,feedback,feedback_note,feedback_at,generation,source_titles,created_at'+
   '&feedback=eq.report&order=feedback_at.desc,id.desc&limit='+limit+'&offset='+((page-1)*limit),{
   headers:{prefer:'count=exact'}
  });
  const countMatch=/\/(\d+)$/.exec(records.headers.get('content-range')||'');
  // No invented zero records when Supabase count is unavailable.
  if(!countMatch)throw fail('Feedback review count unavailable.',503);
  const total=Number(countMatch[1]);
  if(!Number.isSafeInteger(total)||records.rows.length>limit)throw fail('Feedback response validation failed.',503);
  return out({ok:true,page,pageSize:limit,total,
   reports:records.rows.map(r=>({
    id:uuid.test(r.id)?r.id:null,feedback:'report',
    note:typeof r.feedback_note==='string'?r.feedback_note.slice(0,500):'',
    createdAt:r.created_at||null,reportedAt:r.feedback_at||null,
    generation:String(r.generation||'unknown').slice(0,60),
    sourceTitles:Array.isArray(r.source_titles)?r.source_titles.slice(0,3)
     .map(t=>String(t).slice(0,120)):[] })),
   status:'UNVERIFIED_MEMBER_FEEDBACK',
   notice:'Owner-only reported Tutor responses. Read-only triage: do not treat reports as verified defects or mark them resolved without a separate audited case workflow.'});
 }catch(e){const code=[400,401,403,405].includes(e?.status)?e.status:503;
  return out({ok:false,error:code===503?'Owner Tutor feedback review temporarily unavailable.':
   e.message||'Feedback review denied.'},code)}
}
