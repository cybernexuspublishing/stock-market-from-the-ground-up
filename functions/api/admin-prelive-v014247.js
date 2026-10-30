import {founderCatalogReadiness} from '../_lib/founder-catalog-readiness-v014264.js';
/* v0.14.0.264 — Owner-only, read-only non-LIVE acceptance diagnostics. No payment operations. */
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
 const [roles,profiles,flags]=await Promise.all([
  result(c.base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(person.id),header),
  result(c.base+'/rest/v1/profiles?select=account_kind,deleted_at&id=eq.'+encodeURIComponent(person.id)+'&limit=1',header),
  result(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(person.id)+'&limit=1',header)
 ]);
 if(profiles?.[0]?.account_kind!=='member'||profiles[0].deleted_at||['restricted','suspended'].includes(str(flags?.[0]?.status).toLowerCase()))return null;
 if(!Array.isArray(roles)||roles.some(x=>x.role_code==='SHOWCASE_VIEWER'))return null;
 const isOwner=roles.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now()));
 return isOwner?{id:person.id}:null;
}
function client(c){
 const auth=serviceHeaders(c.secret);
 return {
  rows:async(path)=>{try{return await result(c.base+'/rest/v1/'+path,auth)}catch{return null}},
  count:async(table,filter='')=>{try{
   const r=await fetch(c.base+'/rest/v1/'+table+'?select=*&limit=1'+(filter?'&'+filter:''),{method:'GET',cache:'no-store',headers:{...auth,prefer:'count=exact',range:'0-0'}});
   if(!r.ok)return null;const found=(r.headers.get('content-range')||'').match(/\/(\d+)$/);return found?Number(found[1]):null;
  }catch{return null}}
 };
}
function check(code,label,state,detail){return {code,label,state,detail}}
async function stripeTestProvider(env,priceRows){
 const key=str(env.GU39_STRIPE_TEST_SECRET_KEY);
 if(!/^(sk|rk)_test_[A-Za-z0-9_]+$/.test(key))
  return {state:'action_required',detail:'A valid Stripe TEST-only server key is unavailable. No LIVE key is ever used for this check.'};
 if(!Array.isArray(priceRows)||priceRows.length!==3)
  return {state:'action_required',detail:'TEST price mappings must be configured before provider reconciliation.'};
 const headers={authorization:'Bearer '+key,accept:'application/json'};
 const get=async(path)=>{
  const r=await fetch('https://api.stripe.com/v1/'+path,{
   headers,method:'GET',cache:'no-store',signal:AbortSignal.timeout(8000)
  });
  if(!r.ok)throw Error('Stripe TEST status unavailable');
  return r.json();
 };
 try{
  const [a,b,c,webhooks]=await Promise.all([
   ...priceRows.map(row=>get('prices/'+encodeURIComponent(row.test_price_id))),
   get('webhook_endpoints?limit=100')
  ]);
  const providerPrices=[a,b,c];
  const valid=priceRows.every((row,i)=>{
   const p=providerPrices[i];
   return p?.id===row.test_price_id&&p.livemode===false&&p.active===true&&
    p.currency==='usd'&&p.unit_amount===100&&p.type==='one_time'&&
    p.metadata?.ad_sandbox==='true'&&p.metadata?.site_sku===row.package_code;
  });
  const required=['checkout.session.completed','checkout.session.expired',
   'invoice.paid','invoice.payment_failed','customer.subscription.updated',
   'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
  const webhook=Array.isArray(webhooks?.data)?
    webhooks.data.find(w=>w.url===(str(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev').replace(/\/$/,'')+'/api/gu39-stripe-webhook'&&
      w.status==='enabled'&&w.livemode===false&&required.every(e=>w.enabled_events?.includes(e))):null;
  if(!valid||!webhook)
   return {state:'action_required',detail:'Stripe TEST price amounts, SKU metadata or required webhook delivery configuration do not match the database. No LIVE changes were made.'};
  return {state:'verified',detail:'Stripe TEST API independently confirms all three active $1.00 one-time QA prices and the enabled webhook event subscriptions. Actual signed event delivery is a separate pending test.'};
 }catch{
  return {state:'review',detail:'Stripe TEST provider verification was unavailable. Database configuration alone does not establish provider acceptance.'};
 }
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return send({ok:false,error:'Read-only endpoint. GET only.'},405,{allow:'GET'});
 if(!/^Bearer\s+\S+$/i.test(request.headers.get('authorization')||''))return forbidden(401);
 let c;try{c=cfg(env)}catch{return send({ok:false,error:'Readiness checks temporarily unavailable.'},503)}
 let actor;
 try{actor=await owner(request,c)}catch{return forbidden(403)}
 if(!actor)return forbidden(403);
 const db=client(c);
 const [adSettings,mode,shared,prices,members,orders,subscriptions,audits,adIntents,adEvents,
  founderRelease,founderPlans,founderReservations,founderMembers,founderQaIntents,founderQaEvents,founderQaCycles,
  registeredLabs,reviewedLabs,draftLabs,competencies]=await Promise.all([
  db.rows('gu_ad_sales_settings_v014226?select=accepting_payments,ad_delivery_enabled&singleton=eq.true&limit=1'),
  db.rows('gu_ad_sandbox_settings_v014240?select=testing_enabled&singleton=eq.true&limit=1'),
  db.rows('gu39_sandbox_settings?select=enabled&id=eq.true&limit=1'),
  db.rows('gu_ad_sandbox_prices_v014240?select=package_code,test_price_id,test_amount_cents&limit=10'),
  db.count('profiles'),db.count('site_orders'),db.count('site_subscriptions'),db.count('admin_audit_log'),
  db.count('gu_ad_sandbox_intents_v014240'),db.count('gu_ad_sandbox_events_v014240'),
  db.rows('gu_founder_release_v014173?select=enrollment_enabled,billing_enabled,fulfillment_enabled&singleton=eq.true&limit=1'),
  db.rows('gu_founder_plans_v014173?select=plan_code,term_days,price_cents,checkout_enabled,purchase_discount_bps&limit=3'),
  db.count('gu_founder_reservations_v014173'),db.count('gu_founder_members_v014173'),
  db.count('gu_f600_sandbox_intents_v014215'),db.count('gu_f600_sandbox_events_v014215'),
  db.count('gu_f600_sandbox_cycles_v014215'),
  db.count('platform_labs'),db.count('lab_training_sets_v014','review_state=eq.reviewed'),
  db.count('lab_training_sets_v014','review_state=eq.draft'),
  db.count('competency_definitions')
 ]);
 const ad=adSettings?.[0],adMode=mode?.[0],sharedMode=shared?.[0];
 const expected=['SITE_SPONSOR','SECTION_SPONSOR','RESOURCE_SPONSOR'];
 const packages=Array.isArray(prices)&&prices.length===3&&expected.every(code=>prices.some(p=>p.package_code===code&&p.test_amount_cents===100&&/^price_[a-zA-Z0-9]+$/.test(p.test_price_id||'')));
 const secrets=Boolean(str(env.GU39_STRIPE_TEST_SECRET_KEY)&&str((env.STRIPE_TEST_WEBHOOK_SECRET || env.GU39_STRIPE_TEST_WEBHOOK_SECRET)));
 const [stripeTest,founderStripe]=await Promise.all([stripeTestProvider(env,prices),founderCatalogReadiness(env)]);
 const safeAds=ad?.accepting_payments===false&&ad?.ad_delivery_enabled===false;
 const safeSwitch=adMode?.testing_enabled===false&&sharedMode?.enabled===false;
 const release=founderRelease?.[0];
 const plan30=Array.isArray(founderPlans)?founderPlans.find(x=>x.plan_code==='FOUNDING_30'):null;
 const plan60=Array.isArray(founderPlans)?founderPlans.find(x=>x.plan_code==='FOUNDING_60'):null;
 const validFounderTerms=founderPlans?.length===2&&
   plan30?.term_days===30&&plan30?.price_cents===4999&&plan30?.purchase_discount_bps===1000&&
   plan60?.term_days===60&&plan60?.price_cents===5999&&plan60?.purchase_discount_bps===1500;
 const founderLiveHeld=release?.enrollment_enabled===false&&release?.billing_enabled===false&&
   release?.fulfillment_enabled===false&&plan30?.checkout_enabled===false&&plan60?.checkout_enabled===false;
 const founderQaObserved=Number.isInteger(founderQaEvents)&&founderQaEvents>0&&
   Number.isInteger(founderQaCycles)&&founderQaCycles>0;
 const checks=[
  check('owner','Real Owner access','verified','Current authenticated member has an active OWNER role; Showcase is excluded.'),
  check('advertising','LIVE advertising safeguards',safeAds?'verified':'action_required',safeAds?'Advertising billing and delivery are both disabled.':'Advertising flags unavailable or not both disabled; verify before accepting any release.'),
  check('sandbox_mode','Sandbox session mode',safeSwitch?'verified':'review',safeSwitch?'Advertising and shared TEST-mode switches are currently disabled.':'TEST-mode switches are active or could not be verified. Coordinate any controlled QA window.'),
  check('sandbox_catalog','Advertising TEST package mapping',packages?'verified':'action_required',packages?'Three distinct $1.00 TEST price mappings are present in the database.':'One or more TEST package database mappings are missing or invalid.'),
  check('test_secrets','Stripe TEST-mode server configuration',secrets?'verified':'action_required',secrets?'Both required TEST Stripe secrets are configured on the server; no values are exposed.':'One or more TEST credentials or webhook signing secrets are unavailable.'),
  check('stripe_test_provider','Stripe TEST provider configuration',stripeTest.state,stripeTest.detail),
  check('founding_provider_test','Founding 600 Stripe TEST product and webhook parity',founderStripe.sandbox.state,founderStripe.sandbox.detail),
  check('founding_provider_live','Founding 600 Stripe LIVE production catalog readiness',founderStripe.live.state,founderStripe.live.detail),
  check('founding_live_hold','Founding 600 LIVE safety',founderLiveHeld?'verified':'action_required',
    founderLiveHeld?'Enrollment, billing, fulfillment and both founding plan checkouts are disabled.':
      'Unable to verify all five LIVE safety switches as disabled. Escalate before release.'),
  check('founding_terms','Founding 600 frozen plan terms',validFounderTerms?'verified':'action_required',
    validFounderTerms?'Standard: $49.99/30 days, 10% eligible-purchase discount; Extended: $59.99/60 days, 15% eligible-purchase discount.':
      'Founding plan prices, durations, permanent-discount rules or catalog records could not be verified.'),
  check('founding_sandbox','Founding 600 Sandbox ledger',founderQaObserved?'review':'pending',
    founderQaObserved?'TEST event and billing-cycle records exist; independently reconcile event IDs against Stripe before closing provider acceptance.':
      'Missing or unreadable founding TEST event and paid-cycle records.'),
  check('founding_capacity','600-seat and entitlement concurrency','pending',
    'Counts alone cannot establish atomic seat reservation, cutoff at 600 or authorized paid-to-member entitlement activation.'),
  check('education_registry','Educational registry configuration',
    registeredLabs===419&&competencies===30?'verified':'action_required',
    'Registry must preserve exactly 419 Labs and 30 competencies. Active registration is not independent teaching or assessment approval.'),
  check('education_reviews','Individual assessment editorial acceptance',
    reviewedLabs===419?'review':'pending',
    reviewedLabs===419?'All 419 rubric sets are database-reviewed; independent subject-matter and browser evidence still required.':
    'Unreviewed exercises are not authorized for graded assessment. Review state requires individually verified teaching content and answer keys.'),
  check('stage_a','Stage A — Interest / recruitment','pending',
    'Confirm privacy-safe no-charge signup, consent, eligible applicant flow and truthful launch messaging before collecting interest.'),
  check('stage_b','Stage B — Closed free beta','pending',
    'Requires real authenticated nonpayment member journeys, entitlement isolation, navigation, accessibility and support tests.'),
  check('stage_c','Stage C — Paid Founding 600 beta','pending',
    'Requires completed Sandbox subscription lifecycle, 600-seat concurrency and all promised member features, then separately authorized LIVE verification.'),
  check('stage_d','Stage D — General public launch','pending',
    'Beyond current acceptance scope. Do not approve from a source or configuration check.'),
  check('test_checkout','Hosted Checkout and provider webhooks','pending','A real provider-delivered TEST checkout, signed-webhook ledger, refund and failed-payment acceptance are not certified by this read-only report.'),
  check('nonpayment_browser','Authenticated browser acceptance','pending','Requires real Owner and unauthorized-user browser evidence plus successful CI. Source checks alone do not certify it.'),
  check('live_authorization','LIVE payments','pending','Explicitly excluded. Do not enable or charge LIVE payments through this diagnostic.')
 ];
 return send({
  ok:true,readOnly:true,ownerVerified:true,synthetic:false,observedAt:new Date().toISOString(),
  counts:{members,orders,subscriptions,auditEntries:audits,adSandboxOrders:adIntents,adSandboxEvents:adEvents,
    founderReservations,founderMembers,founderQaIntents,founderQaEvents,founderQaCycles,
    registeredLabs,reviewedLabs,draftLabs,competencies},
  checks,
  livePaymentActionsAvailable:false,
  note:'Configuration observations only. Provider event delivery, real browser tests and LIVE payment acceptance are independent gates.'
 });
}
