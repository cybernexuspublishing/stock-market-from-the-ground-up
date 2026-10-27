/* v0.14.0.62 staging TEST provider-to-member mocked HTTP acceptance (no actual Stripe or Supabase). */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const load=async path=>import('data:text/javascript;base64,'+
 readFileSync(new URL('../'+path,import.meta.url)).toString('base64'));
const checkout=await load('functions/api/stripe-staging-member-checkout-v01461.js');
const webhook=await load('functions/api/stripe-staging-member-webhook-v01461.js');
const middleware=readFileSync(new URL('../functions/_middleware.js',import.meta.url),'utf8');
assert(middleware.includes("'/api/stripe-staging-member-checkout-v01461'"),'Global TESTING/LIVE boundary must cover the new POST');
const base='https://aaaaaaaaaaaaaaaaaaaa.supabase.co',origin='https://pr-62.stocks.pages.dev';
const uid='11111111-1111-4111-8111-111111111111';
const intent='22222222-2222-4222-8222-222222222222';
const mapped={ 'plan:FULL_MONTHLY':{price_id:'price_livemock00000001',product_id:'prod_live00000001'},
'plan:FULL_ANNUAL':{price_id:'price_livemock00000002',product_id:'prod_live00000002'},
'plan:LIFETIME':{price_id:'price_livemock00000003',product_id:'prod_live00000003'},
'plan:ONDEMAND_MONTHLY':{price_id:'price_livemock00000004',product_id:'prod_live00000004'},
'tool:INTERACTIVE_LEARNING':{price_id:'price_livemock00000005',product_id:'prod_live00000005'},
'tool:JOURNAL_ANALYTICS':{price_id:'price_livemock00000006',product_id:'prod_live00000006'},
'tool:MARKET_SIMULATOR':{price_id:'price_livemock00000007',product_id:'prod_live00000007'},
'tool:MARKET_TUTOR':{price_id:'price_livemock00000008',product_id:'prod_live00000008'}};
const env={SUPABASE_URL:base,SUPABASE_SECRET_KEY:'sb_secret_mock',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 GU61_STAGING_APPROVED:'true',GU61_STAGING_CHECKOUT_ENABLED:'true',
 GU61_STAGING_FULFILLMENT_APPROVED:'true',GU61_STAGING_DB_CONTRACT_APPROVED:'true',
 GU61_STAGING_WEBHOOK_ENABLED:'true',GU61_STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 GU61_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',GU61_STRIPE_TEST_ACCOUNT_ID:'acct_expectedmock',
 GU61_STAGING_ENABLED:'true',GU61_STAGING_PROJECT_REF:'aaaaaaaaaaaaaaaaaaaa',GU61_STAGING_HOSTNAME:'pr-62.stocks.pages.dev',
 GU61_STRIPE_TEST_CATALOG_JSON:JSON.stringify(mapped)};
const state={mode:true,validPrice:true,account:'acct_expectedmock',postStripe:0,dbWrites:0,postBody:null,
 intentId:intent,paid:true,invoiceStatus:'paid',expectedAction:'subscription_active',expectedCancel:false,unbound:false,bindWrites:0,expectTool:false,toolEnabled:true};
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const liveSession={id:'cs_test_mock123456',livemode:false,status:'complete',payment_status:'paid',
 url:'https://checkout.stripe.com/c/pay/cs_test_mock123456',mode:'subscription',currency:'usd',
 amount_subtotal:6999,amount_total:6999,client_reference_id:intent,
 metadata:{gu61_intent:intent,gu61_member:uid},subscription:'sub_live123456789',customer:'cus_live123456789'};
const providerSub={id:'sub_live123456789',livemode:false,status:'active',
 cancel_at_period_end:false,
 items:{data:[{price:{id:mapped['plan:FULL_MONTHLY'].price_id},current_period_end:Math.floor(Date.now()/1000)+86400}]},
 latest_invoice:'in_live123456789'};
const event={id:'evt_live123456789',livemode:false,type:'checkout.session.completed',
 created:Math.floor(Date.now()/1000),data:{object:{id:liveSession.id}}};
