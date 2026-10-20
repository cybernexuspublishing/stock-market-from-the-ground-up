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
 try{
  const response=await fetch(c.dbUrl+'/rest/v1/gu_ai_service_requests_v014103?select=id&user_id=eq.'+
   encodeURIComponent(userId)+'&reserved_at=gte.'+encodeURIComponent(day)+'&limit=101',{
    method:'GET',cache:'no-store',headers:jsonHeaders(c.dbKey)});
  if(!response.ok)throw Error('unavailable');
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length>100)throw Error('unavailable');
  return {enabled:true,state:'configured_meter_responding',memberDailyLimit:c.member,
   usedToday:rows.length,remainingToday:Math.max(0,c.member-rows.length),
   notice:'A reserved request counts toward quota even if provider inference fails; counts are not a provider invoice.'};
 }catch{
  return {enabled:false,state:'meter_unavailable',memberDailyLimit:c.member,
   remainingToday:null,
   reason:'Private request meter could not be verified. Paid AI inference is unavailable; source-grounded teaching is still available.'};
 }
}
