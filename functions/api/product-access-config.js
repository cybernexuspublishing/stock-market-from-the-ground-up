/* Owner-only access-policy catalog and revisioned editor.
 * Price, purchases, grants, trial issuance, entitlement expiry, Stripe and Sparks
 * are deliberately OUTSIDE this endpoint; policies cannot mint access.
 */
import {memberIdentity} from './member-tool-access.js';
import {accessHeaders,allowedDurations,expirationPolicies,configuredModes,safeAccessConfig} from '../_lib/product-access-config-v1.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:H});
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const codePattern=/^[A-Z][A-Z0-9_]{2,79}$/;
async function rest(c,path,method='GET',body,prefer){
 const headers={...accessHeaders(c.secret)};
 if(body!==undefined)headers['content-type']='application/json';
 if(prefer)headers.prefer=prefer;
 const response=await fetch(c.base+'/rest/v1/'+path,{method,headers,cache:'no-store',
  body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok)throw invalid('Access policy storage unavailable.',503);
 const text=await response.text();
 return text?JSON.parse(text):null;
}
async function owner(env,request){
 const actor=await memberIdentity(env,request);
 const c=actor.config,uid=encodeURIComponent(actor.userId);
 const [profiles,roles,flags]=await Promise.all([
  rest(c,'profiles?select=account_kind,deleted_at&id=eq.'+uid+'&limit=1'),
  rest(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+uid+'&limit=30'),
  rest(c,'admin_user_flags?select=status&user_id=eq.'+uid+'&limit=20')
 ]);
 if(profiles?.length!==1||profiles[0]?.account_kind!=='member'||profiles[0]?.deleted_at!=null||
   !Array.isArray(roles)||!Array.isArray(flags)||
   flags.some(x=>['restricted','suspended'].includes(String(x.status||'').toLowerCase()))||
   roles.some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))||
   !roles.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
  throw invalid('Only an active Owner can manage product access policies.',403);
 return {c,userId:actor.userId};
}
function parsePolicy(body){
 const o=body;
 if(!o||typeof o!=='object'||Array.isArray(o)||!codePattern.test(o.product_code||'')||
    !Number.isSafeInteger(o.version)||o.version<1)throw invalid('Invalid product code or expected revision.');
 for(const field of ['free_access','trial_access','paid_access'])
  if(typeof o[field]!=='boolean')throw invalid(field+' must be a boolean.');
 if(!configuredModes.includes(o.policy_mode)||
    !expirationPolicies.includes(o.access_expiration_policy))
  throw invalid('Invalid access mode or expiration policy.');
 if(!Array.isArray(o.included_memberships)||o.included_memberships.length>20||
    o.included_memberships.some(x=>typeof x!=='string'||!codePattern.test(x))||
    new Set(o.included_memberships).size!==o.included_memberships.length)
  throw invalid('Membership inclusions must be unique approved-format codes.');
 if(!Array.isArray(o.purchase_durations)||
    o.purchase_durations.some(x=>!Number.isSafeInteger(x)||!allowedDurations.includes(x))||
    new Set(o.purchase_durations).size!==o.purchase_durations.length)
  throw invalid('Purchase durations must be unique: 1, 7, 14, 30 or 180 days.');
 return {
  free_access:o.free_access,trial_access:o.trial_access,paid_access:o.paid_access,
  included_memberships:o.included_memberships,purchase_durations:o.purchase_durations,
  access_expiration_policy:o.access_expiration_policy,policy_mode:o.policy_mode
 };
}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return json({ok:false,error:'Method not allowed.'},405);
 try{
  const auth=await owner(env,request);
  if(request.method==='GET'){
   const records=await rest(auth.c,'gu_product_access_config_v1?select=*&order=label.asc&limit=300');
   if(!Array.isArray(records))throw invalid('Access policies unavailable.',503);
   return json({ok:true,policies:records.map(safeAccessConfig).filter(Boolean),
    notice:'Legacy mode preserves the existing entitlement source. Trial or paid flags do not authorize checkout or mint access.'});
  }
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw invalid('Cross-origin update denied.',403);
  const length=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(length)||length>6000)throw invalid('Policy update too large.',413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>6000)throw invalid('Policy update too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw invalid('Invalid JSON update.')}
  const policy=parsePolicy(body);
  const rows=await rest(auth.c,'gu_product_access_config_v1?product_code=eq.'+
   encodeURIComponent(body.product_code)+'&version=eq.'+body.version,'PATCH',{
   ...policy,version:body.version+1,updated_at:new Date().toISOString(),updated_by:auth.userId
  },'return=representation');
  if(!Array.isArray(rows)||rows.length>1)throw invalid('Policy change integrity unavailable.',503);
  if(rows.length===0)throw invalid('Product configuration changed in another session or does not exist. Refresh.',409);
  return json({ok:true,policy:safeAccessConfig(rows[0])});
 }catch(e){
  const status=[400,401,403,405,409,413].includes(e.status)?e.status:503;
  return json({ok:false,error:status===503?'Product access configuration temporarily unavailable.':e.message},status);
 }
}
