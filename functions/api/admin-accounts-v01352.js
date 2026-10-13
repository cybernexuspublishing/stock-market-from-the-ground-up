/* v0.13.5.2 — unified Owner Account Management, existing Supabase schema only.
 * Strict Owner authorization, synthetic Showcase, no plaintext password retrieval,
 * no implicit entitlement grants, irreversible deletion guards, auditable changes.
 */
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEAD});
const problem=(s,status=400)=>Object.assign(new Error(s),{status});
const clean=x=>String(x??'').trim();
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOGIN=/^[A-Za-z][A-Za-z0-9_]{2,23}$/;
const synthetic=[{id:'00000000-0000-4000-8000-000000000001',email:'reader-one@example.test',username:'SampleReader',firstName:'Sample',lastName:'Reader',type:'member',roles:[],createdAt:'2026-01-12T12:00:00Z'},{id:'00000000-0000-4000-8000-000000000002',email:'moderator@example.test',username:'DemoMod',firstName:'Demo',lastName:'Moderator',type:'moderator',roles:['MODERATOR'],createdAt:'2026-02-12T12:00:00Z'},{id:'00000000-0000-4000-8000-000000000003',email:'showcase@example.test',username:'DemoShowcase',firstName:'Demo',lastName:'Showcase',type:'showcase',roles:['SHOWCASE_VIEWER'],createdAt:'2026-02-12T12:00:00Z'}];
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!/^https:\/\//.test(base)||!pub||!secret)throw problem('Account administration is not configured.',503);return{base,pub,secret}}
async function json(url,opt={}){const r=await fetch(url,{...opt,cache:'no-store'});const t=await r.text();let data=null;try{data=t?JSON.parse(t):null}catch{}if(!r.ok)throw problem(clean(data?.message||data?.error_description||data?.error||'Account service unavailable.'),r.status>=500?503:r.status);return data}
function apiHeaders(secret,body){return{apikey:secret,authorization:`Bearer ${secret}`,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'})}}
async function rest(env,path,opt={}){const c=cfg(env);return json(c.base+'/rest/v1/'+path,{method:opt.method||'GET',headers:{...apiHeaders(c.secret,opt.body),...(opt.prefer?{prefer:opt.prefer}:{})},body:opt.body===undefined?undefined:JSON.stringify(opt.body)})}
async function authAdmin(env,path,method='GET',body){const c=cfg(env);return json(c.base+'/auth/v1/admin/'+path,{method,headers:apiHeaders(c.secret,body),body:body===undefined?undefined:JSON.stringify(body)})}
function assurance(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).aal||'aal1'}catch{return 'aal1'}}
async function authorize(env,request){const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)throw problem('Sign in to the Control Center.',401);const c=cfg(env),user=await json(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:`Bearer ${token}`}});if(!user?.id)throw problem('Invalid session.',401);
 const [profile,roles]=await Promise.all([rest(env,'profiles?select=id,account_kind&id=eq.'+encodeURIComponent(user.id)+'&limit=1'),rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(user.id))]);
 const live=(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code),showcase=profile?.[0]?.account_kind==='showcase'||live.includes('SHOWCASE_VIEWER'),aal=assurance(token);
 if(showcase)return{user,showcase:true,owner:false,aal};
 if(!live.includes('OWNER')||profile?.[0]?.account_kind==='test')throw problem('OWNER authority required.',403);
 if(env.REQUIRE_STAFF_AAL2_V135==='true'&&aal!=='aal2')throw problem('Verified staff MFA is required while global staff MFA is enabled.',403);
 return{user,showcase:false,owner:true,aal};}
