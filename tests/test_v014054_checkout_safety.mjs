import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// v54: full Stripe/Supabase pre-payment mock, NO live provider requests or actual Stripe sessions.
const raw=readFileSync(new URL('../functions/api/gu39-sandbox.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
const root='https://example.com/api/gu39-sandbox',db='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const actorId='c0e4ee3e-39d2-4720-a8cb-6d03c9cfaa43';
const mapping={
 'plan:FULL_MONTHLY':'price_mock00000011111','plan:FULL_ANNUAL':'price_mock00000022222',
 'plan:LIFETIME':'price_mock00000033333','plan:ONDEMAND_MONTHLY':'price_mock00000044444',
 'tool:INTERACTIVE_LEARNING':'price_mock00000055555','tool:JOURNAL_ANALYTICS':'price_mock00000066666',
 'tool:MARKET_SIMULATOR':'price_mock00000077777','tool:MARKET_TUTOR':'price_mock00000088888'};
const products={
 'plan:FULL_MONTHLY':['prod_VRvuGwLKI16MXU',6999,'month'],
 'plan:FULL_ANNUAL':['prod_VRvyBNhWk9jshb',69900,'year'],
 'plan:LIFETIME':['prod_VRwgISspL5mhls',249900,'one_time'],
 'plan:ONDEMAND_MONTHLY':['prod_VRwjus5sQLtTad',1999,'month'],
 'tool:INTERACTIVE_LEARNING':['prod_VRwmmu4zATdHAb',2999,'month'],
 'tool:JOURNAL_ANALYTICS':['prod_VRwoX4hTg8fRCm',2999,'month'],
 'tool:MARKET_SIMULATOR':['prod_VRwrsEpvfw60Xh',2999,'month'],
 'tool:MARKET_TUTOR':['prod_VRwuiqDt8qHayI',2999,'month']};
const events=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed',
 'customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
let state={owner:true,stepup:true,gate:true,blockedPrice:false,shadowRead:true,intents:0,orphans:false,missingWebhook:false,
 stripeCheckoutError:null,bindFails:false,remoteCalls:[],stripeCreates:0,intentCreates:0,ownerToggleCalls:0};
const env={SUPABASE_URL:db,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',GU39_SANDBOX_SHADOW_GATE:'true',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify(mapping)};
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const authHeaders={authorization:'Bearer mock-jwt',origin:'https://example.com','content-type':'application/json'};
const read=sku=>new Request(root+'?view=checkout-safety&sku='+encodeURIComponent(sku),{headers:authHeaders});
const checkout=sku=>new Request(root,{method:'POST',headers:authHeaders,body:JSON.stringify({action:'checkout',sku})});
const expectedSku='plan:FULL_MONTHLY';
const fakeStripePrice=(sku)=>{
 const [product,amount,interval]=products[sku];
 return {id:mapping[sku],product,unit_amount:state.blockedPrice?0:amount,
  livemode:false,active:true,currency:'usd',
  type:interval==='one_time'?'one_time':'recurring',
  recurring:interval==='one_time'?null:{interval}};
};
const prior=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';state.remoteCalls.push({u,method,headers:options.headers||{}});
 if(u.endsWith('/auth/v1/user'))return respond({id:actorId});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return respond({ok:true,role:state.owner?'OWNER':'ADMIN'});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return respond(state.stepup);
 if(u.endsWith('/rpc/gu39_sandbox_owner_read'))return respond({ok:true,role:'OWNER',enabled:state.owner,
   updatedAt:'2026-10-17T12:00:00Z',intentCount:0,processedEventCount:0,shadowAccessCount:0});
 if(u.endsWith('/v1/account'))return respond({id:'acct_1URGkDJY9FI7byHB'});
 if(u.includes('/v1/webhook_endpoints?')){
  return respond({has_more:false,data:state.missingWebhook?[]:[{
   id:'we_mock',url:'https://example.com/api/gu39-stripe-webhook',livemode:false,status:'enabled',enabled_events:events}]});
 }
 if(u.endsWith('/rest/v1/gu39_sandbox_settings?select=enabled&id=eq.true&limit=1'))
  return respond([{enabled:state.owner}]);
 if(u.includes('/rest/v1/gu39_sandbox_intents?select=id')&&u.includes('status=eq.prepared'))return respond(state.orphans?[{id:actorId}]:[]);
 if(u.includes('/rest/v1/gu39_sandbox_intents?select=id')){
  if(!state.shadowRead)return respond({message:'permission denied'},403);
  return respond(Array.from({length:state.intents},()=>({id:actorId})));
 }
 const pathPrice=u.match(/\/v1\/prices\/(price_[A-Za-z0-9_]+)/)?.[1];
 if(pathPrice){const sku=Object.keys(mapping).find(x=>mapping[x]===pathPrice);if(!sku)return respond({error:{code:'resource_missing'}},404);return respond(fakeStripePrice(sku));}
 if(u.includes('/v1/products/'))return respond({id:u.split('/').at(-1),active:true,livemode:false});
 if(u.includes('/rest/v1/gu39_sandbox_intents')&&method==='POST'){state.intentCreates++;return respond([{id:actorId}]);}
 if(u.includes('/rest/v1/gu39_sandbox_intents?id=eq.')&&method==='PATCH')
  return state.bindFails?respond({message:'db unavailable'},503):new Response(null,{status:204});
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  state.stripeCreates++;
  assert.equal(options.headers['Stripe-Version'],'2026-02-25.preview','Managed Payments requires explicitly versioned Checkout');
  const params=new URLSearchParams(options.body);
  assert.equal(params.get('managed_payments[enabled]'),'true');
  assert.equal(params.get('mode'),'subscription');
  assert.equal(params.get('line_items[0][price]'),mapping[expectedSku]);
  assert.equal(params.get('line_items[0][quantity]'),'1');
  if(state.stripeCheckoutError==='managed')return respond({error:{code:'parameter_unknown',param:'managed_payments[enabled]',message:'internal provider details are private'}},400);
  if(state.stripeCheckoutError==='other')return respond({error:{code:'not_allowed',message:'private provider reject'}},400);
  return respond({id:'cs_test_mock123456789',livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_mock123456789'});
 }
 throw Error('Unexpected network '+method+' '+u);
};
try{
 const audit=async(sku=expectedSku,environment=env)=>{
  const resp=await api.onRequestGet({request:read(sku),env:environment});
  return {resp,body:await resp.json()};
 };
 let {resp,body}=await audit();
 assert.equal(resp.status,200);
 assert.equal(body.passed,9);
 assert.equal(body.total,9);
 assert.equal(body.safeToAttemptTest,true);
 assert.equal(body.stripeManagedPaymentsProviderAcceptance,'NOT_VERIFIED_BY_READ_ONLY_API');
 assert.equal(state.intentCreates,0);
 assert.equal(state.stripeCreates,0);
 assert(state.remoteCalls.every(x=>!x.u.includes('/v1/checkout/sessions')&&!(x.u.includes('gu39_sandbox_intents')&&x.method!=='GET')));

 state.stepup=false;body=(await audit()).body;
 assert.equal(body.safeToAttemptTest,false);
 assert(body.checks.some(x=>x.name.includes('password')&&x.status==='BLOCKED'));
 state.stepup=true;state.owner=false;({resp,body}=await audit());
 assert.equal(resp.status,403,'Admin must be denied Owner-only checkout audit');state.owner=true;
 body=(await audit(expectedSku,{...env,GU39_SANDBOX_SHADOW_GATE:'false'})).body;
 assert.equal(body.safeToAttemptTest,false);
 state.blockedPrice=true;body=(await audit()).body;
 assert.equal(body.safeToAttemptTest,false);state.blockedPrice=false;
 state.shadowRead=false;body=(await audit()).body;
 assert.equal(body.safeToAttemptTest,false);state.shadowRead=true;
 state.intents=12;body=(await audit()).body;assert.equal(body.safeToAttemptTest,false);
 state.intents=0;state.orphans=true;body=(await audit()).body;assert.equal(body.safeToAttemptTest,false,'Unbound prior TEST intent must block retry');state.orphans=false;
 state.missingWebhook=true;body=(await audit()).body;
 assert.equal(body.safeToAttemptTest,false);state.missingWebhook=false;

 resp=(await audit('plan:INVALID_SKU')).resp;assert.equal(resp.status,400);
 state.owner=false;resp=(await audit()).resp;assert.equal(resp.status,403);state.owner=true;
 const unauthorized=await api.onRequestGet({request:new Request(root+'?view=checkout-safety&sku='+expectedSku),env});assert.equal(unauthorized.status,401);

 // Provider refuses Managed Payments: leave checkout disabled and surface typed error.
 state.stripeCheckoutError='managed';
 let output=await api.onRequestPost({request:checkout(expectedSku),env});
 assert.equal(output.status,503);
 assert.equal((await output.json()).error,'STRIPE_MANAGED_PAYMENTS_NOT_AVAILABLE');
 assert.equal(state.stripeCreates,1);
 state.stripeCheckoutError='other';
 output=await api.onRequestPost({request:checkout(expectedSku),env});
 assert.equal((await output.json()).error,'STRIPE_CHECKOUT_PROVIDER_REJECTED');
 state.stripeCheckoutError=null;state.bindFails=true;
 output=await api.onRequestPost({request:checkout(expectedSku),env});
 assert.equal((await output.json()).error,'SHADOW_CHECKOUT_BIND_FAILED');
 state.bindFails=false;
 output=await api.onRequestPost({request:checkout(expectedSku),env});
 assert.equal(output.status,200,await output.clone().text());
 const result=await output.json();assert.equal(result.testOnly,true);assert.equal(result.liveCheckout,false);
 assert(result.url.startsWith('https://checkout.stripe.com/'));
 assert.equal(state.stripeCreates,4);
 assert.equal(state.intentCreates,4);
 assert(state.remoteCalls.every(x=>!/\bsite_orders\b|\buser_plan_grants\b|\bsite_subscriptions\b|\buser_tool_passes\b/.test(x.u)));
 console.log('PASS v54: 9 independent pre-payment guards, no audit writes, Managed Payments preview header, stage-specific provider/DB errors, only isolated TEST intents.');
}finally{globalThis.fetch=prior}
