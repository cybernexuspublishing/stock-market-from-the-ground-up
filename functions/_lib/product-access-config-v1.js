/* Shared, server-only product access configuration.
 * Existing grants, Stripe invoices and timebound passes remain authoritative.
 * Policy flags must NEVER be interpreted as a receipt or an entitlement grant.
 */
const validCode = /^[A-Z][A-Z0-9_]{2,79}$/;
export const allowedDurations=Object.freeze([1,7,14,30,180]);
export const expirationPolicies=Object.freeze(['fixed_term','membership_bound','non_expiring','session_only']);
export const configuredModes=Object.freeze(['legacy','configured']);
export const accessHeaders=secret=>{
 const h={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  h.authorization='Bearer '+secret;
 return h;
};
export function safeAccessConfig(row){
 if(!row||typeof row!=='object'||!validCode.test(String(row.product_code||'')))return null;
 return {
  product_code:row.product_code,
  label:String(row.label||row.product_code),
  free_access:row.free_access===true,
  trial_access:row.trial_access===true,
  paid_access:row.paid_access===true,
  included_memberships:Array.isArray(row.included_memberships)?row.included_memberships:[],
  purchase_durations:Array.isArray(row.purchase_durations)?row.purchase_durations:[],
  access_expiration_policy:expirationPolicies.includes(row.access_expiration_policy)?row.access_expiration_policy:'fixed_term',
  policy_mode:row.policy_mode==='configured'?'configured':'legacy',
  version:Number(row.version)||1
 };
}
export async function readProductAccessConfig(config,productCode){
 if(!validCode.test(String(productCode||'')))return null;
 const base=String(config.base||'').replace(/\/$/,'');
 const secret=String(config.secret||'');
 if(!/^https:\/\//.test(base)||!secret)return null;
 try{
  const r=await fetch(base+'/rest/v1/gu_product_access_config_v1?select=product_code,label,free_access,trial_access,paid_access,included_memberships,purchase_durations,access_expiration_policy,policy_mode,version&product_code=eq.'+
   encodeURIComponent(productCode)+'&limit=1',
   {headers:accessHeaders(secret),cache:'no-store'});
  if(!r.ok)return null; // Legacy-only fallback: never creates a premium grant.
  const rows=await r.json();
  return Array.isArray(rows)?safeAccessConfig(rows[0]):null;
 }catch{return null}
}
export function publicProductAccess(config){
 if(!config)return null;
 const {product_code,label,free_access,trial_access,paid_access,included_memberships,
  purchase_durations,access_expiration_policy,policy_mode,version}=config;
 return {product_code,label,free_access,trial_access,paid_access,included_memberships,
  purchase_durations,access_expiration_policy,policy_mode,version};
}