const prior=globalThis.fetch,priorUUID=crypto.randomUUID;
globalThis.fetch=async(url,o={})=>{
 const u=String(url),method=o.method||'GET';
 if(u.endsWith('/v1/account'))return respond({id:state.account});
 if(u.includes('/gu39_sandbox_settings?'))return respond([{enabled:state.mode}]);
 if(u.endsWith('/auth/v1/user'))return respond({id:uid,email:'test@example.com'});
 if(u.includes('/profiles?'))return respond([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?')||u.includes('/admin_user_roles?')||
   u.includes('/site_subscriptions?')||u.includes('/user_tool_passes?')||
   u.includes('/user_plan_grants?'))return respond([]);
 if(u.includes('/account_private_identity?'))return respond([{age_eligible:true,date_of_birth:'1990-01-01'}]);
 if(u.includes('/platform_plans?'))return respond([{active:true,public_visible:true,
 checkout_enabled:true,billing_interval:'month',price_cents:6999}]);
 // Owner-controlled per-tool checkout switch exists and must be honored.
 if(u.includes('/platform_tools?'))return respond([{active:true,public_visible:true,
  checkout_enabled:state.toolEnabled,status:'live',individual_price_cents:2999}]);
 if(u.includes('/rpc/gu_digital_payment_route_get_v01432r2'))return respond({enabled:true,provider:'STRIPE_MANAGED'});
 if(u.includes('/site_settings?'))return respond([{value:true}]);
 if(u.endsWith('/v1/prices/'+mapped['plan:FULL_MONTHLY'].price_id))
  return respond({id:mapped['plan:FULL_MONTHLY'].price_id,
   product:state.validPrice?mapped['plan:FULL_MONTHLY'].product_id:'prod_wrong00000000',
   currency:'usd',active:true,livemode:false,unit_amount:6999,
   type:'recurring',recurring:{interval:'month'}});
 if(u.endsWith('/v1/prices/'+mapped['tool:INTERACTIVE_LEARNING'].price_id))
  return respond({id:mapped['tool:INTERACTIVE_LEARNING'].price_id,
   product:mapped['tool:INTERACTIVE_LEARNING'].product_id,
   currency:'usd',active:true,livemode:false,unit_amount:2999,
   type:'recurring',recurring:{interval:'month'}});
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  state.postStripe++;const body=new URLSearchParams(o.body);
  assert.equal(body.get('metadata[gu61_intent]'),intent);
  assert.equal(body.get('metadata[gu61_member]'),uid);
  if(state.expectTool)
    assert.equal(body.get('line_items[0][price]'),mapped['tool:INTERACTIVE_LEARNING'].price_id);
  assert.equal(o.headers['Stripe-Version'],'2026-02-25.preview');
  return respond(liveSession);
 }
 if(u.includes('/gu61_staging_checkout_intents')&&method==='POST'){
  state.dbWrites++;state.postBody=JSON.parse(o.body);assert.equal(state.postBody.id,intent);return respond([state.postBody]);
 }
 if(u.includes('/gu61_staging_checkout_intents')&&method==='PATCH'){
  state.dbWrites++;return new Response(null,{status:204});
 }
 if(u.includes('/gu61_staging_checkout_intents')&&method==='GET'){
  return respond([{id:intent,user_id:uid,price_id:mapped['plan:FULL_MONTHLY'].price_id,
    quoted_amount_cents:6999,stripe_session_id:state.unbound?null:liveSession.id,status:state.unbound?'prepared':'checkout_created'}]);
 }
 if(u.endsWith('/v1/checkout/sessions/'+liveSession.id))return respond(liveSession);
 if(u.includes('/v1/checkout/sessions/'+liveSession.id+'/line_items'))return respond({data:[{
  price:{id:mapped['plan:FULL_MONTHLY'].price_id},quantity:1}]});
 if(u.endsWith('/v1/subscriptions/'+providerSub.id))return respond(providerSub);
 if(u.endsWith('/v1/invoices/in_live123456789'))return respond({id:'in_live123456789',
  status:state.invoiceStatus,subscription:providerSub.id,amount_paid:state.invoiceStatus==='paid'?6999:0});
 if(u.includes('/rpc/gu61_staging_bind_verified_checkout')){
  const b=JSON.parse(o.body);assert.equal(b.p_intent_id,intent);
  assert.equal(b.p_user_id,uid);assert.equal(b.p_session_id,liveSession.id);
  assert.equal(b.p_price_id,mapped['plan:FULL_MONTHLY'].price_id);
  assert.equal(b.p_expected_cents,6999);
  state.bindWrites++;state.unbound=false;return respond({ok:true,bound:true});
 }
 if(u.includes('/rpc/gu61_staging_stripe_apply_event')){
  const b=JSON.parse(o.body);
  assert.equal(b.p_action,state.expectedAction);
  assert.equal(b.p_price_id,mapped['plan:FULL_MONTHLY'].price_id);
  assert.equal(b.p_cancel_at_period_end,state.expectedCancel);
  if(state.expectedAction==='subscription_active'&&b.p_session_id)
   assert.equal(b.p_session_id,liveSession.id);
  state.dbWrites++;return respond({ok:true});
 }
 if(u.endsWith('/v1/charges/ch_live123456789'))return respond({id:'ch_live123456789',
   livemode:false,currency:'usd',amount:6999,amount_refunded:6999,
   invoice:'in_live123456789',payment_intent:'pi_live123456789'});
 if(u.endsWith('/v1/payment_intents/pi_live123456789'))
  return respond({id:'pi_live123456789',livemode:false});
 throw Error('Unexpected '+method+' '+u);
};
async function pay(overrides={},sku={type:'plan',code:'FULL_MONTHLY'}){
 const e={...env,...overrides};
 return checkout.onRequestPost({env:e,request:new Request(origin+'/api/stripe-staging-member-checkout-v01461',{
 method:'POST',headers:{authorization:'Bearer jwt',origin,'content-type':'application/json'},
 body:JSON.stringify(sku)})});
}
async function send(hmacValid=true,eventOverride=null,overrides={}){
 const x=eventOverride||event,body=JSON.stringify(x),ts=String(Math.floor(Date.now()/1000));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.GU61_STRIPE_TEST_WEBHOOK_SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,
 new TextEncoder().encode(ts+'.'+body))),b=>b.toString(16).padStart(2,'0')).join('');
 return webhook.onRequestPost({env:{...env,...overrides},request:new Request(origin+'/api/stripe-staging-member-webhook-v01461',
 {method:'POST',headers:{'stripe-signature':'t='+ts+',v1='+(hmacValid?sig:'0'.repeat(64))},body})});
}
try{
 let r=await pay({GU61_STAGING_CHECKOUT_ENABLED:'false'});
 assert.equal(r.status,503);assert.equal(state.postStripe,0);assert.equal(state.dbWrites,0);
 r=await pay({GU61_STAGING_APPROVED:'false'});assert.equal(r.status,503);
 r=await pay({GU61_STRIPE_TEST_SECRET_KEY:'sk_live_bad'});assert.equal(r.status,503);
 r=await pay({GU61_STRIPE_TEST_CATALOG_JSON:'{}'});assert.equal(r.status,503);
 assert.equal(state.postStripe,0);
 state.mode=false;r=await pay();assert.equal(r.status,503);assert.equal(state.postStripe,0);
 state.mode=true;state.account='acct_other999999';r=await pay();assert.equal(r.status,503);assert.equal(state.postStripe,0);
 state.account='acct_expectedmock';state.validPrice=false;r=await pay();assert.equal(r.status,503);
 assert.equal(state.postStripe,0);
 state.validPrice=true;
 const orig=crypto.randomUUID;
 crypto.randomUUID=()=>intent;
 r=await pay();crypto.randomUUID=orig;
 assert.equal(r.status,200,await r.clone().text());
 const checkoutData=await r.json();assert.equal(checkoutData.sandboxOnly,true);assert.equal(checkoutData.live,false);
 assert.equal(state.postStripe,1);assert.equal(state.dbWrites,2);
 r=await send(false);assert.equal(r.status,401);assert.equal(state.dbWrites,2);
 r=await send(true,{...event,livemode:true});assert.equal(r.status,400);
 r=await send(true,{...event,account:'acct_stranger000'});assert.equal(r.status,400);
 r=await send(true,null,{GU61_STAGING_WEBHOOK_ENABLED:'false'});assert.equal(r.status,503);
 assert.equal(state.dbWrites,2);
 r=await send();assert.equal(r.status,200,await r.clone().text());
 assert.equal(state.dbWrites,3);
 // Signed cancel-at-period-end preserves paid access until period end.
 providerSub.cancel_at_period_end=true;state.expectedCancel=true;
 let ev={...event,id:'evt_liveupdated123',type:'customer.subscription.updated',
   data:{object:{id:providerSub.id}}};
 r=await send(true,ev);assert.equal(r.status,200,(await r.clone().text()));
 // Failed newest invoice must not be misclassified as paid.
 state.invoiceStatus='open';state.expectedAction='subscription_past_due';
 providerSub.status='past_due';state.expectedCancel=false;providerSub.cancel_at_period_end=false;
 ev={...event,id:'evt_livefailure123',type:'invoice.payment_failed',
   data:{object:{id:'in_live123456789'}}};
 r=await send(true,ev);assert.equal(r.status,200,(await r.clone().text()));
 // Cancellation from provider is a different lifecycle action than scheduled cancel.
 providerSub.status='canceled';state.expectedAction='subscription_canceled';
 ev={...event,id:'evt_livecancel123',type:'customer.subscription.deleted',
   data:{object:{id:providerSub.id}}};
 r=await send(true,ev);assert.equal(r.status,200,(await r.clone().text()));
 // Full refund/dispute operate on verified charge and current invoice only.
 providerSub.status='active';state.invoiceStatus='paid';
 state.expectedAction='subscription_refunded';
 ev={...event,id:'evt_liverefund123',type:'charge.refunded',
   data:{object:{id:'ch_live123456789'}}};
 r=await send(true,ev);assert.equal(r.status,200,(await r.clone().text()));
 state.expectedAction='subscription_disputed';
 ev={...event,id:'evt_livedispute123',type:'charge.dispute.created',
   data:{object:{id:'dp_live123456789',charge:'ch_live123456789'}}};
 r=await send(true,ev);assert.equal(r.status,200,(await r.clone().text()));
 assert.equal(state.dbWrites,8);
 // Stripe-created session lost its PostgREST PATCH: authenticated original webhook
 // recovers this exact intent in the service-only RPC, no second checkout.
 state.unbound=true;state.expectedAction='subscription_active';
 ev={...event,id:'evt_liverecover123',type:'checkout.session.completed'};
 r=await send(true,ev);assert.equal(r.status,200,(await r.clone().text()));
 assert.equal(state.bindWrites,1);
 assert.equal(state.postStripe,1);
 assert.equal(state.dbWrites,9);
 // Verify the tool checkout path does not rely on a nonexistent checkout_enabled
 // column in platform_tools. All other Owner and provider gates remain active.
 state.expectTool=true;
 state.toolEnabled=false;
 r=await pay({}, {type:'tool',code:'INTERACTIVE_LEARNING'});
 assert.equal(r.status,403,'Disabled individual tool cannot create TEST checkout');
 assert.equal(state.postStripe,1,'Disabled tool cannot contact Stripe to charge');
 state.toolEnabled=true;
 crypto.randomUUID=()=>intent;
 r=await pay({}, {type:'tool',code:'INTERACTIVE_LEARNING'});
 crypto.randomUUID=orig;
 assert.equal(r.status,200,await r.clone().text());
 assert.equal(state.postStripe,2);
 assert.equal(state.dbWrites,11);
 assert.equal(state.postBody.sku_kind,'tool');
 assert.equal(state.postBody.quoted_amount_cents,2999);
 console.log('PASS v62: staging TEST-mode Checkout + signed webhook + bound-member lifecycle via actual handlers, mocked provider and DB.');
}finally{globalThis.fetch=prior;crypto.randomUUID=priorUUID}
