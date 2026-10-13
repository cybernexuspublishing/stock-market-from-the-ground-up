/* v0.13.5.5 — Owner-only Accounts & Access workspace data and manual entitlements.
 * Do NOT modify provider-managed subscriptions, passwords, Showcase production
 * permissions, or existing purchase-linked entitlements. */
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:HEAD});
const clean=v=>String(v??'').trim();
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,'');const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),key=clean(env.SUPABASE_SECRET_KEY);if(!/^https:\/\//.test(base)||!pub||!key)throw error('Supabase administrative configuration missing.',503);return{base,pub,key}}
async function getJson(url,opts={}){let r;try{r=await fetch(url,{...opts,cache:'no-store'})}catch{throw error('The database service could not be reached.',503)}let d=null;try{d=await r.json()}catch{}if(!r.ok)throw error('An authorized administration request was unsuccessful.',r.status===401?401:r.status===403?403:503);return d}
async function db(env,path,method='GET',body){const{base,key}=cfg(env);return getJson(base+'/rest/v1/'+path,{method,headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body)})}
async function authAdmin(env,path){const{base,key}=cfg(env);return getJson(base+'/auth/v1/admin/'+path,{headers:{apikey:key,authorization:'Bearer '+key}})}
async function who(env,req){const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw error('Sign in to the Owner Control Center.',401);const{base,pub}=cfg(env);const u=await getJson(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token}});if(!u?.id)throw error('Invalid session.',401);const [profiles,roles]=await Promise.all([db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id))]);
const r=roles.filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code),showcase=profiles?.[0]?.account_kind==='showcase'||r.includes('SHOWCASE_VIEWER');if(showcase)return{user:u,showcase:true,owner:false};if(profiles?.[0]?.account_kind==='test'||!r.includes('OWNER'))throw error('Only an Owner may access private member administration.',403);return{user:u,showcase:false,owner:true}}
const synthetic={ok:true,synthetic:true,disclaimer:'Showcase presents fabricated non-production records only.',overview:{registered:3,test:1,showcase:1,manualGrants:0,subscriptionRows:0,openTickets:0,expiring:0},plans:[],memberships:[],subscriptions:[],accounts:[{id:'DEMO-01',username:'ExampleReader',email:'reader@example.test',type:'member'}],entitlements:[],tickets:[],audit:[],flags:[],settings:[]};
async function rows(env,table,select='*',params=''){return db(env,table+'?select='+encodeURIComponent(select)+'&'+params)}
async function count(env,table,filter=''){const{base,key}=cfg(env);const r=await fetch(base+'/rest/v1/'+table+'?select=id'+(filter?'&'+filter:''),{headers:{apikey:key,authorization:'Bearer '+key,prefer:'count=exact',range:'0-0'},cache:'no-store'});if(!r.ok)return null;const m=(r.headers.get('content-range')||'').match(/\/(\d+)$/);return m?Number(m[1]):null}
async function snapshot(env,tab){if(!new Set(['overview','memberships','tests','showcase','access','security','activity','support','expirations','settings']).has(tab))throw error('Unknown administration section.',404);
const response={ok:true,synthetic:false,tab};
if(tab==='overview'){
 const [registered,test,showcase,manualGrants,subscriptionRows,openTickets,expiring]=await Promise.all([
  count(env,'profiles'),count(env,'profiles','account_kind=eq.test'),count(env,'profiles','account_kind=eq.showcase'),count(env,'user_plan_grants','status=in.(active,trialing)'),count(env,'site_subscriptions','status=in.(active,trialing,past_due)'),count(env,'support_tickets','status=in.(new,open,pending)'),count(env,'user_plan_grants','status=in.(active,trialing)&ends_at=lte.'+encodeURIComponent(new Date(Date.now()+30*86400000).toISOString())+'&ends_at=gte.'+encodeURIComponent(new Date().toISOString()))]);
 return {...response,overview:{registered,test,showcase,manualGrants,subscriptionRows,openTickets,expiring},note:'Counts are point-in-time; manual grants and provider subscriptions are separate records.'}}
if(tab==='memberships'){
 const [plans,grants,subscriptions]=await Promise.all([rows(env,'platform_plans','plan_code,name,price_cents,billing_interval,active','order=sort_order.asc&limit=100'),rows(env,'user_plan_grants','id,user_id,plan_code,status,starts_at,ends_at,source,updated_at','order=updated_at.desc&limit=200'),rows(env,'site_subscriptions','id,user_id,plan_code,status,current_period_start,current_period_end,provider,cancel_at_period_end,updated_at','order=updated_at.desc&limit=200')]);return{...response,plans,grants,subscriptions,limit:200,notice:'Billing-provider subscriptions are read-only here. Use the payment provider for changes to amounts and billing periods.'}}
if(tab==='tests'||tab==='showcase'){
 const [profiles,identity]=await Promise.all([rows(env,'test_account_profiles','user_id,preset_code,label,created_at','order=created_at.desc&limit=150'),rows(env,'profiles','id,username,first_name,last_name,account_kind','order=username.asc&limit=400')]);const ids=new Map(identity.map(x=>[x.id,x]));return{...response,accounts:profiles.filter(x=>tab==='showcase'?x.preset_code==='SHOWCASE'||ids.get(x.user_id)?.account_kind==='showcase':x.preset_code!=='SHOWCASE'&&ids.get(x.user_id)?.account_kind!=='showcase').map(x=>({...x,profile:ids.get(x.user_id)||{}})),limit:150}}
if(tab==='access'){
 const [books,tools,library,passes]=await Promise.all([rows(env,'catalog_products','product_code,short_title,active','active=eq.true&order=sort_order.asc&limit=100'),rows(env,'platform_tools','tool_code,name,active','active=eq.true&order=sort_order.asc&limit=100'),rows(env,'user_library','id,user_id,product_code,access_type,source_channel,granted_at,expires_at','order=granted_at.desc&limit=200'),rows(env,'user_tool_passes','id,user_id,tool_code,status,starts_at,ends_at,provider,provider_subscription_id','order=created_at.desc&limit=200')]);return{...response,books,tools,library,passes,limit:200,notice:'Only Owner-issued manual access can be revoked here. Purchases and payment-provider entitlements are protected.'}}
if(tab==='security'){
 const [flags,admins]=await Promise.all([rows(env,'admin_user_flags','user_id,status,reason,updated_at','order=updated_at.desc&limit=200'),rows(env,'admin_user_roles','user_id,role_code,expires_at','limit=200')]);return{...response,flags,staff:admins,staffMfaRequired:env.REQUIRE_STAFF_AAL2_V135==='true',note:'Existing passwords cannot be recovered. Forced sign-out and session listing are not provided by this endpoint.'}}
if(tab==='activity')return{...response,audit:await rows(env,'admin_audit_log','id,actor_user_id,action,target_type,target_id,created_at','order=created_at.desc&limit=150'),limit:150};
if(tab==='support')return{...response,tickets:await rows(env,'support_tickets','id,ticket_number,requester_user_id,subject,status,priority,assigned_user_id,updated_at','order=updated_at.desc&limit=150'),limit:150};
if(tab==='expirations'){
 const from=encodeURIComponent(new Date(Date.now()-7*86400000).toISOString()),to=encodeURIComponent(new Date(Date.now()+31*86400000).toISOString());const [grants,subscriptions]=await Promise.all([rows(env,'user_plan_grants','id,user_id,plan_code,status,ends_at,source','ends_at=gte.'+from+'&ends_at=lte.'+to+'&order=ends_at.asc&limit=200'),rows(env,'site_subscriptions','id,user_id,plan_code,status,current_period_end,cancel_at_period_end','current_period_end=gte.'+from+'&current_period_end=lte.'+to+'&order=current_period_end.asc&limit=200')]);return{...response,grants,subscriptions,limit:200}}
if(tab==='settings'){
 const settings=await rows(env,'site_settings','setting_key,value,description,public_read','order=setting_key.asc&limit=300');return{...response,settings:settings.filter(x=>new Set(['site.registration_enabled','auth.email_confirmation_required','account.session_timeout_minutes','account.minimum_age','account.remember_me_minutes','account.password_min_length','feature.registration','feature.account_creation']).has(x.setting_key)),passwordPolicy:'10+ characters, upper and lowercase letters and at least one special character !@#$%^&*+_?.',notice:'This is a view of existing settings, not a replacement for Supabase Auth policy enforcement.'}}
}
async function change(env,actor,action,b){
 if(!actor.owner||actor.showcase)throw error('Only an Owner can manage manual access.',403);
 const uid=clean(b.userId);
 if(!UID.test(uid))throw error('Valid target user required.',400);
 if(!['grant_book','revoke_book','grant_tool','revoke_tool'].includes(action))throw error('Unsupported Owner action.',404);
 const code=clean(action.includes('book')?b.productCode:b.toolCode).toUpperCase();
 if(action.startsWith('grant_')&&!/^[A-Z0-9_-]{2,90}$/.test(code))throw error('Invalid entitlement code.',400);
 const id=b.id===undefined?null:Number(b.id);
 if(action.startsWith('revoke_')&&(!Number.isSafeInteger(id)||id<1))throw error('Invalid grant identifier.',400);
 let ends=null;
 if(action==='grant_tool'&&b.endsAt){const date=new Date(b.endsAt);if(!Number.isFinite(date.getTime())||date<=new Date())throw error('Expiration must be in the future.',400);ends=date.toISOString()}
 // SECURITY: one PostgreSQL transaction performs validation, locks rows, changes
 // entitlement and writes an audit entry. A failed audit rolls back the grant.
 const result=await db(env,'rpc/v1355_owner_access_mutation','POST',{
  p_actor:actor.user.id,p_target:uid,p_action:action,
  p_code:action.startsWith('grant_')?code:null,
  p_grant_id:action.startsWith('revoke_')?id:null,p_ends_at:ends
 });
 if(!result?.ok)throw error('Database did not confirm the entitlement change.',503);
 return out(result);
}
async function addNames(env,d){
 const ids=new Set();for(const key of ['grants','subscriptions','library','passes','tickets','flags','staff','audit'])for(const x of d[key]||[]){for(const attr of ['user_id','requester_user_id','actor_user_id','target_id']){const v=String(x[attr]||'');if(UID.test(v))ids.add(v)}}
 if(!ids.size)return d;const people={};const list=[...ids].slice(0,450);for(let i=0;i<list.length;i+=45){const batch=list.slice(i,i+45);const data=await rows(env,'profiles','id,username,first_name,last_name','id=in.('+batch.join(',')+')&limit=45');for(const x of data)people[x.id]={username:x.username||'',name:[x.first_name,x.last_name].filter(Boolean).join(' ')}}return{...d,people};
}
export async function onRequest({request,env}){try{const actor=await who(env,request);const u=new URL(request.url),tab=clean(u.searchParams.get('tab')||'overview');if(request.method==='GET')return actor.showcase?out({...synthetic,tab}):out(await addNames(env,await snapshot(env,tab)));if(request.method!=='POST')return out({ok:false,error:'Unsupported method.'},405);if(actor.showcase)return out({ok:false,error:'Showcase cannot modify production.'},403);const b=await request.json().catch(()=>null);if(!b||JSON.stringify(b).length>5000)throw error('Invalid request.',400);return await change(env,actor,clean(u.searchParams.get('action')),b)}catch(e){return out({ok:false,error:e.message||'Administration request unsuccessful.'},e.status||500)}}
