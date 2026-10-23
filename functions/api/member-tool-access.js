/* Server-side access contract for first-party paid training features.
 * PRIVATE credentials are never returned to the browser. This module is imported by
 * privileged Cloudflare Functions; no reliance on client-computed membership labels.
 */
const enc=encodeURIComponent;
const error=(message,status=403)=>Object.assign(new Error(message),{status});
function config(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),pub=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;if(!base||!pub||!secret)throw error('Training authorization is not configured.',503);return{base,pub,secret}}
async function ask(url,init){const r=await fetch(url,{...init,cache:'no-store'});if(!r.ok)throw error('Training authorization unavailable.',r.status===401?401:503);return r.json()}
export async function memberIdentity(env,req){
 const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw error('Sign in required.',401);
 const c=config(env);
 const user=await ask(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(!user?.id)throw error('Invalid session.',401);
 return {userId:user.id,config:c};
}
export async function toolAccess(env,req,toolCode){if(!['MARKET_SIMULATOR','ONDEMAND_TRAINING','JOURNAL_ANALYTICS','MARKET_TUTOR'].includes(toolCode))throw error('Unknown training tool.',400);
 const actor=await memberIdentity(env,req);
 const user={id:actor.userId},c=actor.config;
 // Legacy service-role JWTs support Bearer. Modern sb_secret_* values MUST only
 // be supplied as apikey; using them as JWT Authorization breaks PostgREST.
 const headers={apikey:c.secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;
 const profile=await ask(c.base+'/rest/v1/profiles?select=account_kind&id=eq.'+enc(user.id)+'&limit=1',{headers});if(profile[0]?.account_kind!=='member')return{authorized:false,userId:user.id,reason:'Only eligible production member accounts may use this tool.'};
 const flags=await ask(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+enc(user.id)+'&limit=1',{headers});
 if(['suspended','restricted'].includes(String(flags[0]?.status||'').toLowerCase()))return {authorized:false,userId:user.id,reason:'Account access is restricted. Contact support.'};
 const allowed=await ask(c.base+'/rest/v1/rpc/user_has_tool_access',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({target_user:user.id,target_tool:toolCode})});
 return{authorized:allowed===true,userId:user.id,reason:allowed===true?'':'An active plan or matching individual tool entitlement is required.'};
}
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
export async function onRequest({request,env}){try{if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'Method not allowed.'}),{status:405,headers:H});const toolCode=new URL(request.url).searchParams.get('tool')||'';const a=await toolAccess(env,request,toolCode);return new Response(JSON.stringify({ok:true,authorized:a.authorized,tool:toolCode,reason:a.reason}),{status:200,headers:H})}catch(e){return new Response(JSON.stringify({ok:false,error:e.message||'Authorization error.'}),{status:e.status||500,headers:H})}}
