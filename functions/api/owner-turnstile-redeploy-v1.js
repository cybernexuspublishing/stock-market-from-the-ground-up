/* Owner-only Cloudflare Pages CAPTCHA switch + redeploy.
 * A scoped Pages Read/Write API token must be configured as an encrypted
 * Production variable GU_OWNER_CLOUDFLARE_PAGES_TOKEN. Never expose it.
 */
const PROJECT='stock-market-from-the-ground-up';
const ACCOUNT='4fe9e562905cf607b6f004d2374299fc';
const BASE='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/pages/projects/'+PROJECT;
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff'};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:HEADERS});
const failure=(message,status=503)=>Object.assign(Error(message),{status});
async function read(url,init){
 const r=await fetch(url,{cache:'no-store',...init});
 const v=await r.json().catch(()=>null);
 if(!r.ok||!v)throw failure('Provider request failed',r.status===401?401:r.status===403?403:503);
 return v;
}
function config(env){
 if(env.SUPABASE_URL!=='https://oxihglyfgzywsupnyicb.supabase.co'||!env.SUPABASE_PUBLISHABLE_KEY||
 !env.SUPABASE_SECRET_KEY)throw failure('Production Owner verification unavailable');
 return{base:env.SUPABASE_URL,pub:env.SUPABASE_PUBLISHABLE_KEY,
  service:env.SUPABASE_SECRET_KEY,
  pagesToken:env.GU_OWNER_CLOUDFLARE_PAGES_TOKEN,
  enforced:env.ENFORCE_AUTH_TURNSTILE_V135==='true',
  keysReady:!!env.TURNSTILE_SITE_KEY&&!!env.TURNSTILE_SECRET_KEY};
}
async function authorize(req,c,stepup){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!jwt)throw failure('Owner sign-in required',401);
 const h={apikey:c.pub,authorization:'Bearer '+jwt,'content-type':'application/json'};
 const user=await read(c.base+'/auth/v1/user',{headers:h});
 if(!/^[a-f0-9-]{36}$/i.test(user.id||''))throw failure('Owner sign-in required',401);
 const role=await read(c.base+'/rest/v1/rpc/gu_staff_role_v01432r1',{method:'POST',headers:h,body:'{}'});
 if(role?.ok!==true||role.role!=='OWNER')throw failure('Owner access required',403);
 if(stepup){
  const active=await read(c.base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',
   {method:'POST',headers:h,body:'{}'});
  if(active!==true)throw failure('Owner password confirmation required',403);
 }
 return user.id;
}
function apiHeaders(c){
 if(typeof c.pagesToken!=='string'||c.pagesToken.length<20)
  throw failure('Configure GU_OWNER_CLOUDFLARE_PAGES_TOKEN as a Cloudflare Production Secret before redeploying.');
 return{authorization:'Bearer '+c.pagesToken,'content-type':'application/json'};
}
async function cloudflare(c,path='',options={}){
 const v=await read(BASE+path,{headers:apiHeaders(c),...options});
 if(v.success!==true)throw failure('Cloudflare Pages did not accept the operation');
 return v.result;
}
function status(c){
 return{ok:true,enabled:c.enforced,keysReady:c.keysReady,
  configured:typeof c.pagesToken==='string'&&c.pagesToken.length>=20,
  project:PROJECT};
}
function svkey(k){return{apikey:k,...(k.startsWith('sb_secret_')?{}:{authorization:'Bearer '+k})}}
async function audit(c,actor,details){
 const r=await fetch(c.base+'/rest/v1/admin_audit_log',{method:'POST',cache:'no-store',
  headers:{...svkey(c.service),'content-type':'application/json',prefer:'return=representation'},
  body:JSON.stringify({actor_user_id:actor,action:'OWNER_TURNSTILE_ENFORCE_REDEPLOY',
   target_type:'cloudflare_pages',target_id:PROJECT,details})});
 if(!r.ok)throw failure('Cloudflare accepted deployment but audit recording failed; check deployment status.');
}
export async function onRequestGet({request,env}){
 try{const c=config(env);await authorize(request,c,false);return json(status(c))}
 catch(e){return json({ok:false,error:e.message},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)
   throw failure('Same-origin Owner action required',403);
  const body=await request.text();
  if(body.length>250)throw failure('Invalid request',400);
  let v;try{v=JSON.parse(body)}catch{throw failure('Invalid request',400)}
  if(v?.confirm!=='ENABLE_AUTH_TURNSTILE_AND_REDEPLOY'||Object.keys(v).length!==1)
   throw failure('Explicit Owner confirmation required',400);
  const c=config(env),actor=await authorize(request,c,true);
  if(!c.keysReady)throw failure('Configure Turnstile keys before redeploying.');
  const old=await cloudflare(c);
  if(old.name!==PROJECT||old.production_branch!=='main')throw failure('Unexpected Cloudflare project or branch',409);
  const envs=old.deployment_configs?.production?.env_vars||{};
  if(!envs.TURNSTILE_SITE_KEY||!envs.TURNSTILE_SECRET_KEY)
   throw failure('Production Turnstile keys are missing.');
  const before=envs.ENFORCE_AUTH_TURNSTILE_V135?.value;
  if(before!=='true'){
   await cloudflare(c,'',{method:'PATCH',
    body:JSON.stringify({deployment_configs:{production:{env_vars:{
     ENFORCE_AUTH_TURNSTILE_V135:{type:'plain_text',value:'true'}
    }}}})});
  }
  const verified=await cloudflare(c);
  if(verified.deployment_configs?.production?.env_vars?.ENFORCE_AUTH_TURNSTILE_V135?.value!=='true')
   throw failure('Cloudflare did not retain the required CAPTCHA setting');
  const previous=verified.latest_deployment;
  if(!previous?.id||previous.deployment_trigger?.type!=='ad_hoc'&&previous.deployment_trigger?.type!=='github:push'){
   // Deployment trigger labels can evolve; only the immutable project and ID are trusted.
   if(!/^[a-f0-9-]{36}$/i.test(String(previous?.id||'')))throw failure('Production deployment ID unavailable');
  }
  if(!/^[a-f0-9-]{36}$/i.test(String(previous.id)))
   throw failure('Production deployment ID unavailable');
  const retry=await cloudflare(c,'/deployments/'+encodeURIComponent(previous.id)+'/retry',{method:'POST'});
  if(!retry?.id||!/^[a-f0-9-]{36}$/i.test(String(retry.id)))
   throw failure('Cloudflare did not confirm the new deployment ID');
  await audit(c,actor,{setting:'ENFORCE_AUTH_TURNSTILE_V135',enabled:true,
   settingChanged:before!=='true',deploymentId:retry.id});
  return json({ok:true,enabled:true,redeployStarted:true,deploymentId:retry.id});
 }catch(e){return json({ok:false,error:e.message||'Cloudflare redeploy unavailable'},e.status||503)}
}
