/* General source Tutor abuse control, independent of v103 paid model quota.
 * Existing v107 Supabase rate bucket: 8/member/minute, 120/member/UTC day.
 * Legacy/source-only teaching degrades to available if v107 is not installed;
 * model-backed requests STILL require the fail-closed v103 paid reservation.
 */
export async function tutorRequestLimit(env,userId){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
  key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!key)return {allowed:true,verified:false,reason:'not_installed'};
 const headers={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))headers.authorization='Bearer '+key;
 try{
  const r=await fetch(base+'/rest/v1/rpc/gu_v014107_take_tutor_request',{
   method:'POST',cache:'no-store',headers,body:JSON.stringify({p_user:userId})});
  if(!r.ok)return {allowed:true,verified:false,reason:'not_installed'};
  const value=await r.json();
  if(typeof value?.accepted!=='boolean')return {allowed:true,verified:false,reason:'invalid_meter_response'};
  return {allowed:value.accepted,verified:true,reason:String(value.reason||'unknown')};
 }catch{return {allowed:true,verified:false,reason:'meter_unavailable'}}
}
