/* v0.13.5.3 — unified Owner Account Management, existing Supabase schema only.
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
 if((!live.includes('OWNER')&&!live.includes('ADMIN'))||profile?.[0]?.account_kind==='test')
   throw problem('Active Owner or Administrator authority required.',403);
 if(env.REQUIRE_STAFF_AAL2_V135==='true'&&aal!=='aal2')
   throw problem('Verified staff MFA is required while global staff MFA is enabled.',403);
 return{user,showcase:false,owner:live.includes('OWNER'),admin:live.includes('ADMIN'),aal};}
function strongAssurance(actor){if(!actor.owner)throw problem('OWNER authority required for changes to staff accounts, roles and privileged operations.',403)}
function targetAccess(actor,id,x){
 if(actor.owner)return;
 if(actor.user.id===id)throw problem('Administrators cannot change their own account through delegated Member Management.',403);
 if(x.roles.some(role=>['OWNER','ADMIN','MODERATOR'].includes(role)) ||
    x.profile.account_kind!=='member')
   throw problem('Administrators may manage ordinary member accounts only. Staff, Owner, and synthetic identities require an Owner.',403);
}
function ensureName(v,label){const x=clean(v);if(x.length<1||x.length>80||/[<>\x00-\x1f]/.test(x))throw problem(label+' must be 1–80 characters with no markup or control characters.');return x}
function ensureUsername(v){const x=clean(v);if(!LOGIN.test(x))throw problem('Username must start with a letter and contain 3–24 letters, digits or underscores.');return x.charAt(0).toUpperCase()+x.slice(1)}
function ensureEmail(v){const x=clean(v).toLowerCase();if(x.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(x))throw problem('Enter a valid email address.');return x}
function profileSettings(body){
 const bio=clean(body.bio||'');if(bio.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(bio))throw problem('Biography must be 1,000 characters or fewer and cannot contain control characters.');
 const avatarUrl=clean(body.avatarUrl||'');if(avatarUrl&&(avatarUrl.length>1000||!/^https:\/\/[^\s<>]+$/i.test(avatarUrl)))throw problem('Avatar URL must be an HTTPS address (maximum 1,000 characters).');
 const timezone=clean(body.timezone||'UTC');if(timezone.length>64||!/^[A-Za-z_0-9+\/-]+$/.test(timezone))throw problem('Invalid time zone.');
 try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{throw problem('Time zone must be recognized by the platform.');}
 const locale=clean(body.locale||'en-US');if(locale.length>35||!/^[A-Za-z0-9-]+$/.test(locale))throw problem('Invalid language or locale.');
 try{Intl.getCanonicalLocales(locale);}catch{throw problem('Invalid language or locale.');}
 const timeout=Number(body.sessionTimeoutMinutes);if(![15,30,60,240,480,1440].includes(timeout))throw problem('Session timeout must be an available option.');
 return {bio:bio||null,avatar_url:avatarUrl||null,timezone,locale,session_timeout_minutes:timeout};
}
function ensureAdult(iso){const x=clean(iso),m=x.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)throw problem('Date of birth is required for real accounts.');const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),v=new Date(Date.UTC(y,mo-1,d));if(v.getUTCFullYear()!==y||v.getUTCMonth()!==mo-1||v.getUTCDate()!==d)throw problem('Invalid date of birth.');const now=new Date();let years=now.getUTCFullYear()-y;if(now.getUTCMonth()+1<mo||(now.getUTCMonth()+1===mo&&now.getUTCDate()<d))years--;if(years<18||years>120)throw problem('Real account holders must be at least 18.');return x}
function issuePassword(){const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%^&*+_?'];const random=n=>{const b=crypto.getRandomValues(new Uint32Array(1));return b[0]%n};const out=groups.map(g=>g[random(g.length)]);const pool=groups.join('');while(out.length<24)out.push(pool[random(pool.length)]);for(let i=out.length-1;i>0;i--){const j=random(i+1);[out[i],out[j]]=[out[j],out[i]]}return out.join('')}
function checkNewPassword(p){if(p===undefined||p===null||p==='')return issuePassword();if(typeof p!=='string'||p.length<10||p.length>120||!/[a-z]/.test(p)||!/[A-Z]/.test(p)||!/[!@#$%^&*+_?]/.test(p))throw problem('Password must have 10–120 characters, an uppercase letter, a lowercase letter and one of !@#$%^&*+_?.');return p}
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
 const eligible=actor.owner?all:all.filter(x=>x.type==='member'&&x.id!==actor.user.id);
 const accounts=q?eligible.slice((page-1)*perPage,page*perPage):eligible;
 return respond({ok:true,owner:actor.owner,admin:!actor.owner,synthetic:false,aal:actor.aal,vaultReady:!!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY),accounts,page,total:q?eligible.length:actor.owner?authTotal:null,hasMore:q?(eligible.length>page*perPage):(users.length===perPage),searchLimited:limitReached});}
async function lookup(env,id){if(!UID.test(id))throw problem('Invalid account identifier.');const [pr,roles,t]=await Promise.all([rest(env,'profiles?select=id,username,display_name,first_name,last_name,account_kind,avatar_url,bio,timezone,locale,session_timeout_minutes&id=eq.'+id+'&limit=1'),rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id),rest(env,'test_account_profiles?select=user_id,preset_code&user_id=eq.'+id)]);
 const p=pr?.[0];if(!p)throw problem('Account profile not found.',404);return{profile:p,roles:(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code),test:t.length>0||p.account_kind==='test'};}
async function availableRoles(env){const rows=await rest(env,'admin_roles?select=role_code,name,is_assignable&is_assignable=eq.true&order=priority.asc');return(rows||[]).filter(x=>x.role_code!=='SHOWCASE_VIEWER');}
const VALID_TYPES=new Set(['member','test','showcase','moderator','admin','owner']);
function normalizedType(x){const k=x.profile.account_kind;if(k==='test'||k==='showcase')return k;return x.roles.includes('OWNER')?'owner':x.roles.includes('MODERATOR')?'moderator':x.roles.filter(y=>y!=='SHOWCASE_VIEWER').length?'admin':'member'}
async function assertFinancialNoConversion(env,id){for(const tbl of ['site_orders','site_subscriptions','checkout_intents','order_entitlement_ledger_v135','user_library','user_plan_grants','user_tool_passes','competency_evidence']){const rows=await rest(env,tbl+'?select=*&user_id=eq.'+id+'&limit=1');if(rows?.length)throw problem('Account has production records. Do not convert it into a Dummy or Showcase. Create a separate synthetic identity instead.',409)}}
function dates(starts,ends){const s=starts?new Date(starts):new Date(), e=ends?new Date(ends):null;if(!Number.isFinite(s.getTime())||(e&&!Number.isFinite(e.getTime()))||(e&&e<=s))throw problem('Membership start/end date is invalid, or the end is not later than the start.');return{start:s.toISOString(),end:e?.toISOString()||null}}
async function membershipDetails(env,id,kind){if(kind==='showcase'||kind==='test'){
 const rows=await rest(env,'test_account_profiles?select=metadata&user_id=eq.'+id+'&limit=1');const m=rows?.[0]?.metadata||{};return{planCode:m.display_plan||'FREE',startsAt:m.plan_start||null,endsAt:m.plan_end||null,synthetic:true,providerManaged:false};}
 const [grants,subs]=await Promise.all([rest(env,'user_plan_grants?select=id,plan_code,status,starts_at,ends_at,source,created_at&user_id=eq.'+id+'&order=created_at.desc&limit=25'),rest(env,'site_subscriptions?select=id,plan_code,status,current_period_start,current_period_end,provider&user_id=eq.'+id+'&order=created_at.desc&limit=25')]);
 const paid=(subs||[]).find(x=>['active','trialing','past_due'].includes(x.status));const grant=(grants||[]).find(x=>['active','trialing'].includes(x.status)&&(!x.starts_at||Date.parse(x.starts_at)<=Date.now())&&(!x.ends_at||Date.parse(x.ends_at)>Date.now()));
 const selected=grant||paid,qaActive=grant?.plan_code==='FULL_MONTHLY'&&grant?.source==='stripe_zero_monthly_qa_v72';
 return{planCode:selected?.plan_code||'FREE',startsAt:selected?.starts_at||selected?.current_period_start||null,
 endsAt:selected?.ends_at||selected?.current_period_end||null,synthetic:false,providerManaged:!!paid,
 providerName:paid?.provider||null,grantCount:(grants||[]).length,
 grantSource:grant?.source||null,zeroQaActive:!!qaActive,
 zeroQaResettable:!!qaActive&&!paid&&id===clean(env.GU72_QA_ALLOWED_USER_ID)};}
async function updateMembership(env,actor,id,kind,b){const plan=clean(b.planCode||'FREE').toUpperCase();const valid=await rest(env,'platform_plans?select=plan_code&plan_code=eq.'+encodeURIComponent(plan)+'&active=eq.true&limit=1');if(!valid.length)throw problem('Unknown membership plan.',400);
 const range=dates(b.startsAt,b.endsAt);if(kind==='test'||kind==='showcase'){
 const current=(await rest(env,'test_account_profiles?select=metadata&user_id=eq.'+id+'&limit=1'))?.[0];if(!current)throw problem('No test account profile exists.',409);
 await rest(env,'test_account_profiles?user_id=eq.'+id,{method:'PATCH',prefer:'return=minimal',body:{metadata:{...(current.metadata||{}),display_plan:plan,plan_start:range.start,plan_end:range.end,synthetic_entitlements_only:true}}});
 await audit(env,actor,'v1353.membership.synthetic_update',id,{displayPlan:plan});return{synthetic:true};}
 // v0.14.0.77: do not silently report FREE while an active Stripe QA grant
 // continues to override the Owner's manual account-editor selection.
 // Provider-paid subscriptions and non-QA external entitlements remain protected.
 const subs=await rest(env,'site_subscriptions?select=id,status&user_id=eq.'+id+'&status=in.(active,trialing,past_due)&limit=1');
 if(subs?.length)throw problem('An active payment-provider subscription exists. Change it through billing management; do not override its dates manually.',409);
 const rows=await rest(env,'user_plan_grants?select=id,source,plan_code,starts_at,ends_at&user_id=eq.'+id+'&status=in.(active,trialing)');
 const now=Date.now(),active=(rows||[]).filter(x=>(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>now));
 const owned=active.filter(x=>/^admin(?:_|$)/i.test(x.source||''));
 const qa=active.filter(x=>x.source==='stripe_zero_monthly_qa_v72'&&x.plan_code==='FULL_MONTHLY');
 const external=active.filter(x=>!/^admin(?:_|$)/i.test(x.source||'')&&
   !(x.source==='stripe_zero_monthly_qa_v72'&&x.plan_code==='FULL_MONTHLY'));
 if(plan!=='FREE'&&(qa.length||external.length))
   throw problem('This account has active non-manual access. Do not stack a manual plan over a Stripe/test/provider grant. Resolve the existing entitlement from this account\'s source-aware inventory first.',409);
 if(plan==='FREE'&&external.length)
   throw problem('This account has another active non-admin entitlement. FREE cannot be applied here without resolving that entitlement through its issuing system.',409);
 // Before mutating anything, check OTHER sources that may keep account access
 // above FREE: independent tool passes and historical full_learning_access.
 // A post-mutation resolver mismatch without this preflight could cancel one
 // grant while leaving another, then fail without a complete audit.
 if(plan==='FREE'){
   const [toolRows,legacyRows]=await Promise.all([
     rest(env,'user_tool_passes?select=id,status,starts_at,ends_at,current_period_end&user_id=eq.'+id+'&status=in.(active,trialing)&limit=100'),
     rest(env,'entitlements?select=id,status,starts_at,ends_at,source&user_id=eq.'+id+'&product_key=eq.full_learning_access&status=in.(active,trialing)&limit=50')
   ]);
   const toolActive=(toolRows||[]).some(x=>(!x.starts_at||Date.parse(x.starts_at)<=now)&&
      (!x.current_period_end&&!x.ends_at||Date.parse(x.current_period_end||x.ends_at)>now));
   const learningActive=(legacyRows||[]).some(x=>(!x.starts_at||Date.parse(x.starts_at)<=now)&&
      (!x.ends_at||Date.parse(x.ends_at)>now));
   if(toolActive||learningActive)
     throw problem('FREE is blocked by independently active '+(toolActive?'tool passes':'legacy learning access')+
       '. Inspect this account’s source-aware inventory and revoke only the originally issued manual record or follow the provider workflow. No plan grants were changed.',409);
 }
 let resetQaCount=0;
 if(plan==='FREE'&&qa.length){
   // Restrict this special case to the SAME production account allowlisted for
   // LIVE $0 checkout. SQL RPC preserves all completed Stripe sessions as audit.
   if(!UID.test(clean(env.GU72_QA_ALLOWED_USER_ID))||id!==clean(env.GU72_QA_ALLOWED_USER_ID))
     throw problem('This Stripe QA account is not the allowlisted test member. Its $0 grant cannot be reset from Account Management.',403);
   let reset;
   try{reset=await rest(env,'rpc/gu76_reset_zero_monthly_qa',{method:'POST',body:{p_user_id:id}})}
   catch(err){throw problem('The $0 QA reset function is unavailable. Apply the reviewed v0.14.0.76 Supabase SQL in the existing project before changing this account to FREE. '+err.message,503)}
   if(reset?.ok!==true||!(reset.resetCount>=qa.length))
     throw problem('The $0 QA access reset could not be confirmed. No FREE membership success is reported.',409);
   resetQaCount=reset.resetCount;
 }
 for(const row of owned)await rest(env,'user_plan_grants?id=eq.'+row.id,{method:'PATCH',prefer:'return=minimal',
   body:{status:'canceled',updated_at:new Date().toISOString()}});
 if(plan!=='FREE')await rest(env,'user_plan_grants',{method:'POST',prefer:'return=minimal',
   body:{user_id:id,plan_code:plan,status:range.end&&Date.parse(range.end)<=Date.now()?'expired':'active',
      starts_at:range.start,ends_at:range.end,source:'admin',source_reference:'OWNER_v0.13.5.3',
      metadata:{admin_manual:true,adjusted_by:actor}}});
 // The same source-of-truth resolver used for customer Access decides whether
 // FREE really took effect. Do not show a false success if other access persists.
 const effective=await rest(env,'rpc/my_platform_access_for_user',{method:'POST',body:{target_user:id}});
 if(effective?.planCode!==plan)
   throw problem('The account access resolver reports '+clean(effective?.planCode||'unknown')+
    ' instead of '+plan+'. Do not report a successful membership change. Review additional active grants and subscriptions in this account.',409);
 await audit(env,actor,'v1353.membership.adjust',id,{plan,startsAt:range.start,endsAt:range.end,
   revokedManualGrants:owned.length,revokedZeroQaGrants:resetQaCount,actualPlan:effective?.planCode||null});
 return{synthetic:false,planCode:effective?.planCode||plan,zeroQaResetCount:resetQaCount};}
async function changePrimaryRole(env,actor,id,x,b,dryRun=false){const code=clean(b.roleCode||'NONE').toUpperCase(),rows=await availableRoles(env),permitted=new Set([...rows.map(r=>r.role_code),'OWNER']);if(code!=='NONE'&&!permitted.has(code))throw problem('Selected role is not available.',400);
 if(x.profile.account_kind==='test'||x.profile.account_kind==='showcase'){if(code!=='NONE'&&code!=='SHOWCASE_VIEWER')throw problem('Dummy and Showcase accounts cannot receive real production staff roles. Use a real invited staff account.',409);return;}
 const prior=x.roles.filter(r=>r!=='SHOWCASE_VIEWER');if((code==='OWNER'||prior.includes('OWNER'))&&!(prior.length===1&&prior[0]===code)){
  if(clean(b.ownerConfirmation)!=='CHANGE OWNER '+x.profile.username)throw problem('Type CHANGE OWNER '+x.profile.username+' to approve Owner role changes.',400);
  if(code!=='OWNER'&&prior.includes('OWNER')){const owners=await rest(env,'admin_user_roles?select=user_id,expires_at&role_code=eq.OWNER');const active=owners.filter(r=>!r.expires_at||Date.parse(r.expires_at)>Date.now());if(active.length<=1)throw problem('The last Owner cannot be demoted.',409);if(actor===id)throw problem('Owner cannot demote their own active account.',409)}
 }
 if(code==='NONE'&&!prior.length)return;
 if(dryRun)return;
 if(code!=='NONE'&&!prior.includes(code))await rest(env,'admin_user_roles?on_conflict=user_id,role_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,role_code:code,granted_by:actor}});
 // OWNER governs role transitions; preserve read-only external audit history.
 for(const r of prior.filter(x=>x!==code))await rest(env,'admin_user_roles?user_id=eq.'+id+'&role_code=eq.'+encodeURIComponent(r),{method:'DELETE',prefer:'return=minimal'});
 await audit(env,actor,'v1353.role.replace',id,{previous:prior,next:code});}
async function uniqueUsername(env,name){const rows=await rest(env,'profiles?select=id&username=ilike.'+encodeURIComponent(name)+'&limit=1');if(rows?.length)throw problem('Username already in use.',409)}
async function detail(env,actor,id){if(actor.showcase)return respond({ok:true,synthetic:true,account:synthetic.find(x=>x.id===id)||synthetic[0],dateOfBirth:null});
 const x=await lookup(env,id);targetAccess(actor,id,x);
 const auth=await authAdmin(env,'users/'+id),u=auth?.user||auth,identity=(await rest(env,'account_private_identity?select=date_of_birth&user_id=eq.'+id+'&limit=1'))?.[0];
 const [flagRows,noteRows]=await Promise.all([rest(env,'admin_user_flags?select=status,reason,updated_at&user_id=eq.'+id+'&limit=1'),rest(env,'admin_user_notes?select=note_type,note,created_at&user_id=eq.'+id+'&order=created_at.desc&limit=12')]);
 // Source-aware single-account inventory. A failed read must NOT be interpreted
 // as zero grants or as proof that the account is FREE.
 const inventoryPaths={
   grants:'user_plan_grants?select=id,plan_code,status,starts_at,ends_at,source,source_reference&user_id=eq.'+id+'&order=created_at.desc&limit=100',
   subscriptions:'site_subscriptions?select=id,plan_code,status,provider,provider_subscription_id,current_period_end,cancel_at_period_end&user_id=eq.'+id+'&order=created_at.desc&limit=100',
   books:'user_library?select=id,product_code,access_type,source_channel,source_reference,expires_at&user_id=eq.'+id+'&order=granted_at.desc&limit=100',
   tools:'user_tool_passes?select=id,tool_code,status,starts_at,ends_at,provider,provider_subscription_id,metadata&user_id=eq.'+id+'&order=created_at.desc&limit=100',
   bookKeys:'book_key_redemptions?select=id,book_code,starts_at,ends_at&user_id=eq.'+id+'&order=created_at.desc&limit=50',
   legacyLearning:'entitlements?select=id,product_key,status,source,starts_at,ends_at,external_customer_id,external_subscription_id&user_id=eq.'+id+'&limit=100',
   orders:'site_orders?select=id,provider,status,total_cents,paid_at,created_at&user_id=eq.'+id+'&order=created_at.desc&limit=50'
 };
 const inventory={},inventoryErrors={};
 const results=await Promise.allSettled(Object.entries(inventoryPaths).map(async([name,path])=>[name,await rest(env,path)]));
 for(let i=0;i<results.length;i++){
   const k=Object.keys(inventoryPaths)[i],r=results[i];
   if(r.status==='fulfilled')inventory[k]=r.value[1];
   else{inventory[k]=null;inventoryErrors[k]='Unable to load this source. Do not assume it is empty.'}
 }
 let effectiveAccess=null,effectiveError=null;
 let grantCatalog={books:null,tools:null},grantCatalogError=null;
 if(x.profile.account_kind==='member'){
   try{
     const [bk,tl]=await Promise.all([
       rest(env,'catalog_products?select=product_code,short_title&active=eq.true&product_type=eq.book&order=sort_order.asc&limit=120'),
       rest(env,'platform_tools?select=tool_code,name&active=eq.true&order=sort_order.asc&limit=120')]);
     grantCatalog={books:bk,tools:tl};
   }catch{grantCatalogError='Catalog service unavailable; new manual grants disabled.'}

   try{effectiveAccess=await rest(env,'rpc/my_platform_access_for_user',{method:'POST',body:{target_user:id}})}
   catch{effectiveError='Effective access resolver unavailable; account status unverified.'}
 }
 return respond({ok:true,permissions:{owner:actor.owner,administrator:!actor.owner},
  inventory,inventoryErrors,effectiveAccess,effectiveError,grantCatalog,grantCatalogError,account:{id,email:u.email||'',username:x.profile.username,displayName:x.profile.display_name||x.profile.username,firstName:x.profile.first_name||'',lastName:x.profile.last_name||'',type:normalizedType(x),roles:x.roles,profile:{avatarUrl:x.profile.avatar_url||'',bio:x.profile.bio||'',timezone:x.profile.timezone||'UTC',locale:x.profile.locale||'en-US',sessionTimeoutMinutes:x.profile.session_timeout_minutes||30},createdAt:u.created_at||null,lastSignInAt:u.last_sign_in_at||null,bannedUntil:u.banned_until||null,emailConfirmed:!!u.email_confirmed_at},dateOfBirth:identity?.date_of_birth||null,flag:flagRows?.[0]||{status:'active',reason:''},notes:noteRows||[],membership:await membershipDetails(env,id,x.profile.account_kind)});}
async function grantAccountResource(env,actor,b){
 const id=clean(b.userId),x=await lookup(env,id);
 targetAccess(actor,id,x);
 if(x.profile.account_kind!=='member')throw problem('Real member account required for production grants.',403);
 const kind=clean(b.kind),code=clean(b.code).toUpperCase(),reason=clean(b.reason);
 const expires=clean(b.expiresAt),date=expires?new Date(expires):null;
 if(!['manual_book','manual_tool','manual_learning'].includes(kind)||
    (kind==='manual_learning'?code!=='FULL_LEARNING_ACCESS':!/^[A-Z0-9_-]{2,90}$/.test(code))||
    reason.length<10||reason.length>500||
    (date&&(!Number.isFinite(date.getTime())||date<=new Date())))
    throw problem('Select an active product/tool, valid optional expiration, and a reason (10–500 characters).',400);
 const result=await rest(env,'rpc/gu78_admin_account_resource_grant',{method:'POST',body:{
  p_actor:actor.user.id,p_target:id,p_kind:kind,
  p_code:kind==='manual_learning'?'full_learning_access':code,
  p_expires_at:date?.toISOString()||null,p_reason:reason
 }});
 if(result?.ok!==true||result?.granted!==true||result?.targetUser!==id||
   String(result?.code).toUpperCase()!==code)
    throw problem('The database did not confirm this manual entitlement grant.',409);
 return respond({ok:true,granted:true,kind,code,recordId:result.recordId,
    notice:'Manual entitlement created; reload source-aware member inventory and verify effective access.'});
}
async function revokeAccountResource(env,actor,b){
 const id=clean(b.userId),x=await lookup(env,id);
 targetAccess(actor,id,x);
 const kind=clean(b.kind),record=Number(b.recordId),reason=clean(b.reason);
 if(!['manual_plan','manual_book','manual_tool','manual_learning'].includes(kind)||
    !Number.isSafeInteger(record)||record<1||
    reason.length<10||reason.length>500)
   throw problem('Select one active manual entitlement and supply a reason (10–500 characters).',400);
 // SQL performs source verification, role authorization, row locking, update and
 // audit in a single transaction; front-end state is never considered authority.
 const result=await rest(env,'rpc/gu78_admin_account_resource_revoke',{method:'POST',body:{
   p_actor:actor.user.id,p_target:id,p_kind:kind,p_record_id:record,p_reason:reason
 }});
 if(result?.ok!==true||result?.recordId!==record||result?.targetUser!==id||!result?.revoked)
   throw problem('The database has not verified this entitlement revocation.',409);
 // Do not report a successful full-account downgrade: other independently
 // issued grants or subscriptions can legitimately keep the effective plan on.
 let effectiveAccess=null,verified=false;
 try{
   effectiveAccess=await rest(env,'rpc/my_platform_access_for_user',{method:'POST',body:{target_user:id}});
   verified=!!effectiveAccess?.planCode;
 }catch{}
 return respond({ok:true,revoked:true,kind,recordId:record,source:result.source,
   effectivePlan:effectiveAccess?.planCode||null,effectiveVerified:verified,
   notice:verified?'The selected record was revoked; the current effective plan is '+effectiveAccess.planCode+'.':
     'The selected record was revoked by the database, but effective membership could not be independently verified. Refresh the account.'});
}
async function change(env,request,actor,action,b){if(actor.showcase)throw problem('Showcase is read-only.',403);const ownerId=actor.user.id;
 if(action==='create'){
   const type=clean(b.type).toLowerCase();
   if(!actor.owner&&type!=='member')
     throw problem('Administrators may create ordinary members only. Staff and synthetic accounts require an Owner.',403);
   if(!actor.owner&&clean(b.roleCode||'NONE')!=='NONE')
     throw problem('Administrators may not issue staff roles during account creation.',403);if(!['member','test','showcase','moderator','admin','owner'].includes(type))throw problem('Invalid account type.');
   if(type==='owner'){strongAssurance(actor);if(clean(b.confirmation)!=='CREATE OWNER')throw problem('Type CREATE OWNER exactly to authorize a second production Owner.',400);}
   const first=ensureName(b.firstName,'First name'),last=ensureName(b.lastName,'Last name'),username=ensureUsername(b.username),email=ensureEmail(b.email);
   const isSandbox=['test','showcase'].includes(type),ownerPassword=!isSandbox&&b.creationMethod==='owner_password',dob=b.dateOfBirth?ensureAdult(b.dateOfBirth):null;
   if(!isSandbox&&!dob)throw problem('Date of birth is required for real accounts.');
   if(!isSandbox&&/(?:\.test|\.invalid|\.localhost)$/i.test(email.split('@')[1]))throw problem('Real accounts require a deliverable email address.');
   if(isSandbox&&clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY))await dummyVaultKey(env);
   await uniqueUsername(env,username);
   const role={owner:'OWNER',admin:'ADMIN',moderator:'MODERATOR',showcase:'SHOWCASE_VIEWER'}[type]||null;
   const requestedPlan=clean(b.planCode||'FREE').toUpperCase();let validPlan='FREE';
   if(requestedPlan!=='FREE'&&!isSandbox){const ps=await rest(env,'platform_plans?select=plan_code&plan_code=eq.'+encodeURIComponent(requestedPlan)+'&active=eq.true&limit=1');if(!ps.length)throw problem('Invalid initial membership plan.');validPlan=requestedPlan;}
   if(!isSandbox&&b.creationMethod&&!['invite','owner_password'].includes(b.creationMethod))throw problem('Invalid account creation method.');
   await audit(env,ownerId,'v1353.account.create.request',null,{type,username,email,role,method:isSandbox?'dummy':ownerPassword?'owner_password':'invite'});
   let user,credential=null;
   if(isSandbox){
     if(b.newPassword&&b.confirmPassword!==b.newPassword)throw problem('The two passwords must match.');credential=checkNewPassword(b.newPassword);const au=await authAdmin(env,'users','POST',{email,password:credential,email_confirm:true,user_metadata:{username,display_name:username,first_name:first,last_name:last,test_account:true,showcase_account:type==='showcase'}});user=au?.user||au;
   }else if(ownerPassword){
     if(!b.newPassword||b.newPassword!==b.confirmPassword)throw problem('Initial password and confirmation are required and must match.');
     credential=checkNewPassword(b.newPassword);
     const au=await authAdmin(env,'users','POST',{email,password:credential,email_confirm:true,user_metadata:{username,display_name:username,first_name:first,last_name:last}});
     user=au?.user||au;
   }else{
     const c=cfg(env),to=clean(env.PUBLIC_SITE_URL||'').replace(/\/$/,'');const au=await json(c.base+'/auth/v1/invite',{method:'POST',headers:apiHeaders(c.secret,{}),body:JSON.stringify({email,data:{username,display_name:username,first_name:first,last_name:last},...(to?{redirect_to:to+'/signin.html'}:{})})});user=au?.user||au;
   }
   if(!UID.test(user?.id))throw problem('Account creation did not return a valid user ID.',503);
   const id=user.id,now=new Date().toISOString();
   await rest(env,'profiles?on_conflict=id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{id,username,display_name:username,first_name:first,last_name:last,account_kind:type==='showcase'?'showcase':type==='test'?'test':'member',updated_at:now}});
   if(dob)await rest(env,'account_private_identity?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,first_name:first,last_name:last,date_of_birth:dob,age_eligible:true,age_eligibility_checked_at:now,updated_at:now}});
   if(isSandbox){await rest(env,'test_account_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,preset_code:type==='showcase'?'SHOWCASE':'NEW_FREE',label:type==='showcase'?'Synthetic read-only Showcase':'Owner-created dummy account',created_by:ownerId,metadata:{source:'v0.13.5.3',synthetic_entitlements_only:type==='showcase',scenario:clean(b.testScenario||'free').slice(0,40),display_plan:requestedPlan}}});await persistDummyPassword(env,id,credential,ownerId);}
   if(role)await rest(env,'admin_user_roles',{method:'POST',prefer:'return=minimal',body:{user_id:id,role_code:role,granted_by:ownerId}});
   let membershipWarning='';if(!isSandbox&&validPlan!=='FREE'){try{await updateMembership(env,ownerId,id,'member',{planCode:validPlan,startsAt:b.startsAt||now,endsAt:b.endsAt||null});}catch(err){membershipWarning='Account created, but initial membership assignment failed: '+err.message;}}
   // Explicitly NO plan, library, tool, scored-evidence or commerce grants for Showcase.
   // Ordinary membership assignments remain in existing audited Access administration.
   await audit(env,ownerId,'v1353.account.created',id,{type,username,role,invited:!isSandbox&&!ownerPassword});
   return respond({ok:true,account:{id,email,username,type},...(credential?{temporaryPassword:credential,storedForLater:!!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY)}:{invitationRequested:!ownerPassword}),...(membershipWarning?{warning:membershipWarning}:{})},201);
 }
 if(action==='edit'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);
   const first=ensureName(b.firstName,'First name'),last=ensureName(b.lastName,'Last name'),newName=ensureUsername(b.username);
   const hasOwner=x.roles.includes('OWNER');if(hasOwner)strongAssurance(actor);
   const email=ensureEmail(b.email),au=await authAdmin(env,'users/'+id),u=au?.user||au;
   if(!UID.test(u?.id))throw problem('Target identity unavailable.',404);
   if(x.profile.account_kind==='showcase'&&x.roles.includes('OWNER'))throw problem('Showcase and Owner roles must remain isolated.',409);
   if(email!==String(u.email||'').toLowerCase()&&x.profile.account_kind==='member'&&/(?:\.test|\.invalid|\.localhost)$/i.test(email.split('@')[1]))throw problem('Real accounts need a deliverable email address.');
   if(newName.toLowerCase()!==String(x.profile.username||'').toLowerCase())await uniqueUsername(env,newName);
   const dob=b.dateOfBirth?ensureAdult(b.dateOfBirth):null;
   const requestedType=clean(b.type||normalizedType(x));if(!VALID_TYPES.has(requestedType))throw problem('Unsupported account type.',400);
   const currentType=normalizedType(x);
   if(!actor.owner&&clean(b.roleCode||'NONE')!=='NONE')
     throw problem('Administrators cannot assign or change staff privileges.',403);
   if(!actor.owner&&(requestedType!=='member'||currentType!=='member'))
     throw problem('Administrators cannot change staff roles or account types.',403);
   if(['test','showcase'].includes(requestedType)&&requestedType!==currentType)throw problem('Converting existing accounts to Dummy/Showcase requires a separate audited synthetic migration. Create a new test identity instead.',409);
   if(['test','showcase'].includes(currentType)&&requestedType!==currentType)throw problem('Cannot promote a synthetic/test account into a production member or staff identity. Create a new real account instead.',409);
   if(['showcase','test'].includes(requestedType)&&!['NONE',''].includes(clean(b.roleCode||'NONE')))throw problem('Synthetic accounts cannot receive real staff roles.',409);
   if(requestedType==='owner'&&x.profile.account_kind!=='member')throw problem('Owner roles require a real production member identity.',409);
   if(requestedType==='owner'&&clean(b.roleCode)!=='OWNER')throw problem('Owner account type requires the OWNER staff role.',400);
   if(requestedType==='moderator'&&clean(b.roleCode)!=='MODERATOR')throw problem('Moderator account type requires Moderator role.',400);
   if(requestedType==='admin'&&['NONE','OWNER','MODERATOR','SHOWCASE_VIEWER'].includes(clean(b.roleCode||'NONE')))throw problem('Select an administrative role from the role list.',400);
   if(requestedType==='member'&&clean(b.roleCode||'NONE')!=='NONE')throw problem('Choose Administrator account type when assigning a staff role.',400);
   const changingEmail=email!==String(u.email||'').toLowerCase();
   if(changingEmail){if(!b.emailConfirmed)throw problem('Email changes require an explicit Owner confirmation checkbox.',400);}
   // Validate sensitive role and last-Owner invariants before making any Auth/Profile writes.
   if(b.roleCode!==undefined)await changePrimaryRole(env,ownerId,id,x,b,true);
   await audit(env,ownerId,'v1353.account.edit.request',id,{fromUsername:x.profile.username,toUsername:newName,changeEmail:changingEmail,ownerAccount:hasOwner});
   const nextMeta={...(u.user_metadata||{}),username:newName,display_name:newName,first_name:first,last_name:last};
   const patch={user_metadata:nextMeta};if(changingEmail){patch.email=email;patch.email_confirm=true;}
   await authAdmin(env,'users/'+id,'PUT',patch);
   const now=new Date().toISOString();
   // Keep the denormalized public profile aligned with the Auth identity.
   await rest(env,'profiles?id=eq.'+id,{method:'PATCH',prefer:'return=minimal',body:{username:newName,display_name:newName,first_name:first,last_name:last,...(changingEmail?{email,email_verified:true}:{}),updated_at:now}});
   if(dob)await rest(env,'account_private_identity?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,first_name:first,last_name:last,date_of_birth:dob,age_eligible:true,age_eligibility_checked_at:now,updated_at:now}});
   else await rest(env,'account_private_identity?user_id=eq.'+id,{method:'PATCH',prefer:'return=minimal',body:{first_name:first,last_name:last,updated_at:now}});
   if(b.roleCode!==undefined){
     if(!actor.owner&&clean(b.roleCode||'NONE')!=='NONE')
       throw problem('Only the Owner can change staff roles or permissions.',403);
     if(actor.owner)await changePrimaryRole(env,ownerId,id,x,b);
   }
   await audit(env,ownerId,'v1353.account.edited',id,{username:newName,emailChanged:changingEmail,newType:requestedType,role:clean(b.roleCode)});return respond({ok:true,username:newName});
 }
 if(action==='profile'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);
   if(x.roles.includes('OWNER'))strongAssurance(actor);
   const values=profileSettings(b);
   await rest(env,'profiles?id=eq.'+id,{method:'PATCH',prefer:'return=minimal',body:{...values,updated_at:new Date().toISOString()}});
   await audit(env,ownerId,'v0142.account.profile.edited',id,{fields:Object.keys(values),ownerAccount:x.roles.includes('OWNER')});
   return respond({ok:true});
 }
 if(action==='flag'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);const status=clean(b.status),reason=clean(b.reason);
   if(!['active','watch','restricted','suspended'].includes(status))throw problem('Invalid account status flag.');
   if(reason.length>1000||(status!=='active'&&reason.length<10))throw problem('A non-active status requires a reason of 10–1,000 characters.');
   if(x.roles.includes('OWNER')&&id===ownerId&&status==='suspended')throw problem('You cannot suspend your own Owner account.',409);
   await rest(env,'admin_user_flags?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:id,status,reason:reason||null,updated_by:ownerId,updated_at:new Date().toISOString()}});
   await audit(env,ownerId,'v0142.account.status_flag',id,{status,reason:reason.slice(0,250),ownerAccount:x.roles.includes('OWNER')});
   return respond({ok:true});
 }
 if(action==='ban'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);const duration=clean(b.duration);
   if(!['24h','168h','876000h','none'].includes(duration))throw problem('Unsupported sign-in suspension duration.');
   if(id===ownerId&&duration!=='none')throw problem('Cannot suspend your own Owner sign-in.',409);
   if(x.roles.includes('OWNER')&&duration!=='none')throw problem('Owner sign-in suspension requires a separate identity-security recovery procedure.',409);
   await authAdmin(env,'users/'+id,'PUT',{ban_duration:duration});
   await audit(env,ownerId,'v0142.account.auth_ban',id,{duration});
   return respond({ok:true});
 }
 if(action==='note'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);const note=clean(b.note),type=clean(b.noteType||'general');
   if(note.length<2||note.length>3000)throw problem('Internal note must be 2–3,000 characters.');
   if(!['general','support','moderation','commerce','learning','security'].includes(type))throw problem('Unsupported internal note type.');
   await rest(env,'admin_user_notes',{method:'POST',prefer:'return=minimal',body:{user_id:id,note,note_type:type,created_by:ownerId}});
   await audit(env,ownerId,'v0142.account.note.added',id,{noteType:type,ownerAccount:x.roles.includes('OWNER')});
   return respond({ok:true});
 }
 if(action==='revoke_resource')return await revokeAccountResource(env,actor,b);
 if(action==='grant_resource')return await grantAccountResource(env,actor,b);
 if(action==='membership'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);
   if(x.roles.includes('OWNER'))strongAssurance(actor);
   const result=await updateMembership(env,ownerId,id,x.profile.account_kind,b);
   return respond({ok:true,membership:result});
 }
 if(action==='password'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);
   // Only verified OWNER callers reach this endpoint. Owner resets additionally require explicit confirmation.
   // OWNER authorization was verified before any action. Password replacement needs no typed RESET phrase.
   if(b.newPassword&&b.newPassword!==b.confirmPassword)throw problem('The two passwords must match.');
   const password=checkNewPassword(b.newPassword),isSandbox=x.profile.account_kind==='test'||x.profile.account_kind==='showcase';
   if(isSandbox&&clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY))await dummyVaultKey(env);
   await audit(env,ownerId,'v1353.password.reset.request',id,{username:x.profile.username,sandbox:isSandbox});
   await authAdmin(env,'users/'+id,'PUT',{password});
   if(isSandbox)await persistDummyPassword(env,id,password,ownerId);
   await audit(env,ownerId,'v1353.password.reset.completed',id,{username:x.profile.username});
   return respond({ok:true,temporaryPassword:password,storedForLater:isSandbox&&!!clean(env.TEST_ACCOUNT_ENCRYPTION_KEY||env.MARKET_DATA_ENCRYPTION_KEY)});
 }
 if(action==='reveal'){
   const id=clean(b.userId),x=await lookup(env,id);targetAccess(actor,id,x);
   if(!['test','showcase'].includes(x.profile.account_kind))throw problem('Existing passwords cannot be viewed for real members, Moderators, Administrators or Owners.',403);
   // Retrieval limited to encrypted dummy credentials and authenticated OWNER sessions.
   await audit(env,ownerId,'v1353.sandbox_credential.view',id,{username:x.profile.username});
   const password=await readDummyPassword(env,id);return respond({ok:true,temporaryPassword:password,storedForLater:true});
 }
 if(action==='delete'){
   strongAssurance(actor); // Destructive identity deletion stays with Owner.
   const id=clean(b.userId);if(id===ownerId)throw problem('The current Owner cannot self-delete in Admin.',403);
   const x=await lookup(env,id),isOwner=x.roles.includes('OWNER');if(isOwner)strongAssurance(actor);
   if(clean(b.confirmation)!=='DELETE ACCOUNT')throw problem('Type DELETE ACCOUNT exactly.',400);
   if(isOwner&&clean(b.ownerConfirmation)!=='DELETE OWNER '+x.profile.username)
     throw problem('Owner account deletion also requires the username-specific secondary confirmation.',400);
   const reason=clean(b.reason);if(reason.length<10||reason.length>1000)throw problem('Deletion reason must be 10–1000 characters.');
   if(isOwner){const owners=await rest(env,'admin_user_roles?select=user_id,expires_at&role_code=eq.OWNER');if(owners.filter(r=>!r.expires_at||Date.parse(r.expires_at)>Date.now()).length<=1)throw problem('The last production Owner cannot be deleted.',409);}
   for(const [table,col] of [['site_orders','id'],['site_subscriptions','id'],['checkout_intents','intent_id'],['order_entitlement_ledger_v135','id'],['user_plan_grants','id'],['user_tool_passes','id'],['user_library','id'],['entitlements','id'],['book_key_redemptions','id'],['competency_evidence','id']]){const rows=await rest(env,table+'?select='+col+'&user_id=eq.'+id+'&limit=1');if(rows?.length)throw problem('This account has existing financial, Book Key, learning, purchase, or entitlement records. Permanent identity deletion is blocked pending a separate retention/termination workflow. Use account restriction and source-specific revocation instead.',409);}
   await rest(env,'account_deletion_events',{method:'POST',prefer:'return=minimal',body:{subject_user_id:id,actor_user_id:ownerId,account_kind:x.profile.account_kind||'member',reason,confirmation_phrase:'DELETE ACCOUNT',retained_record_summary:{source:'v0.13.5.3',subject_username:x.profile.username,financial_records_checked:true,owner_account:isOwner}}});
   await audit(env,ownerId,'v1353.account.delete.request',id,{username:x.profile.username,reason,owner_account:isOwner});await authAdmin(env,'users/'+id,'DELETE');
   await audit(env,ownerId,'v1353.account.deleted',id,{username:x.profile.username});return respond({ok:true,deleted:true});
 }
 throw problem('Unknown account operation.',404);
}
export async function onRequest({request,env}){try{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...HEAD,allow:'GET,POST,OPTIONS'}});
 const actor=await authorize(env,request),url=new URL(request.url),action=clean(url.searchParams.get('action'));
 if(request.method==='GET'&&action==='list')return await list(env,request,actor);
 if(request.method==='GET'&&action==='plans'){if(actor.showcase)return respond({ok:true,synthetic:true,plans:[{plan_code:'FREE',name:'Free'}]});const plans=await rest(env,'platform_plans?select=plan_code,name,active&active=eq.true&order=sort_order.asc');return respond({ok:true,plans:plans||[]});}
 if(request.method==='GET'&&action==='roles'){if(actor.showcase||!actor.owner)return respond({ok:true,synthetic:!!actor.showcase,roles:[]});return respond({ok:true,roles:await availableRoles(env)});}
 if(request.method==='GET'&&action==='detail')return await detail(env,actor,clean(url.searchParams.get('id')));
 if(request.method!=='POST')return respond({ok:false,error:'Unknown operation.'},405);
 const raw=await request.text();if(raw.length>7500)throw problem('Account request too large.',413);let body={};try{body=JSON.parse(raw)}catch{throw problem('Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw problem('Invalid account request body.');
 return await change(env,request,actor,action,body);
}catch(e){return respond({ok:false,error:e.message||'Account operation unavailable.'},e.status||500)}}
