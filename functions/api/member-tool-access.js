/* Server-side access contract for first-party paid training features.
 * PRIVATE credentials are never returned to the browser. This module is imported by
 * privileged Cloudflare Functions; no reliance on client-computed membership labels.
 */
import {readProductAccessConfig,publicProductAccess} from '../_lib/product-access-config-v1.js';
const enc=encodeURIComponent;
const error=(message,status=403)=>Object.assign(new Error(message),{status});
function config(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),pub=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;if(!base||!pub||!secret)throw error('Training authorization is not configured.',503);return{base,pub,secret}}
async function ask(url,init,{identity=false}={}){
 const r=await fetch(url,{...init,cache:'no-store'});
 // GoTrue may return either 401 or 403 for an invalid bearer. Both represent
 // unauthenticated callers, not an unavailable database or member service.
 if(!r.ok){
  if(identity&&(r.status===401||r.status===403))throw error('Invalid session.',401);
  throw error('Training authorization unavailable.',503);
 }
 return r.json();
}
export async function memberIdentity(env,req){
 const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw error('Sign in required.',401);
 const c=config(env);
 const user=await ask(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}},{identity:true});
 if(!user?.id)throw error('Invalid session.',401);
 return {userId:user.id,aiOptedIn:user?.user_metadata?.market_tutor_ai_enabled===true,config:c};
}
export async function toolAccess(env,req,toolCode){if(!['MARKET_SIMULATOR','ONDEMAND_TRAINING','INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_TUTOR'].includes(toolCode))throw error('Unknown training tool.',400);
 const actor=await memberIdentity(env,req);
 const user={id:actor.userId},c=actor.config;
 // Legacy service-role JWTs support Bearer. Modern sb_secret_* values MUST only
 // be supplied as apikey; using them as JWT Authorization breaks PostgREST.
 const headers={apikey:c.secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;

 // Free study eligibility is a separate, positive authorization decision.
 // A denied premium tool does not imply the caller is eligible for Free.
 const profile=await ask(c.base+'/rest/v1/profiles?select=account_kind,deleted_at&id=eq.'+enc(user.id)+'&limit=1',{headers});
 if(!Array.isArray(profile)||profile.length!==1||profile[0].account_kind!=='member'||profile[0].deleted_at!=null)
  return {authorized:false,freeEligible:false,denialCode:'ineligible_account',userId:user.id,
   reason:'Only eligible production member accounts may use this tool.'};
 const flags=await ask(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+enc(user.id)+'&limit=20',{headers});
 if(!Array.isArray(flags)||flags.length>20)throw error('Member restrictions could not be verified.',503);
 if(flags.some(f=>['suspended','restricted'].includes(String(f?.status||'').toLowerCase())))
  return {authorized:false,freeEligible:false,denialCode:'restricted_account',userId:user.id,
   reason:'Account access is restricted. Contact support.'};
 const roles=await ask(c.base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+
  enc(user.id)+'&role_code=eq.SHOWCASE_VIEWER&limit=20',{headers});
 if(!Array.isArray(roles)||roles.length>20)throw error('Showcase restrictions could not be verified.',503);
 if(roles.some(role=>role?.role_code==='SHOWCASE_VIEWER'&&
   (!role.expires_at||!Number.isFinite(Date.parse(role.expires_at))||Date.parse(role.expires_at)>Date.now())))
  return {authorized:false,freeEligible:false,denialCode:'showcase_account',userId:user.id,
   reason:'Showcase accounts cannot use private member study or premium tools.'};
 const allowed=await ask(c.base+'/rest/v1/rpc/user_has_tool_access',{
  method:'POST',headers:{...headers,'content-type':'application/json'},
  body:JSON.stringify({target_user:user.id,target_tool:toolCode})});
 if(typeof allowed!=='boolean')throw error('Tool entitlement result could not be verified.',503);
 const config=await readProductAccessConfig(c,toolCode);
 return {authorized:allowed,freeEligible:true,accessConfiguration:publicProductAccess(config),aiOptedIn:actor.aiOptedIn===true,
  denialCode:allowed?null:'premium_entitlement_required',userId:user.id,
  reason:allowed?'':'An active plan or matching individual tool entitlement is required.'};
}
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
export async function onRequest({request,env}){try{if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'Method not allowed.'}),{status:405,headers:H});const toolCode=new URL(request.url).searchParams.get('tool')||'';const a=await toolAccess(env,request,toolCode);return new Response(JSON.stringify({ok:true,authorized:a.authorized,freeEligible:a.freeEligible===true,denialCode:a.denialCode||null,tool:toolCode,reason:a.reason,accessConfiguration:a.accessConfiguration||null}),{status:200,headers:H})}catch(e){return new Response(JSON.stringify({ok:false,error:e.message||'Authorization error.'}),{status:e.status||500,headers:H})}}
