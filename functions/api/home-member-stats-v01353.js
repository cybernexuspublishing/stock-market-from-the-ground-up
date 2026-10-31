/* v0.13.5.3 public aggregate statistics + owner-controlled display + opt-in
   authenticated heartbeat. No public user IDs, emails, staff names, or raw presence. */
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const send=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const str=x=>String(x??'').trim();
function config(env){const base=str(env.SUPABASE_URL).replace(/\/$/,''),pub=str(env.SUPABASE_PUBLISHABLE_KEY),secret=str(env.SUPABASE_SECRET_KEY);if(!base||!pub||!secret)throw err('Statistics configuration missing.',503);return{base,pub,secret}}
async function query(url,options={}){const r=await fetch(url,{...options,cache:'no-store'}),t=await r.text();if(!r.ok)throw err('Statistics service unavailable.',r.status>=500?503:r.status);let data=null;try{data=t?JSON.parse(t):null}catch{}return{r,data}}
async function table(env,path,opt={}){const c=config(env);return query(c.base+'/rest/v1/'+path,{method:opt.method||'GET',headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(opt.count?{'prefer':'count=exact','range':'0-0'}:{}),...(opt.prefer?{'prefer':opt.prefer}:{}),...(opt.body===undefined?{}:{'content-type':'application/json'})},body:opt.body===undefined?undefined:JSON.stringify(opt.body)})}
async function identity(env,req){const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw err('Sign in required.',401);const c=config(env),u=(await query(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}})).data;if(!u?.id)throw err('Invalid session.',401);return u}
async function owner(env,user){const [p,r,f]=await Promise.all([table(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(user.id)+'&limit=1'),table(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(user.id)),table(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1')]);if(p.data?.[0]?.account_kind!=='member'||['suspended','restricted'].includes(String(f.data?.[0]?.status||'').toLowerCase()))throw err('Account is not eligible for Owner statistics changes.',403);if(!r.data?.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))throw err('OWNER authority required.',403)}
async function settings(env){const r=await table(env,'site_settings?select=value&setting_key=eq.community.member_stats&limit=1'),v=r.data?.[0]?.value||{};return {mode:['custom','range'].includes(v.mode)?v.mode:'live',customRegistered:Number(v.customRegistered)||0,customOnline:Number(v.customOnline)||0,registeredMin:Number(v.registeredMin)||0,registeredMax:Number(v.registeredMax)||0,onlineMin:Number(v.onlineMin)||0,onlineMax:Number(v.onlineMax)||0,refreshMinMinutes:Number(v.refreshMinMinutes)||1,refreshMaxMinutes:Number(v.refreshMaxMinutes)||1,message:typeof v.message==='string'?v.message.slice(0,160):'',show:v.show!==false,extras:{registrationTrends:v.registrationTrends===true,membershipBreakdown:v.membershipBreakdown===true,learningEngagement:v.learningEngagement===true}}}
// Stable pseudo-random demonstration values: synchronized across edge instances within
// a scheduled interval. These NEVER represent actual members or simultaneous sessions.
function sampleInt(seed,min,max){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return min+(h>>>0)%(max-min+1)}
function demonstrationPeriod(s,time=Date.now()){
 const lo=Math.max(1,Math.min(30,Number(s.refreshMinMinutes)||1));
 const hi=Math.max(lo,Math.min(30,Number(s.refreshMaxMinutes)||lo));
 const hour=Math.floor(time/3600000),minute=Math.floor((time%3600000)/60000);
 const minutes=sampleInt('interval:'+hour+':'+lo+':'+hi,lo,hi);
 const period=Math.floor(minute/minutes);
 const nextMs=Math.min((hour+1)*3600000,(hour*3600000+(period+1)*minutes*60000));
 return {key:hour+':'+period+':'+minutes,minutes,nextRefreshSeconds:Math.max(15,Math.ceil((nextMs-time)/1000))};
}
async function count(env,path){const r=await table(env,path,{count:true}),m=(r.r.headers.get('content-range')||'').match(/\/(\d+)$/);if(!m)throw err('Statistics count not available.',503);return Number(m[1])}
export async function onRequest({request,env}){try{const action=str(new URL(request.url).searchParams.get('action'))||'public';
 if(request.method==='GET'&&(action==='public'||action==='settings')){
  if(action==='settings')await owner(env,await identity(env,request));
  const s=await settings(env);if(action==='settings')return send({ok:true,settings:s});
  if(!s.show)return send({ok:true,show:false});
  if(s.mode==='custom')return send({ok:true,show:true,mode:'custom',registered:s.customRegistered,online:s.customOnline,label:s.message,extras:s.extras,nextRefreshSeconds:60});
  if(s.mode==='range'){const period=demonstrationPeriod(s),registered=sampleInt('registered:'+period.key,s.registeredMin,s.registeredMax),online=sampleInt('online:'+period.key,s.onlineMin,s.onlineMax);return send({ok:true,show:true,mode:'range',registered,online:Math.min(online,registered),label:s.message,extras:s.extras,nextRefreshSeconds:period.nextRefreshSeconds,intervalMinutes:period.minutes})}
  const since=new Date(Date.now()-60*60000).toISOString();const [registered,online]=await Promise.all([
    count(env,'profiles?select=id&account_kind=eq.member'),count(env,'member_presence_v01353?select=user_id&last_seen_at=gte.'+encodeURIComponent(since))]);
  return send({ok:true,show:true,mode:'live',registered,online,label:'',extras:s.extras});
 }
 if(request.method==='POST'&&action==='heartbeat'){
  const user=await identity(env,request),kind=(await table(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(user.id)+'&limit=1')).data?.[0]?.account_kind;
  if(kind!=='member')return send({ok:true,recorded:false});
  const flag=(await table(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1')).data?.[0]?.status;
  if(['suspended','restricted'].includes(String(flag||'').toLowerCase()))return send({ok:true,recorded:false});
  await table(env,'member_presence_v01353?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:user.id,last_seen_at:new Date().toISOString()}});
  return send({ok:true,recorded:true});
 }
 if(request.method==='POST'&&action==='save'){
  const user=await identity(env,request);await owner(env,user);
  const b=await request.json().catch(()=>null);if(!b||JSON.stringify(b).length>1000)throw err('Invalid configuration.');
  const mode=['live','custom','range'].includes(b.mode)?b.mode:null;if(!mode)throw err('Choose Live, fixed figures or illustrative ranges.');
  const numbers=['customRegistered','customOnline'].map(k=>Number(b[k]));if(numbers.some(n=>!Number.isSafeInteger(n)||n<0||n>1000000000))throw err('Custom counters must be whole numbers between zero and one billion.');
  if(numbers[1]>numbers[0])throw err('Online members cannot exceed registered members.');
  const values=['registeredMin','registeredMax','onlineMin','onlineMax'].map(k=>Number(b[k]??0));
  if(values.some(n=>!Number.isSafeInteger(n)||n<0||n>1000000000))throw err('Illustrative ranges must be nonnegative whole numbers.');
  if(mode==='range'&&(values[0]>values[1]||values[2]>values[3]||values[3]>values[0]))throw err('Invalid demonstration range: online maximum must not exceed the registered minimum.');
  const refreshMinMinutes=Number(b.refreshMinMinutes??1),refreshMaxMinutes=Number(b.refreshMaxMinutes??1);if(!Number.isInteger(refreshMinMinutes)||!Number.isInteger(refreshMaxMinutes)||refreshMinMinutes<1||refreshMaxMinutes>30||refreshMinMinutes>refreshMaxMinutes)throw err('Refresh interval must be between 1 and 30 minutes, with minimum no greater than maximum.');
  const message=typeof b.message==='string'?b.message.trim():'';if(message.length>160||/[\u0000-\u0009\u000b-\u001f\u007f]/.test(message))throw err('Optional message must be 160 characters or fewer and contain no control characters.');
  const data={message,mode,customRegistered:numbers[0],customOnline:numbers[1],registeredMin:values[0],registeredMax:values[1],onlineMin:values[2],onlineMax:values[3],refreshMinMinutes,refreshMaxMinutes,show:b.show!==false,registrationTrends:b.registrationTrends===true,membershipBreakdown:b.membershipBreakdown===true,learningEngagement:b.learningEngagement===true};
  await table(env,'site_settings?setting_key=eq.community.member_stats',{method:'PATCH',prefer:'return=minimal',body:{value:data,updated_at:new Date().toISOString()}});
  await table(env,'admin_audit_log',{method:'POST',prefer:'return=minimal',body:{actor_user_id:user.id,action:'v1353.community_stats.settings',target_type:'site_settings',target_id:'community.member_stats',details:data}});
  return send({ok:true,settings:data});
 }
 return send({ok:false,error:'Unsupported operation.'},405);
}catch(e){return send({ok:false,error:e.message||'Statistics unavailable.'},e.status||500)}}