function strongAssurance(actor){if(actor.aal!=='aal2')throw problem('This Owner-level security action requires a verified MFA session (AAL2). Mandatory MFA stays disabled for ordinary access.',403)}
function ensureName(v,label){const x=clean(v);if(x.length<1||x.length>80||/[<>\x00-\x1f]/.test(x))throw problem(label+' must be 1–80 characters with no markup or control characters.');return x}
function ensureUsername(v){const x=clean(v);if(!LOGIN.test(x))throw problem('Username must start with a letter and contain 3–24 letters, digits or underscores.');return x.charAt(0).toUpperCase()+x.slice(1)}
function ensureEmail(v){const x=clean(v).toLowerCase();if(x.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(x))throw problem('Enter a valid email address.');return x}
function ensureAdult(iso){const x=clean(iso),m=x.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)throw problem('Date of birth is required for real accounts.');const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),v=new Date(Date.UTC(y,mo-1,d));if(v.getUTCFullYear()!==y||v.getUTCMonth()!==mo-1||v.getUTCDate()!==d)throw problem('Invalid date of birth.');const now=new Date();let years=now.getUTCFullYear()-y;if(now.getUTCMonth()+1<mo||(now.getUTCMonth()+1===mo&&now.getUTCDate()<d))years--;if(years<18||years>120)throw problem('Real account holders must be at least 18.');return x}
function issuePassword(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';const bytes=crypto.getRandomValues(new Uint8Array(30));let pass='';for(let i=0;i<30;i++)pass+=alphabet[bytes[i]%alphabet.length];return pass}
function checkNewPassword(p){if(p===undefined||p===null||p==='')return issuePassword();if(typeof p!=='string'||p.length<16||p.length>120||!/[a-z]/.test(p)||!/[A-Z]/.test(p)||!/[0-9]/.test(p)||!/[!@#$%^&*()_+\-=]/.test(p))throw problem('A manually supplied password must be 16–120 characters and include uppercase, lowercase, number, and a symbol.');return p}
function bytesToBase64(bytes){let value='';for(const n of bytes)value+=String.fromCharCode(n);return btoa(value)}
function base64ToBytes(value){const raw=atob(value),array=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)array[i]=raw.charCodeAt(i);return array}
async function dummyVaultKey(env){const master=clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY);if(!master)throw problem('Encrypted dummy-password viewing requires TEST_ACCOUNT_ENCRYPTION_KEY. Use Reset Password to issue a fresh credential.',503);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|GROUND_UP_TEST_ACCOUNT_CREDENTIALS|v1'));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function persistDummyPassword(env,id,password,actor){
 // Without a configured vault key, never leave a stale credential that no longer matches Auth.
 if(!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY)){
   await rest(env,'test_account_credentials?user_id=eq.'+id,{method:'DELETE',prefer:'return=minimal'});return false;
 }
 const key=await dummyVaultKey(env),iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(password));
 await rest(env,'test_account_credentials?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,ciphertext:bytesToBase64(new Uint8Array(ct)),iv:bytesToBase64(iv),key_version:'v1',updated_by:actor,updated_at:new Date().toISOString()}});return true;
}
async function readDummyPassword(env,id){const row=(await rest(env,'test_account_credentials?select=ciphertext,iv&user_id=eq.'+id+'&limit=1'))?.[0];if(!row)throw problem('No stored dummy password is available. Reset Password to issue a new one.',404);
 try{const key=await dummyVaultKey(env),pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(row.iv)},key,base64ToBytes(row.ciphertext));return new TextDecoder().decode(pt)}catch{throw problem('Unable to decrypt this dummy credential. Reset Password instead.',503)}}
