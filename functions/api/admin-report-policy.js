/* v0.14.0.17 — report-policy management with authenticated, Owner-only writes.
 * Generic admin site_settings endpoints cannot affect the dedicated policy table.
 */
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const forbidden=()=>json({ok:false,error:'You do not have permission to manage this policy.'},403);
async function fromServer(base,key,path,{method='GET',body}={}){
 const result=await fetch(`${base}/rest/v1/${path}`,{method,headers:{apikey:key,authorization:`Bearer ${key}`,...(body?{'content-type':'application/json',prefer:'return=representation'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await result.json().catch(()=>null);
 if(!result.ok){const x=new Error('Database contract unavailable');x.code=data?.message||'';x.http=result.status;throw x}
 return data;
}
async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return json({ok:false,error:'Method not allowed.'},405);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!base.startsWith('https://')||!pub||!secret)return json({ok:false,error:'Policy service not configured.'},503);
  const jwt=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!jwt)return json({ok:false,error:'Sign in to use the Admin Control Center.'},401);
  const auth=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:`Bearer ${jwt}`},cache:'no-store'});
  if(!auth.ok)return json({ok:false,error:'Session expired; sign in again.'},401);
  const identity=await auth.json().catch(()=>({})),id=identity?.id;
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(id||'')))return json({ok:false,error:'Invalid session.'},401);
  const filter=encodeURIComponent(id);
  const [profile,flags,roles]=await Promise.all([
   fromServer(base,secret,`profiles?select=account_kind&id=eq.${filter}&limit=1`),
   fromServer(base,secret,`admin_user_flags?select=status&user_id=eq.${filter}&limit=1`),
   fromServer(base,secret,`admin_user_roles?select=role_code,expires_at&user_id=eq.${filter}`)
  ]);
  const now=Date.now(),effective=(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>now).map(x=>x.role_code);
  if(profile?.[0]?.account_kind!=='member'||['restricted','suspended'].includes(String(flags?.[0]?.status||'').toLowerCase())||effective.includes('SHOWCASE_VIEWER'))return forbidden();
  const owner=effective.includes('OWNER');
  if(!owner){
   const grants=await fromServer(base,secret,'admin_role_permissions?select=role_code&permission_code=eq.forum.view');
   if(!(grants||[]).some(g=>effective.includes(g.role_code)))return forbidden();
  }
  if(request.method==='GET'){
   const rows=await fromServer(base,secret,'community_report_policy_v01417?select=policy_id,quota_enabled,quota_max,quota_hours,duplicate_enabled,duplicate_hours,version,updated_at&policy_id=eq.1&limit=1');
   if(!rows?.[0])return json({ok:false,error:'Reporting policy has not been installed.'},503);
   return json({ok:true,canEdit:owner,role:owner?'OWNER':'STAFF',policy:rows[0]});
  }
  if(!owner)return forbidden();
  if(Number(request.headers.get('content-length')||0)>2400)return json({ok:false,error:'Request too large.'},413);
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=='object'||Array.isArray(input))return json({ok:false,error:'Invalid policy submission.'},400);
  const integer=(value,lo,hi)=>Number.isInteger(value)&&value>=lo&&value<=hi;
  const {expectedVersion,quotaEnabled,quotaMax,quotaHours,duplicateEnabled,duplicateHours}=input;
  if(!integer(expectedVersion,1,Number.MAX_SAFE_INTEGER)||typeof quotaEnabled!=='boolean'||!integer(quotaMax,1,100)||
     !integer(quotaHours,1,168)||typeof duplicateEnabled!=='boolean'||!integer(duplicateHours,1,168))
    return json({ok:false,error:'Policy values are outside their safe bounds.'},400);
  const payload={p_actor:id,p_expected_version:expectedVersion,p_quota_enabled:quotaEnabled,p_quota_max:quotaMax,
   p_quota_hours:quotaHours,p_duplicate_enabled:duplicateEnabled,p_duplicate_hours:duplicateHours};
  const result=await fromServer(base,secret,'rpc/gu_owner_report_policy_save_v01417',{method:'POST',body:payload});
  return json({ok:true,policy:result});
 }catch(e){
  if(/POLICY_STALE/.test(e.code||''))return json({ok:false,error:'Another administrator changed the policy. Refresh and review before saving.',code:'POLICY_STALE'},409);
  if(/POLICY_NOT_AUTHORIZED/.test(e.code||''))return forbidden();
  if(/POLICY_INVALID/.test(e.code||''))return json({ok:false,error:'Invalid policy values.'},400);
  return json({ok:false,error:'Reporting policy is unavailable. Verify the database migration and Cloudflare logs.'},503);
 }
}
export {onRequestGet,onRequestPost};
function onRequestGet(ctx){return onRequest(ctx)}
function onRequestPost(ctx){return onRequest(ctx)}
