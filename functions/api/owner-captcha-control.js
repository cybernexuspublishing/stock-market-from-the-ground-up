/* One-click Owner CAPTCHA control. Changes Supabase Auth provider AND runtime
 * Cloudflare site flag. No management token -> visibly unavailable, no fake toggle.
 * Management token must be installed as an encrypted Pages Production binding.
 */
const j=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(message,status=503)=>Object.assign(new Error(message),{status});
const sv=(k)=>({apikey:k,...(k.startsWith('sb_secret_')?{}:{authorization:'Bearer '+k})});
const clean=s=>String(s??'').trim();
function conf(env){
 const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),
  secret=clean(env.SUPABASE_SECRET_KEY),pat=clean(env.SUPABASE_MANAGEMENT_ACCESS_TOKEN);
 if(base!=='https://oxihglyfgzywsupnyicb.supabase.co'||!pub||!secret)throw error('Production CAPTCHA registry unavailable');
 return {base,pub,secret,pat,ref:'oxihglyfgzywsupnyicb'};
}
async function read(url,options={}){
 const r=await fetch(url,{...options,cache:'no-store'}),value=await r.json().catch(()=>null);
 if(!r.ok||value===null)throw error('CAPTCHA control provider unavailable',r.status>=400&&r.status<500?r.status:503);
 return value;
}
async function owner(req,c,requireStepup=true){
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw error('Sign in as Owner',401);
 const h={apikey:c.pub,authorization:'Bearer '+token,'content-type':'application/json'};
 const u=await read(c.base+'/auth/v1/user',{headers:h});
 if(!/^[a-f0-9-]{36}$/i.test(u.id||''))throw error('Owner session not valid',401);
 const role=await read(c.base+'/rest/v1/rpc/gu_staff_role_v01432r1',{method:'POST',headers:h,body:'{}'});
 if(role?.ok!==true||role.role!=='OWNER')throw error('Owner authorization required',403);
 if(requireStepup){
 const step=await read(c.base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',{method:'POST',headers:h,body:'{}'});
 if(step!==true)throw error('Confirm your Owner password first',403);
 }
 return u.id;
}
const managementUrl=c=>'https://api.supabase.com/v1/projects/'+c.ref+'/config/auth';
const mh=c=>({authorization:'Bearer '+c.pat,'content-type':'application/json'});
async function actual(c){
 const r=await read(managementUrl(c),{headers:mh(c)});
 if(typeof r.security_captcha_enabled!=='boolean')throw error('Supabase did not return a verified CAPTCHA state');
 return r.security_captcha_enabled;
}
async function site(c){
 const a=await read(c.base+'/rest/v1/site_settings?select=value&setting_key=eq.auth.turnstile.owner_override_v1&limit=1',{headers:sv(c.secret)});
 if(!Array.isArray(a)||a.length!==1||typeof a[0].value!=='boolean')throw error('Website CAPTCHA setting incomplete');
 return a[0].value;
}
async function setSite(c,value){
 const url=c.base+'/rest/v1/site_settings?setting_key=eq.auth.turnstile.owner_override_v1';
 const r=await read(url,{method:'PATCH',headers:{...sv(c.secret),'content-type':'application/json',prefer:'return=representation'},
  body:JSON.stringify({value,updated_at:new Date().toISOString()})});
 if(!Array.isArray(r)||r.length!==1||r[0].value!==value)throw error('Website CAPTCHA state was not saved');
}
async function updateProvider(c,enabled){
 const r=await read(managementUrl(c),{method:'PATCH',headers:mh(c),body:JSON.stringify({security_captcha_enabled:enabled})});
 // Provider may return partial config; independent GET is the authority.
 if(typeof r.security_captcha_enabled==='boolean'&&r.security_captcha_enabled!==enabled)throw error('Supabase CAPTCHA update was rejected');
 if(await actual(c)!==enabled)throw error('Supabase CAPTCHA mode did not match the requested state');
}
export async function onRequestGet({request,env}){
 try{
  const c=conf(env);await owner(request,c,false);
  const website=await site(c),available=!!c.pat;
  if(!available)return j({ok:true,available:false,websiteEnabled:website,
   notice:'Add SUPABASE_MANAGEMENT_ACCESS_TOKEN as an encrypted Cloudflare Production secret with auth_config_read/auth_config_write permissions. The website switch cannot override Supabase Auth.'});
  const supabaseEnabled=await actual(c);
  return j({ok:true,available:true,websiteEnabled:website,supabaseEnabled,
   synchronized:website===supabaseEnabled,
   notice:website===supabaseEnabled?'Cloudflare and Supabase CAPTCHA states agree':'CAPTCHA states differ; re-enable before changing other security settings.'});
 }catch(e){return j({ok:false,error:e.message},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw error('Same-origin control required',403);
  const c=conf(env),actor=await owner(request,c);
  if(!c.pat)throw error('Supabase Management API credential is required before one-click CAPTCHA control can be used',503);
  const raw=await request.text();if(raw.length>250)throw error('Invalid request',400);
  const v=JSON.parse(raw);if(typeof v?.enabled!=='boolean'||v.confirm!=='CHANGE_PRODUCTION_CAPTCHA'||Object.keys(v).length!==2)
   throw error('Explicit CAPTCHA action is required',400);
  const previous=await actual(c),current=await site(c);
  if(previous!==current)throw error('Supabase and Cloudflare CAPTCHA state mismatch: control locked until reconciled',409);
  if(previous===v.enabled)return j({ok:true,enabled:previous,changed:false});
  await updateProvider(c,v.enabled);
  try{await setSite(c,v.enabled)}catch(e){
   try{await updateProvider(c,previous)}catch{}
   throw error('Website flag failed; Supabase CAPTCHA rollback attempted; verify both states',503);
  }
  await read(c.base+'/rest/v1/admin_audit_log',{method:'POST',headers:{...sv(c.secret),'content-type':'application/json',prefer:'return=representation'},
   body:JSON.stringify({actor_user_id:actor,action:'OWNER_SITE_CAPTCHA_TOGGLE',target_type:'auth',target_id:'supabase_and_cloudflare',details:{from:previous,to:v.enabled}})});
  return j({ok:true,enabled:v.enabled,changed:true,synchronized:true});
 }catch(e){return j({ok:false,error:e.message||'CAPTCHA change failed'},e.status||503)}
}