async function audit(env,actor,action,target,details){await rest(env,'admin_audit_log',{method:'POST',prefer:'return=minimal',body:{actor_user_id:actor,action,target_type:'user',target_id:target||null,details:details||{}}})}
function selectIds(rows){return rows.map(x=>x.id).filter(x=>UID.test(x)).join(',')}
async function list(env,req,actor){if(actor.showcase)return respond({ok:true,owner:false,synthetic:true,accounts:synthetic,total:synthetic.length,hasMore:false});
 const url=new URL(req.url),page=Math.max(1,Math.min(500,Math.trunc(Number(url.searchParams.get('page'))||1))),q=clean(url.searchParams.get('q')).toLowerCase().slice(0,100);const perPage=50;
 // Search across account pages, not just the currently displayed 50 accounts.
 // The 500-account search cap is reported explicitly rather than silently saying no match.
 let users=[],limitReached=false,authTotal=null;
 if(q){for(let p=1;p<=5;p++){const result=await authAdmin(env,'users?page='+p+'&per_page=100');if(p===1)authTotal=result.total||result.total_count||null;
   const batch=(result.users||[]).filter(x=>UID.test(x.id));users.push(...batch);if(batch.length<100)break;if(p===5)limitReached=true;
 }}else{const r=await authAdmin(env,'users?page='+page+'&per_page='+perPage);users=(r.users||[]).filter(x=>UID.test(x.id));authTotal=r.total||r.total_count||null;}
 let profiles=[],roles=[],tests=[];for(let start=0;start<users.length;start+=50){const ids=selectIds(users.slice(start,start+50));if(!ids)continue;
   const [pr,rr,tr]=await Promise.all([rest(env,'profiles?select=id,username,first_name,last_name,account_kind&id=in.('+ids+')'),rest(env,'admin_user_roles?select=user_id,role_code,expires_at&user_id=in.('+ids+')'),rest(env,'test_account_profiles?select=user_id,preset_code&user_id=in.('+ids+')')]);
   profiles.push(...pr);roles.push(...rr);tests.push(...tr);
 }
 const pmap=new Map(profiles.map(x=>[x.id,x])),tmap=new Map(tests.map(x=>[x.user_id,x]));const all=users.map(u=>{const p=pmap.get(u.id)||{},r=roles.filter(x=>x.user_id===u.id&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())).map(x=>x.role_code);const kind=p.account_kind||'member';return{id:u.id,email:u.email||'',username:p.username||u.user_metadata?.username||'Unknown',firstName:p.first_name||'',lastName:p.last_name||'',type:kind==='showcase'?'showcase':kind==='test'||tmap.has(u.id)?'test':r.includes('OWNER')?'owner':r.includes('ADMIN')?'admin':r.includes('MODERATOR')?'moderator':'member',roles:r,createdAt:u.created_at||null}}).filter(u=>!q||[u.username,u.email,u.firstName,u.lastName].some(v=>v.toLowerCase().includes(q)));
 const accounts=q?all.slice((page-1)*perPage,page*perPage):all;
 return respond({ok:true,owner:true,synthetic:false,aal:actor.aal,vaultReady:!!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY),accounts,page,total:q?all.length:authTotal,hasMore:q?(all.length>page*perPage):(users.length===perPage),searchLimited:limitReached});}
async function lookup(env,id){if(!UID.test(id))throw problem('Invalid account identifier.');const [pr,roles,t]=await Promise.all([rest(env,'profiles?select=id,username,first_name,last_name,account_kind&id=eq.'+id+'&limit=1'),rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id),rest(env,'test_account_profiles?select=user_id,preset_code&user_id=eq.'+id)]);
 const p=pr?.[0];if(!p)throw problem('Account profile not found.',404);return{profile:p,roles:(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code),test:t.length>0||p.account_kind==='test'};}
async function uniqueUsername(env,name){const rows=await rest(env,'profiles?select=id&username=ilike.'+encodeURIComponent(name)+'&limit=1');if(rows?.length)throw problem('Username already in use.',409)}
async function detail(env,actor,id){if(actor.showcase)return respond({ok:true,synthetic:true,account:synthetic.find(x=>x.id===id)||synthetic[0],dateOfBirth:null});
 const x=await lookup(env,id),auth=await authAdmin(env,'users/'+id),u=auth?.user||auth,identity=(await rest(env,'account_private_identity?select=date_of_birth&user_id=eq.'+id+'&limit=1'))?.[0];
 return respond({ok:true,account:{id,email:u.email||'',username:x.profile.username,firstName:x.profile.first_name||'',lastName:x.profile.last_name||'',type:x.profile.account_kind==='showcase'?'showcase':x.profile.account_kind==='test'?'test':x.roles.includes('OWNER')?'owner':x.roles.includes('ADMIN')?'admin':x.roles.includes('MODERATOR')?'moderator':'member',roles:x.roles},dateOfBirth:identity?.date_of_birth||null});}
