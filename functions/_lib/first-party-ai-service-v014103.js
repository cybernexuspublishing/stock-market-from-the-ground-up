/* First-party Market Tutor AI orchestration v0.14.0.103.
 * The paid PRODUCT is our first-party software/service. Generative inference
 * presently uses an external model provider privately; do not claim the weights
 * or foundation model are developed, owned or hosted by this company.
 * No browser secrets. Neither user prompts nor outputs stored in request ledger.
 * Disabled unless owner enables, keys exist, exact positive limits configured,
 * an atomic reservation succeeds, and the MEMBER opts in on each request.
 */
const isJwt=s=>/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);
const positive=(x,min,max)=>/^[1-9][0-9]*$/.test(String(x||''))&&Number(x)>=min&&Number(x)<=max?Number(x):null;
const jsonHeaders=key=>{
 const h={apikey:key,accept:'application/json','content-type':'application/json'};
 if(isJwt(key))h.authorization='Bearer '+key;
 return h;
};
export function aiServiceConfig(env){
 const member=positive(env.AI_SERVICE_MEMBER_DAILY_LIMIT,1,100);
 const day=positive(env.AI_SERVICE_GLOBAL_DAILY_LIMIT,1,10000);
 const month=positive(env.AI_SERVICE_GLOBAL_MONTHLY_LIMIT,1,250000);
 const model=String(env.AI_TUTOR_MODEL||'').trim();
 const key=String(env.AI_TUTOR_API_KEY||'').trim();
 const dbUrl=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const dbKey=String(env.SUPABASE_SECRET_KEY||'');
 const enabled=env.AI_SERVICE_ENABLED==='true'&&!!member&&!!day&&!!month&&
  !!key&&!!model&&/^https:\/\/[^/]+$/.test(dbUrl)&&!!dbKey;
 return {enabled,member:member||0,day:day||0,month:month||0,
  modelConfigured:!!key&&!!model,dbUrl,dbKey,
  state:enabled?'enabled_for_reserved_requests':'not_configured'};
}
export async function reserveAiRequest(env,userId,requestId){
 const c=aiServiceConfig(env);
 if(!c.enabled)return {accepted:false,reason:'service_disabled'};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)||
 !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))
 return {accepted:false,reason:'invalid_request_id'};
 try{
  const response=await fetch(c.dbUrl+'/rest/v1/rpc/gu_v014103_reserve_ai_request',{
   method:'POST',cache:'no-store',headers:jsonHeaders(c.dbKey),
   body:JSON.stringify({p_user:userId,p_request:requestId,
    p_member_day_limit:c.member,p_global_day_limit:c.day,p_global_month_limit:c.month})
  });
  if(!response.ok)return {accepted:false,reason:'meter_unavailable'};
  const result=await response.json();
  if(!result||typeof result!=='object'||typeof result.accepted!=='boolean')
   return {accepted:false,reason:'meter_unavailable'};
  return {accepted:result.accepted===true,reason:String(result.reason||'unknown'),
   remainingMemberToday:Math.max(0,Number(result.remainingMemberToday)||0)};
 }catch{return {accepted:false,reason:'meter_unavailable'}}
}
export async function aiServiceMemberStatus(env,userId){
 const c=aiServiceConfig(env);
 if(!c.enabled)return {enabled:false,state:c.state,
  reason:'The paid AI inference service is not currently enabled. Source-grounded instruction remains available.',
  memberDailyLimit:c.member||null,remainingToday:null};
 const now=new Date(),day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).toISOString();
 const month=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
 async function counted(since,memberOnly){
  const filter='?select=id&reserved_at=gte.'+encodeURIComponent(since)+
   (memberOnly?'&user_id=eq.'+encodeURIComponent(userId):'')+'&limit=1';
  const response=await fetch(c.dbUrl+'/rest/v1/gu_ai_service_requests_v014103'+filter,{
   method:'GET',cache:'no-store',headers:{...jsonHeaders(c.dbKey),prefer:'count=exact'}});
  if(!response.ok)throw Error('meter unavailable');
  const range=response.headers.get('content-range')||'';
  const found=/\/(\d+)$/.exec(range);
  if(!found)throw Error('meter count missing');
  return Number(found[1]);
 }
 try{
  const [memberUsed,globalUsed,monthlyUsed]=await Promise.all([
   counted(day,true),counted(day,false),counted(month,false)
  ]);
  if(![memberUsed,globalUsed,monthlyUsed].every(Number.isSafeInteger))throw Error('meter corrupt');
  const globalAvailable=globalUsed<c.day&&monthlyUsed<c.month;
  const remaining=Math.max(0,c.member-memberUsed);
  return {enabled:globalAvailable&&remaining>0,state:globalAvailable?'configured_meter_responding':'global_cap_exhausted',
   memberDailyLimit:c.member,usedToday:memberUsed,remainingToday:remaining,
   globalAvailable,globalDailyRemaining:Math.max(0,c.day-globalUsed),
   globalMonthlyRemaining:Math.max(0,c.month-monthlyUsed),
   reason:globalAvailable?'Member and site-wide budgets respond.':'The site-wide daily or monthly request limit is exhausted.',
   notice:'A reserved request counts against quota even when inference fails; counts are not a provider invoice.'};
 }catch{
  return {enabled:false,state:'meter_unavailable',memberDailyLimit:c.member,
   remainingToday:null,globalAvailable:false,globalDailyRemaining:null,globalMonthlyRemaining:null,
   reason:'The private AI meter could not verify member AND global request limits. Paid inference is unavailable; source-grounded teaching remains available.'};
 }
}
