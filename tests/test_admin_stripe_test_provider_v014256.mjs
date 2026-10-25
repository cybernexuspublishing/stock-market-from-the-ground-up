/* v0.14.0.256 — read-only Stripe TEST provider price + webhook reconciliation. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/admin-prelive-v014247.js';
const uuid='7e3c301b-8fb9-4293-bb71-8dfafbc25bab';
const env={SUPABASE_URL:'https://qa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',
 SUPABASE_SECRET_KEY:'sb_secret_qa',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_testmock'};
const priceRows=[
 {package_code:'SITE_SPONSOR',test_price_id:'price_TESTA1',test_amount_cents:100},
 {package_code:'SECTION_SPONSOR',test_price_id:'price_TESTB2',test_amount_cents:100},
 {package_code:'RESOURCE_SPONSOR',test_price_id:'price_TESTC3',test_amount_cents:100}
];
const events=['checkout.session.completed','checkout.session.expired','invoice.paid','invoice.payment_failed',
 'customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const original=globalThis.fetch;
let wrongPrice=false,providerDown=false,stripeReads=0;
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}});
try{
 globalThis.fetch=async (url,options={})=>{
  const u=String(url);
  if(u.includes('api.stripe.com/v1/')){
   stripeReads++;
   assert.equal(options.headers.authorization,'Bearer sk_test_mock','Use TEST secret only');
   assert.equal(options.method,'GET','Stripe provider probe must be read-only');
   if(providerDown)return json({error:{message:'Service unavailable'}},503);
   if(u.includes('webhook_endpoints'))return json({data:[{id:'we_TEST',livemode:false,status:'enabled',
    url:'https://stock-market-from-the-ground-up.pages.dev/api/gu39-stripe-webhook',enabled_events:events}]});
   const id=u.split('/prices/')[1],row=priceRows.find(p=>p.test_price_id===id);
   assert(row,'Never enumerate arbitrary Stripe prices');
   return json({id,livemode:false,active:true,currency:'usd',type:'one_time',
    unit_amount:wrongPrice&&id===priceRows[0].test_price_id?500:100,
    metadata:{site_sku:row.package_code,ad_sandbox:'true'}});
  }
  if(u.includes('/auth/v1/user'))return json({id:uuid,email:'qa@example.test'});
  if(u.includes('/admin_user_roles?'))return json([{role_code:'OWNER',expires_at:null}]);
  if(u.includes('/profiles?select=account_kind'))return json([{account_kind:'member',deleted_at:null}]);
  if(u.includes('/admin_user_flags?select=status'))return json([{status:'active'}]);
  if(u.includes('/gu_ad_sandbox_prices_v014240?'))return json(priceRows);
  if(u.includes('/gu_ad_sandbox_settings_v014240?'))return json([{testing_enabled:false}]);
  if(u.includes('/gu39_sandbox_settings?'))return json([{enabled:false}]);
  if(u.includes('/gu_ad_sales_settings_v014226?'))return json([{accepting_payments:false,ad_delivery_enabled:false}]);
  if(u.includes('/rest/v1/'))return json([],200,{'content-range':'*/0'});
  throw Error('Unexpected QA URL '+u);
 };
 const request=new Request('https://qa.test/api/admin-prelive-v014247',{headers:{authorization:'Bearer qa-session'}});
 const gate=async()=>{const r=await onRequest({request,env});assert.equal(r.status,200);return r.json()};
 let value=await gate(),check=value.checks.find(c=>c.code==='stripe_test_provider');
 assert.equal(check.state,'verified','Matching TEST prices and webhook pass');
 assert.equal(stripeReads,7,'Advertising checks 3 prices and 1 webhook; Founder TEST adds 2 prices and 1 webhook');
 assert(!JSON.stringify(value).includes('sk_test_mock'),'Never expose Stripe secret to frontend');
 wrongPrice=true;
 value=await gate();check=value.checks.find(c=>c.code==='stripe_test_provider');
 assert.equal(check.state,'action_required','Price discrepancy blocks provider readiness');
 wrongPrice=false;providerDown=true;
 value=await gate();check=value.checks.find(c=>c.code==='stripe_test_provider');
 assert.equal(check.state,'review','Provider outage must not be reported as verified');
 assert(value.checks.find(c=>c.code==='test_checkout').state==='pending','Actual payment remains unaccepted');
 assert(value.checks.find(c=>c.code==='live_authorization').state==='pending','LIVE gate must remain pending');
 console.log('PASS Stripe TEST provider verification, price mismatch, provider outage and no LIVE/payment execution');
}finally{globalThis.fetch=original}
