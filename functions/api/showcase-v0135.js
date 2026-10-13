/* Synthetic-only Showcase creation. OWNER-only; no production grants or scored evidence.
 * Feature is OFF by default until OWNER has completed verification and MFA enrollment.
 */
const out=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=x=>String(x??'').trim();
const UID=/^[a-f0-9-]{36}$/i;
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!base||!pub||!secret)throw Object.assign(new Error('Supabase unavailable.'),{status:503});return{base,pub,secret}}
async function requestJSON(url,opt={}){const res=await fetch(url,{...opt,cache:'no-store'}),t=await res.text();let data;try{data=t?JSON.parse(t):null}catch{data=null}if(!res.ok)throw Object.assign(new Error('Showcase administration failed.'),{status:res.status>=500?503:res.status});return data}
async function rest(env,path,{method='GET',body,prefer}={}){const c=cfg(env);return requestJSON(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'}),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function authAdmin(env,path,{method='GET',body}={}){const c=cfg(env);return requestJSON(c.base+'/auth/v1/admin/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)})}
async function owner(env,request){const c=cfg(env),token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)throw Object.assign(new Error('Sign in first.'),{status:401});const u=await requestJSON(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});if(!UID.test(u?.id||''))throw Object.assign(new Error('Invalid identity.'),{status:401});const roles=await rest(env,`admin_user_roles?select=role_code,expires_at&user_id=eq.${encodeURIComponent(u.id)}`);if(!roles.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now())))throw Object.assign(new Error('Owner authority required.'),{status:403});
// Auth endpoint verified the bearer; now require verified Supabase MFA AAL2 claim for this action.
let aal='';try{const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');aal=JSON.parse(atob(payload)).aal||''}catch{}
if(aal!=='aal2')throw Object.assign(new Error('Owner multi-factor verification (AAL2) is required before Showcase creation.'),{status:403});
return u}
const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
function password(){return [...crypto.getRandomValues(new Uint32Array(26))].map(n=>chars[n%chars.length]).join('')}
function b64(b){return btoa(String.fromCharCode(...new Uint8Array(b)))}
async function vault(env){const master=clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY);if(master.length<32)throw Object.assign(new Error('Configure a 32+ character test-account encryption secret.'),{status:503});const raw=new TextEncoder().encode(`${master}|GROUND_UP_TEST_ACCOUNT_CREDENTIALS|v1`),digest=await crypto.subtle.digest('SHA-256',raw);return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt'])}
async function create(env,actor,sourceId){const key=await vault(env),nonce=crypto.getRandomValues(new Uint8Array(6)),suffix=[...nonce].map(n=>n.toString(16).padStart(2,'0')).join(''),username='Showcase'+suffix.slice(0,12),email='stockmarketfromthegroundup+showcase-'+suffix+'@gmail.com',pw=password();
let id;
try{
 const response=await authAdmin(env,'users',{method:'POST',body:{email,password:pw,email_confirm:true,user_metadata:{username,display_name:username,test_account:true,showcase_account:true}}});id=(response?.user||response)?.id;if(!UID.test(id||''))throw Error('Auth account was not created.');
 await rest(env,`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:{username,display_name:username,first_name:'Showcase',last_name:'Viewer',account_kind:'showcase',updated_at:new Date().toISOString()}});
 const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(pw));
 await rest(env,'test_account_credentials?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,ciphertext:b64(cipher),iv:b64(iv),key_version:'v1',updated_by:actor,updated_at:new Date().toISOString()}});
 await rest(env,'admin_user_roles',{method:'POST',prefer:'return=minimal',body:{user_id:id,role_code:'SHOWCASE_VIEWER',granted_by:actor}});
 await rest(env,'test_account_profiles',{method:'POST',prefer:'return=minimal',body:{user_id:id,preset_code:'SHOWCASE',label:'Synthetic Showcase Viewer',created_by:actor,metadata:{synthetic_admin_data:true,synthetic_entitlements:true,production_entitlements:false}}});
 const [plans,books,tools,evidence]=await Promise.all([
 rest(env,`user_plan_grants?select=id&user_id=eq.${encodeURIComponent(id)}&limit=1`),
 rest(env,`user_library?select=id&user_id=eq.${encodeURIComponent(id)}&limit=1`),
 rest(env,`user_tool_passes?select=id&user_id=eq.${encodeURIComponent(id)}&limit=1`),
 rest(env,`competency_evidence?select=id&user_id=eq.${encodeURIComponent(id)}&limit=1`)]);
 if([plans,books,tools,evidence].some(rows=>rows.length))throw Error('Production entitlement isolation verification failed.');
 try{await rest(env,'admin_audit_log',{method:'POST',prefer:'return=minimal',body:{actor_user_id:actor,action:sourceId?'showcase_account.duplicate':'showcase_account.create',target_type:'user',target_id:id,details:{synthetic_only:true,duplicated_from:sourceId||null}}})}catch{}
 return{userId:id,email,username,password:pw,preset:'SHOWCASE',syntheticOnly:true};
}catch(error){
 // Failed provisioning must not leave a partial privileged QA account.
 if(id){try{await authAdmin(env,'users/'+id,{method:'DELETE'})}catch{}}
 throw error;
}}
export async function onRequest({request,env}){try{
 if(request.method!=='POST')return out({ok:false,error:'POST required.'},405);
 const actor=await owner(env,request);
 if(env.ENABLE_SHOWCASE_CREATION_V135!=='true')return out({ok:false,error:'Synthetic Showcase creation is disabled until Owner verification and security readiness.'},503);
 const body=await request.json().catch(()=>({})),action=String(body.action||'create');if(!['create','duplicate'].includes(action))return out({ok:false,error:'Unknown action.'},400);
 let sourceId=null;
 if(action==='duplicate'){
  sourceId=clean(body.userId);
  if(!UID.test(sourceId))return out({ok:false,error:'Invalid account identifier.'},400);
  const rows=await rest(env,`profiles?select=id,account_kind&id=eq.${encodeURIComponent(sourceId)}&limit=1`);
  if(rows?.[0]?.account_kind!=='showcase')return out({ok:false,error:'Only a Showcase account can be duplicated as Showcase.'},403);
 }
 return out({ok:true,account:await create(env,actor.id,sourceId)});
}catch(err){return out({ok:false,error:err.status===503?'Showcase provisioning is not configured or currently unavailable.':err.message||'Showcase request failed.'},err.status||500)}}