async function change(env,request,actor,action,b){if(actor.showcase)throw problem('Showcase is read-only.',403);const ownerId=actor.user.id;
 if(action==='create'){
   const type=clean(b.type).toLowerCase();if(!['member','test','showcase','moderator','admin','owner'].includes(type))throw problem('Invalid account type.');
   if(type==='owner'){strongAssurance(actor);if(clean(b.confirmation)!=='CREATE OWNER')throw problem('Type CREATE OWNER exactly to authorize a second production Owner.',400);}
   const first=ensureName(b.firstName,'First name'),last=ensureName(b.lastName,'Last name'),username=ensureUsername(b.username),email=ensureEmail(b.email);
   const isSandbox=['test','showcase'].includes(type),dob=b.dateOfBirth?ensureAdult(b.dateOfBirth):null;
   if(!isSandbox&&!dob)throw problem('Date of birth is required for real accounts.');
   if(!isSandbox&&/(?:\.test|\.invalid|\.localhost)$/i.test(email.split('@')[1]))throw problem('Real accounts require a deliverable email address.');
   if(isSandbox&&clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY))await dummyVaultKey(env);
   await uniqueUsername(env,username);
   const role={owner:'OWNER',admin:'ADMIN',moderator:'MODERATOR',showcase:'SHOWCASE_VIEWER'}[type]||null;
   const requestedPlan=clean(b.planCode||'FREE').toUpperCase();let validPlan='FREE';
   if(requestedPlan!=='FREE'&&!isSandbox){const ps=await rest(env,'platform_plans?select=plan_code&plan_code=eq.'+encodeURIComponent(requestedPlan)+'&active=eq.true&limit=1');if(!ps.length)throw problem('Invalid initial membership plan.');validPlan=requestedPlan;}
   await audit(env,ownerId,'v1352.account.create.request',null,{type,username,email,role});
   let user,credential=null;
   if(isSandbox){
     credential=checkNewPassword(b.newPassword);const au=await authAdmin(env,'users','POST',{email,password:credential,email_confirm:true,user_metadata:{username,display_name:username,first_name:first,last_name:last,test_account:true,showcase_account:type==='showcase'}});user=au?.user||au;
   }else{
     const c=cfg(env),to=clean(env.PUBLIC_SITE_URL||'').replace(/\/$/,'');const au=await json(c.base+'/auth/v1/invite',{method:'POST',headers:apiHeaders(c.secret,{}),body:JSON.stringify({email,data:{username,display_name:username,first_name:first,last_name:last},...(to?{redirect_to:to+'/signin.html'}:{})})});user=au?.user||au;
   }
   if(!UID.test(user?.id))throw problem('Account creation did not return a valid user ID.',503);
   const id=user.id,now=new Date().toISOString();
   await rest(env,'profiles?on_conflict=id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{id,username,display_name:username,first_name:first,last_name:last,account_kind:type==='showcase'?'showcase':type==='test'?'test':'member',updated_at:now}});
   if(dob)await rest(env,'account_private_identity?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,first_name:first,last_name:last,date_of_birth:dob,age_eligible:true,age_eligibility_checked_at:now,updated_at:now}});
   if(isSandbox){await rest(env,'test_account_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,preset_code:type==='showcase'?'SHOWCASE':'NEW_FREE',label:type==='showcase'?'Synthetic read-only Showcase':'Owner-created dummy account',created_by:ownerId,metadata:{source:'v0.13.5.2',synthetic_entitlements_only:type==='showcase',scenario:clean(b.testScenario||'free').slice(0,40),display_plan:requestedPlan}}});await persistDummyPassword(env,id,credential,ownerId);}
   if(role)await rest(env,'admin_user_roles',{method:'POST',prefer:'return=minimal',body:{user_id:id,role_code:role,granted_by:ownerId}});
   let membershipWarning='';if(!isSandbox&&validPlan!=='FREE'){try{await rest(env,'user_plan_grants',{method:'POST',prefer:'return=minimal',body:{user_id:id,plan_code:validPlan,status:'active',starts_at:now,ends_at:null,source:'admin',source_reference:'OWNER_v0.13.5.2',metadata:{initial_access:true}}});}catch(err){membershipWarning='Account created, but initial membership assignment failed: '+err.message;}}
   // Explicitly NO plan, library, tool, scored-evidence or commerce grants for Showcase.
   // Ordinary membership assignments remain in existing audited Access administration.
   await audit(env,ownerId,'v1352.account.created',id,{type,username,role,invited:!isSandbox});
   return respond({ok:true,account:{id,email,username,type},...(credential?{temporaryPassword:credential,storedForLater:!!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY)}:{invitationRequested:true}),...(membershipWarning?{warning:membershipWarning}:{})},201);
 }
 if(action==='edit'){
   const id=clean(b.userId),x=await lookup(env,id),first=ensureName(b.firstName,'First name'),last=ensureName(b.lastName,'Last name'),newName=ensureUsername(b.username);
   const hasOwner=x.roles.includes('OWNER');if(hasOwner)strongAssurance(actor);
   const email=ensureEmail(b.email),au=await authAdmin(env,'users/'+id),u=au?.user||au;
   if(!UID.test(u?.id))throw problem('Target identity unavailable.',404);
   if(x.profile.account_kind==='showcase'&&x.roles.includes('OWNER'))throw problem('Showcase and Owner roles must remain isolated.',409);
   if(email!==String(u.email||'').toLowerCase()&&x.profile.account_kind==='member'&&/(?:\.test|\.invalid|\.localhost)$/i.test(email.split('@')[1]))throw problem('Real accounts need a deliverable email address.');
   if(newName.toLowerCase()!==String(x.profile.username||'').toLowerCase())await uniqueUsername(env,newName);
   const dob=b.dateOfBirth?ensureAdult(b.dateOfBirth):null;
   const changingEmail=email!==String(u.email||'').toLowerCase();
   if(changingEmail){strongAssurance(actor);if(!b.emailConfirmed)throw problem('Email changes require an explicit Owner confirmation checkbox.',400);}
   await audit(env,ownerId,'v1352.account.edit.request',id,{fromUsername:x.profile.username,toUsername:newName,changeEmail:changingEmail,ownerAccount:hasOwner});
   const nextMeta={...(u.user_metadata||{}),username:newName,display_name:newName,first_name:first,last_name:last};
   const patch={user_metadata:nextMeta};if(changingEmail){patch.email=email;patch.email_confirm=true;}
   await authAdmin(env,'users/'+id,'PUT',patch);
   const now=new Date().toISOString();
   await rest(env,'profiles?id=eq.'+id,{method:'PATCH',prefer:'return=minimal',body:{username:newName,display_name:newName,first_name:first,last_name:last,updated_at:now}});
   if(dob)await rest(env,'account_private_identity?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,first_name:first,last_name:last,date_of_birth:dob,age_eligible:true,age_eligibility_checked_at:now,updated_at:now}});
   else await rest(env,'account_private_identity?user_id=eq.'+id,{method:'PATCH',prefer:'return=minimal',body:{first_name:first,last_name:last,updated_at:now}});
   await audit(env,ownerId,'v1352.account.edited',id,{username:newName,emailChanged:changingEmail});return respond({ok:true,username:newName});
 }
 if(action==='password'){
   const id=clean(b.userId),x=await lookup(env,id);
   if(id===ownerId||x.roles.includes('OWNER'))throw problem('Owner passwords are managed by the account holder through a verified session, not another account administrator.',403);
   if(clean(b.confirmation)!=='RESET '+x.profile.username)throw problem('Type RESET '+x.profile.username+' exactly.',400);
   const password=checkNewPassword(b.newPassword),isSandbox=x.profile.account_kind==='test'||x.profile.account_kind==='showcase';
   if(isSandbox&&clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY))await dummyVaultKey(env);
   await audit(env,ownerId,'v1352.password.reset.request',id,{username:x.profile.username,sandbox:isSandbox});
   await authAdmin(env,'users/'+id,'PUT',{password});
   if(isSandbox)await persistDummyPassword(env,id,password,ownerId);
   await audit(env,ownerId,'v1352.password.reset.completed',id,{username:x.profile.username});
   return respond({ok:true,temporaryPassword:password,storedForLater:isSandbox&&!!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY)});
 }
 if(action==='reveal'){
   const id=clean(b.userId),x=await lookup(env,id);
   if(!['test','showcase'].includes(x.profile.account_kind))throw problem('Existing passwords cannot be viewed for real members, Moderators, Administrators or Owners.',403);
   if(clean(b.confirmation)!=='VIEW '+x.profile.username)throw problem('Type VIEW '+x.profile.username+' exactly.',400);
   await audit(env,ownerId,'v1352.sandbox_credential.view',id,{username:x.profile.username});
   const password=await readDummyPassword(env,id);return respond({ok:true,temporaryPassword:password,storedForLater:true});
 }
 if(action==='delete'){
   const id=clean(b.userId);if(id===ownerId)throw problem('The current Owner cannot self-delete in Admin.',403);
   const x=await lookup(env,id),isOwner=x.roles.includes('OWNER');if(isOwner)strongAssurance(actor);
   const wanted=isOwner?'DELETE OWNER '+x.profile.username:'DELETE '+x.profile.username;
   if(clean(b.confirmation)!==wanted)throw problem('Type '+wanted+' exactly.',400);
   const reason=clean(b.reason);if(reason.length<10||reason.length>1000)throw problem('Deletion reason must be 10–1000 characters.');
   if(isOwner){const owners=await rest(env,'admin_user_roles?select=user_id,expires_at&role_code=eq.OWNER');if(owners.filter(r=>!r.expires_at||Date.parse(r.expires_at)>Date.now()).length<=1)throw problem('The last production Owner cannot be deleted.',409);}
   for(const [table,col] of [['site_orders','id'],['site_subscriptions','id'],['checkout_intents','intent_id'],['order_entitlement_ledger_v135','id']]){const rows=await rest(env,table+'?select='+col+'&user_id=eq.'+id+'&limit=1');if(rows?.length)throw problem('Financial/subscription records exist; use the privacy/retention review workflow.',409);}
   await rest(env,'account_deletion_events',{method:'POST',prefer:'return=minimal',body:{subject_user_id:id,actor_user_id:ownerId,account_kind:x.profile.account_kind||'member',reason,confirmation_phrase:'DELETE ACCOUNT',retained_record_summary:{source:'v0.13.5.2',subject_username:x.profile.username,financial_records_checked:true,owner_account:isOwner}}});
   await audit(env,ownerId,'v1352.account.delete.request',id,{username:x.profile.username,reason,owner_account:isOwner});await authAdmin(env,'users/'+id,'DELETE');
   await audit(env,ownerId,'v1352.account.deleted',id,{username:x.profile.username});return respond({ok:true,deleted:true});
 }
 throw problem('Unknown account operation.',404);
}
export async function onRequest({request,env}){try{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...HEAD,allow:'GET,POST,OPTIONS'}});
 const actor=await authorize(env,request),url=new URL(request.url),action=clean(url.searchParams.get('action'));
 if(request.method==='GET'&&action==='list')return await list(env,request,actor);
 if(request.method==='GET'&&action==='plans'){if(actor.showcase)return respond({ok:true,synthetic:true,plans:[{plan_code:'FREE',name:'Free'}]});const plans=await rest(env,'platform_plans?select=plan_code,name,active&active=eq.true&order=sort_order.asc');return respond({ok:true,plans:plans||[]});}
 if(request.method==='GET'&&action==='detail')return await detail(env,actor,clean(url.searchParams.get('id')));
 if(request.method!=='POST')return respond({ok:false,error:'Unknown operation.'},405);
 const raw=await request.text();if(raw.length>7500)throw problem('Account request too large.',413);let body={};try{body=JSON.parse(raw)}catch{throw problem('Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw problem('Invalid account request body.');
 return await change(env,request,actor,action,body);
}catch(e){return respond({ok:false,error:e.message||'Account operation unavailable.'},e.status||500)}}
