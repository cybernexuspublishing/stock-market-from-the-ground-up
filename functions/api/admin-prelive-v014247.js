/* v0.14.0.247 — Owner-only, read-only non-LIVE acceptance diagnostics. No payment operations. */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const send=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...H,...extra}});
const forbidden=(status)=>send({ok:false,error:status===401?'Sign in required.':'Owner authorization required.'},status);
const str=x=>String(x||'').trim();
// Supabase supports both legacy service JWTs and current sb_secret_ keys.
const serviceHeaders=key=>({apikey:key,...(key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+key})});
const cfg=env=>{
 const base=str(env.SUPABASE_URL).replace(/\/$/,'');
 const secret=str(env.SUPABASE_SECRET_KEY),pub=str(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY);
 if(!base||!secret||!pub)throw Error('Administrative data service is not configured.');
 return {base,secret,pub};
};
async function result(url,headers){
 const response=await fetch(url,{method:'GET',headers,cache:'no-store'});
 if(!response.ok)throw Error('Administrative data source unavailable.');
 return response.json();
}
async function owner(request,c){
 const match=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'');
 if(!match)return null;
 const person=await result(c.base+'/auth/v1/user',{apikey:c.pub,authorization:'Bearer '+match[1]});
 if(!person?.id||!/^[a-f0-9-]{36}$/i.test(person.id))return null;
 const header=serviceHeaders(c.secret);
 const [roles,profiles]=await Promise.all([
  result(c.base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(person.id),header),
  result(c.base+'/rest/v1/profiles?select=account_kind&id=eq.'+encodeURIComponent(person.id)+'&limit=1',header)
 ]);
 if(profiles?.[0]?.account_kind!=='member')return null;
 if(!Array.isArray(roles)||roles.some(x=>x.role_code==='SHOWCASE_VIEWER'))return null;
 const isOwner=roles.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now()));
 return isOwner?{id:person.id}:null;
}
function client(c){
 const auth=serviceHeaders(c.secret);
 return {
  rows:async(path)=>{try{return await result(c.base+'/rest/v1/'+path,auth)}catch{return null}},
  count:async(table)=>{try{
   const r=await fetch(c.base+'/rest/v1/'+table+'?select=*&limit=1',{method:'GET',cache:'no-store',headers:{...auth,prefer:'count=exact',range:'0-0'}});
   if(!r.ok)return null;const found=(r.headers.get('content-range')||'').match(/\/(\d+)$/);return found?Number(found[1]):null;
  }catch{return null}}
 };
}
function check(code,label,state,detail){return {code,label,state,detail}}
export async function onRequest({request,env}){
 if(request.method!=='GET')return send({ok:false,error:'Read-only endpoint. GET only.'},405,{allow:'GET'});
 if(!/^Bearer\s+\S+$/i.test(request.headers.get('authorization')||''))return forbidden(401);
 let c;try{c=cfg(env)}catch{return send({ok:false,error:'Readiness checks temporarily unavailable.'},503)}
 let actor;
 try{actor=await owner(request,c)}catch{return forbidden(403)}
 if(!actor)return forbidden(403);
 const db=client(c);
 const [adSettings,mode,shared,prices,members,orders,subscriptions,audits,adIntents,adEvents]=await Promise.all([
  db.rows('gu_ad_sales_settings_v014226?select=accepting_payments,ad_delivery_enabled&singleton=eq.true&limit=1'),
  db.rows('gu_ad_sandbox_settings_v014240?select=testing_enabled&singleton=eq.true&limit=1'),
  db.rows('gu39_sandbox_settings?select=enabled&id=eq.true&limit=1'),
  db.rows('gu_ad_sandbox_prices_v014240?select=package_code,test_price_id,test_amount_cents&limit=10'),
  db.count('profiles'),db.count('site_orders'),db.count('site_subscriptions'),db.count('admin_audit_log'),
  db.count('gu_ad_sandbox_intents_v014240'),db.count('gu_ad_sandbox_events_v014240')
 ]);
 const ad=adSettings?.[0],adMode=mode?.[0],sharedMode=shared?.[0];
 const expected=['SITE_SPONSOR','SECTION_SPONSOR','RESOURCE_SPONSOR'];
 const packages=Array.isArray(prices)&&prices.length===3&&expected.every(code=>prices.some(p=>p.package_code===code&&p.test_amount_cents===100&&/^price_[a-zA-Z0-9]+$/.test(p.test_price_id||'')));
 const secrets=Boolean(str(env.GU39_STRIPE_TEST_SECRET_KEY)&&str(env.GU39_STRIPE_TEST_WEBHOOK_SECRET));
 const safeAds=ad?.accepting_payments===false&&ad?.ad_delivery_enabled===false;
 const safeSwitch=adMode?.testing_enabled===false&&sharedMode?.enabled===false;
 const checks=[
  check('owner','Real Owner access','verified','Current authenticated member has an active OWNER role; Showcase is excluded.'),
  check('advertising','LIVE advertising safeguards',safeAds?'verified':'action_required',safeAds?'Advertising billing and delivery are both disabled.':'Advertising flags unavailable or not both disabled; verify before accepting any release.'),
  check('sandbox_mode','Sandbox session mode',safeSwitch?'verified':'review',safeSwitch?'Advertising and shared TEST-mode switches are currently disabled.':'TEST-mode switches are active or could not be verified. Coordinate any controlled QA window.'),
  check('sandbox_catalog','Advertising TEST package mapping',packages?'verified':'action_required',packages?'Three distinct $1.00 TEST price mappings are present in the database.':'One or more TEST package database mappings are missing or invalid.'),
  check('test_secrets','Stripe TEST-mode server configuration',secrets?'verified':'action_required',secrets?'Both required TEST Stripe secrets are configured on the server; no values are exposed.':'One or more TEST credentials or webhook signing secrets are unavailable.'),
  check('test_checkout','Hosted Checkout and provider webhooks','pending','A real provider-delivered TEST checkout, signed-webhook ledger, refund and failed-payment acceptance are not certified by this read-only report.'),
  check('nonpayment_browser','Authenticated browser acceptance','pending','Requires real Owner and unauthorized-user browser evidence plus successful CI. Source checks alone do not certify it.'),
  check('live_authorization','LIVE payments','pending','Explicitly excluded. Do not enable or charge LIVE payments through this diagnostic.')
 ];
 return send({
  ok:true,readOnly:true,ownerVerified:true,synthetic:false,observedAt:new Date().toISOString(),
  counts:{members,orders,subscriptions,auditEntries:audits,adSandboxOrders:adIntents,adSandboxEvents:adEvents},
  checks,
  livePaymentActionsAvailable:false,
  note:'Configuration observations only. Provider event delivery, real browser tests and LIVE payment acceptance are independent gates.'
 });
}
