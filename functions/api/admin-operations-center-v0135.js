/* v0.13.5 — unified Admin Control Center operational intelligence.
 * READ ONLY. Existing /api/admin and /api/admin-v013 retain responsibility for
 * validated mutations. This endpoint never changes checkout, QR, MFA or CAPTCHA.
 * Supabase service secret is never returned or used in browser code.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const send=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:HEADERS});
const clean=x=>String(x??'').trim();
const fail=(s,status=400)=>Object.assign(new Error(s),{status});
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);
 if(!base||!pub||!secret)throw fail('Administration services have not been configured.',503);return {base,pub,secret};}
async function raw(url,options={}){const r=await fetch(url,{...options,cache:'no-store'});if(!r.ok)throw fail('The requested administrative service did not respond successfully.',r.status===401?401:r.status===403?403:503);
 const body=options.method==='HEAD'?null:await r.text();let value=null;try{value=body?JSON.parse(body):null}catch{throw fail('Unexpected administrative service response.',503)}
 return {value,headers:r.headers};}
function authHeaders(c){return {apikey:c.secret,...(c.secret.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.secret}),accept:'application/json'}}
async function db(c,resource){const r=await raw(c.base+'/rest/v1/'+resource,{headers:authHeaders(c)});return r.value}
async function who(request,env){const c=cfg(env),token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)throw fail('Sign in to view the Control Center.',401);
 const u=(await raw(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}})).value;
 if(!u?.id||!/^[0-9a-f-]{36}$/i.test(u.id))throw fail('Authentication could not be verified.',401);
 const [profiles,grants,flags]=await Promise.all([
 db(c,'profiles?select=account_kind,deleted_at&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),
 db(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id)+'&limit=50'),
 db(c,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1')
 ]);
 const active=(Array.isArray(grants)?grants:[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code).filter(x=>/^[A-Z0-9_]{2,50}$/.test(x));
 const profile=profiles?.[0];
 if(!profile||profile.deleted_at||['restricted','suspended'].includes(clean(flags?.[0]?.status).toLowerCase()))throw fail('This administrative account is restricted.',403);
 const isShowcase=profile.account_kind==='showcase'||active.includes('SHOWCASE_VIEWER');
 if(isShowcase){if(active.length!==1||active[0]!=='SHOWCASE_VIEWER'||profile.account_kind!=='showcase')throw fail('Mixed Showcase authority rejected.',403);return {c,showcase:true,roles:[],permissions:new Set(),owner:false}}
 if(profile.account_kind!=='member')throw fail('Staff must have a production member account.',403);
 const owner=active.includes('OWNER');
 if(!active.length)throw fail('Administrative access denied.',403);
 const roles=active.join(',');
 const grantsForRole=await db(c,'admin_role_permissions?select=role_code,permission_code&role_code=in.('+roles+')&limit=1500');
 const p=new Set((grantsForRole||[]).map(x=>x.permission_code));
 if(!owner&&!p.has('control_panel.access'))throw fail('Control Center authorization is required.',403);
 return {c,showcase:false,roles:active,owner,permissions:p};}
const VIEWS={
 overview:['dashboard.view','analytics.view'],
 commerce:['commerce.view'],
 learning:['analytics.view','learning.manage'],
 support:['support.manage'],
 security:['audit.view'],
 notifications:['announcements.manage']
};
function can(a,action){return a.owner||(VIEWS[action]||[]).some(p=>a.permissions.has(p));}
async function count(c,table,filter=''){
 const r=await raw(c.base+'/rest/v1/'+table+'?select=*&limit=1'+filter,{headers:{...authHeaders(c),prefer:'count=exact'}});
 const value=r.headers.get('content-range')||'';const n=/\/(\d+)$/.exec(value);return n?Number(n[1]):null;
}
async function tryCount(c,table,filter=''){try{return await count(c,table,filter)}catch{return null}}
async function tryRows(c,table,select,sort='',limit=40,filter=''){try{const q=table+'?select='+encodeURIComponent(select)+(sort?'&order='+encodeURIComponent(sort):'')+'&limit='+limit+(filter?'&'+filter:'');const rows=await db(c,q);return {rows:Array.isArray(rows)?rows:[],available:true}}catch{return {rows:[],available:false}}}
const metric=(label,count,unit='records')=>({label,count,unit,available:count!==null});
async function overview(c){const names=[['Member profiles','profiles'],['Open support tickets','support_tickets','&status=in.(new,open,assigned,waiting_member,waiting_staff,escalated)'],['Active membership grants','user_plan_grants','&status=in.(active,trialing)'],['Active Labs','platform_labs','&active=eq.true'],['Completed Lab records','site_lab_progress','&status=eq.completed'],['Assessed competencies','competency_attempts_v135'],['Pending webhook events','payment_webhook_events','&status=in.(received,failed,error)'],['Recorded orders','order_entitlement_ledger_v135']];
 const counts=await Promise.all(names.map(async([title,table,filter])=>metric(title,await tryCount(c,table,filter||''))));
 return {metrics:counts,notice:'Live database row counts, not financial reconciliations. Unavailable sources display as such; incomplete payment activity must be investigated before checkout activation.'};}
async function commerce(c){const [orders,webhooks,grants,plans]=await Promise.all([
 tryRows(c,'checkout_intents','intent_id,item_type,item_code,amount_cents,currency,status,created_at','created_at.desc',40),
 tryRows(c,'payment_webhook_events','event_id,event_name,status,received_at,processed_at,error_message','received_at.desc',40),
 tryRows(c,'order_entitlement_ledger_v135','product_code,entitlement_kind,status,created_at','created_at.desc',40),
 tryRows(c,'platform_plans','plan_code,name,billing_interval,active,checkout_enabled','sort_order.asc',30)
 ]);
 const [intentCount,webhookCount,ledgerCount]=await Promise.all([tryCount(c,'checkout_intents'),tryCount(c,'payment_webhook_events'),tryCount(c,'order_entitlement_ledger_v135')]);
 return {counts:[metric('Checkout intents',intentCount),metric('Webhook events',webhookCount),metric('Order entitlement rows',ledgerCount)],orders,webhooks,grants,plans,notice:'Payment provider records remain authoritative. This is a monitoring screen: no charge, refund, entitlement or checkout activation can be initiated here.'};}
async function learning(c,env,bookCode=''){const valid=new Set(['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE','SITE_EXCLUSIVE']);const book=String(bookCode||'').toUpperCase();if(book&&!valid.has(book))throw fail('Invalid Lab collection.',400);const [labs,attempts,practice,definitions]=await Promise.all([
 book?tryRows(c,'platform_labs','lab_id,title,book_code,active,registry_visible,public_sample','sort_order.asc',30,'book_code=eq.'+encodeURIComponent(book)):Promise.resolve({rows:[],available:true}),
 tryRows(c,'competency_attempts_v135','case_code,final_score,critical_errors,submitted_at','submitted_at.desc',35),
 tryRows(c,'replay_practice_sessions_v135','id,created_at','created_at.desc',15),
 tryRows(c,'competency_definitions','competency_code,name,active','sort_order.asc',35)
 ]);
 const [totalLabs,completions,assessments,practices]=await Promise.all([(book?tryCount(c,'platform_labs','&book_code=eq.'+encodeURIComponent(book)):Promise.resolve(null)),tryCount(c,'site_lab_progress','&status=eq.completed'),tryCount(c,'competency_attempts_v135'),tryCount(c,'replay_practice_sessions_v135')]);
 return {counts:[metric('Registered Labs',totalLabs),metric('Completed Lab records',completions),metric('Submitted assessments',assessments),metric('Replay practice sessions',practices)],labs,attempts,practice,definitions,notice:'Lab completion is not competency mastery. Practice records are not automatically graded evidence.'};}
async function support(c){const [tickets,n]=await Promise.all([tryRows(c,'support_tickets','id,ticket_number,category,subject,status,priority,created_at,updated_at','updated_at.desc',80),tryCount(c,'support_tickets')]);
 return {counts:[metric('Support tickets',n)],tickets,notice:'Ticket summaries exclude member email, descriptions, and private replies. Use the existing authorized Support tools for case management.'};}
async function security(c,env){const [audits,flags,settings]=await Promise.all([
 tryRows(c,'admin_audit_log','action,target_type,created_at','created_at.desc',45),
 tryRows(c,'admin_user_flags','status,updated_at','updated_at.desc',80),
 tryRows(c,'site_settings','setting_key,value','',40)
 ]);
 const safeSettings=(settings.rows||[]).filter(x=>['commerce.checkout_enabled','commerce.checkout_test_mode'].includes(x.setting_key));
 const [auditCount,flagCount]=await Promise.all([tryCount(c,'admin_audit_log'),tryCount(c,'admin_user_flags','&status=in.(restricted,suspended,watch)')]);
 return {counts:[metric('Recorded audit entries',auditCount),metric('Flagged accounts',flagCount)],audits,
 safeguards:[{label:'Mandatory staff MFA',value:env.REQUIRE_STAFF_AAL2_V135==='true'?'Enabled (owner configuration)':'Not globally enforced'},
 {label:'Public checkout',value:String(safeSettings.find(x=>x.setting_key==='commerce.checkout_enabled')?.value)==='true'?'Database switch ON — verify independently':'Database switch not enabled or not readable'},
 {label:'QR activation',value:'Not enabled by this Admin update'},
 {label:'Mandatory CAPTCHA',value:'Not enabled by this Admin update'}],
 notice:'These indicators are configuration observations, not authentication penetration-test results. Failed-login monitoring and recovery remain separate operational acceptance items.'};}
async function notifications(c){const [notices,anns,records]=await Promise.all([
 tryRows(c,'user_notifications','notification_type,is_read,created_at','created_at.desc',35),
 tryRows(c,'site_announcements','title,announcement_type,audience,active,updated_at','updated_at.desc',35),
 tryCount(c,'user_notifications')]);
 return {counts:[metric('Notification rows',records)],notices,announcements:anns,notice:'This is a monitoring view. The existing Announcements editor remains responsible for publication. No bulk notifications or email campaigns are sent here.'};}
const HANDLERS={overview,commerce,learning,support,security,notifications};
const SYNTHETIC={
 overview:{metrics:[metric('Member profiles',12),metric('Open support tickets',3),metric('Active membership grants',8),metric('Active Labs',419),metric('Completed Lab records',41),metric('Submitted assessments',14),metric('Pending webhook events',0),metric('Recorded orders',8)]},
 commerce:{counts:[metric('Checkout intents',7),metric('Webhook events',8)],orders:{rows:[{intent_id:'DEMO-INTENT',item_type:'plan',item_code:'FULL_MONTHLY',amount_cents:0,currency:'USD',status:'demo',created_at:'2026-01-01T00:00:00Z'}],available:true},webhooks:{rows:[],available:true},grants:{rows:[],available:true},plans:{rows:[],available:true}},
 learning:{counts:[metric('Registered Labs',419),metric('Completed Lab records',41)],labs:{rows:[],available:true},attempts:{rows:[],available:true},practice:{rows:[],available:true},definitions:{rows:[],available:true}},
 support:{counts:[metric('Support tickets',2)],tickets:{rows:[{id:1,ticket_number:'SUP-DEMO',category:'book_access',subject:'Synthetic book activation question',status:'open',priority:'normal',updated_at:'2026-01-01T00:00:00Z'}],available:true}},
 security:{counts:[metric('Recorded audit entries',0)],audits:{rows:[],available:true},safeguards:[{label:'Mandatory staff MFA',value:'Demo-only settings'}]},
 notifications:{counts:[metric('Notification rows',0)],notices:{rows:[],available:true},announcements:{rows:[],available:true}}
};
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return send({ok:false,error:'This administrative reporting endpoint is read-only.'},405);
  const name=clean(new URL(request.url).searchParams.get('action'))||'overview';if(!Object.hasOwn(HANDLERS,name))return send({ok:false,error:'Unsupported administrative report.'},404);
  const a=await who(request,env);
  if(a.showcase)return send({ok:true,synthetic:true,...SYNTHETIC[name],notice:'SYNTHETIC SHOWCASE. No production records have been loaded.'});
  if(!can(a,name))return send({ok:false,error:'Your administrative role does not permit this report.'},403);
  return send({ok:true,synthetic:false,...await HANDLERS[name](a.c,env,name==='learning'?new URL(request.url).searchParams.get('bookCode')||'':'')});
 }catch(e){return send({ok:false,error:e.message||'Administrative report unavailable.'},e.status||503)}
}
