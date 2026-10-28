/* v0.14.0.140 — independent checkout duplicate/recovery tests.
 * ALL Stripe/Supabase replies simulated; no network or real financial action.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const js=readFileSync(new URL('../functions/api/stripe-live-checkout-v01458.js',import.meta.url),'utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const origin='https://site.example';
const base='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const uid='11111111-1111-4111-8111-111111111111';
const intent='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const price='price_mock_live0000123456';
const product='prod_mock_live0000123456';
const mapping=Object.fromEntries([
 'plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY',
 'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR'
].map((s,i)=>[s,{price_id:i===0?price:'price_live_mock'+i,
 product_id:i===0?product:'prod_live_mock'+i}]));
const env={
 SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',
 SUPABASE_SECRET_KEY:'sb_secret_fake',
 GU_PAYMENT_LIVE_LAUNCH_APPROVED:'true',GU58_LIVE_CHECKOUT_ENABLED:'true',
 GU58_LIVE_WEBHOOK_ENABLED:'true',GU58_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_LIVE_DB_CONTRACT_APPROVED:'true',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_fake',
 GU58_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_fake',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mocklive1234567',
 GU58_STRIPE_LIVE_CATALOG_JSON:JSON.stringify(mapping)
};
const fresh=()=>new Date(Date.now()-1000).toISOString();
const state={pending:null,created:0,postStripe:0,providerReads:0,patched:0,
 insertRace:false,failPatch:false,zeroPatch:false,invalidLinePrice:false,invalidProvider:false,alreadyPaid:false,
 expired:false,unknownStatus:false,sessionId:'cs_live_mocksecure12345',key:null,
 postIntent:null,firstKey:null,sessionBody:null,lastAuth:null};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const session=()=>{
 const t={id:state.sessionId,livemode:true,status:state.alreadyPaid?'complete':'open',
  payment_status:state.alreadyPaid?'paid':'unpaid',
  expires_at:Math.floor(Date.now()/1000)+(state.expired?-60:1800),
  url:'https://checkout.stripe.com/c/pay/'+state.sessionId,
  currency:'usd',mode:'subscription',amount_subtotal:6999,
  client_reference_id:state.pending?.id||intent,
  metadata:{gu58_intent:state.pending?.id||intent,gu58_member:uid}};
 if(state.invalidProvider)t.metadata.gu58_member=other;
 return t;
};
const savedFetch=globalThis.fetch,savedUUID=crypto.randomUUID;
crypto.randomUUID=()=>intent;
globalThis.fetch=async(url,options={})=>{
 const s=String(url),method=options.method||'GET';
 assert(s.startsWith(base+'/')||s.startsWith('https://api.stripe.com/'),
  'Unapproved external endpoint '+s);
 if(s.endsWith('/auth/v1/user')){state.lastAuth=options.headers.authorization;return json({id:uid})}
 if(s.includes('/rpc/gu_founder_discount_eligibility_v014221'))return json({ok:true,eligible:false,discountBps:0});
 if(s.endsWith('/v1/account'))return json({id:env.GU58_STRIPE_LIVE_ACCOUNT_ID});
 if(s.includes('/gu39_sandbox_settings?'))return json([{enabled:false}]);
 if(s.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(s.includes('/admin_user_flags?')||s.includes('/admin_user_roles?'))return json([]);
 if(s.includes('/account_private_identity?'))return json([{age_eligible:true,date_of_birth:'1990-01-01'}]);
 if(s.includes('/gu_storefront_items_v014174?'))return json([{visible:true,sale_ready:true,status:'for_sale'}]);
 if(s.includes('/platform_plans?'))return json([{active:true,public_visible:true,
  checkout_enabled:true,price_cents:6999,billing_interval:'month',name:'Full Platform Monthly'}]);
 if(s.includes('/site_subscriptions?')||s.includes('/user_tool_passes?')||s.includes('/user_plan_grants?'))return json([]);
 if(s.includes('/rpc/gu_digital_payment_route_get_v01432r2'))return json({provider:'STRIPE_MANAGED',enabled:true});
 if(s.includes('/site_settings?'))return json([{value:true}]);
 if(s.endsWith('/v1/prices/'+price))return json({id:price,product,currency:'usd',unit_amount:6999,
  active:true,livemode:true,billing_scheme:'per_unit',transform_quantity:null,
  type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}});
 if(s.includes('/gu58_live_checkout_intents?')&&method==='GET'){
  const q=new URL(s).searchParams;
  if(q.get('status')!=='in.(prepared,checkout_created)')throw Error('Unexpected ledger read');
  assert.equal(q.get('user_id'),'eq.'+uid);assert.equal(q.get('sku_kind'),'eq.plan');
  assert.equal(q.get('sku_code'),'eq.FULL_MONTHLY');
  return json(state.pending?[state.pending]:[]);
 }
 if(s.endsWith('/gu58_live_checkout_intents')&&method==='POST'){
  state.created++;
  const row=JSON.parse(options.body);
  assert.equal(row.user_id,uid);assert.equal(row.id,intent);
  if(state.insertRace){
   state.pending={...row,id:other,created_at:fresh(),currency:'usd',status:'prepared',stripe_session_id:null};
   return json({code:'23505',message:'duplicate index'},409);
  }
  assert.equal(state.pending,null,'DB unique reservation prevents two in-flight rows');
  state.pending={...row,created_at:fresh(),currency:'usd',stripe_session_id:null};
  return json([row],201);
 }
 if(s.includes('/gu58_live_checkout_intents?')&&method==='PATCH'){
  state.patched++;
  assert(s.includes('status=eq.prepared'),'Bind must use status compare-and-set');
  assert(s.includes('stripe_session_id=is.null'),'Bind must reject already-bound session');
  if(state.failPatch)return json({code:'PGRST503'},503);
  if(state.zeroPatch)return json([]);
  assert.equal(options.headers.prefer,'return=representation');
  state.pending={...state.pending,stripe_session_id:JSON.parse(options.body).stripe_session_id,
   status:'checkout_created'};
  return json([state.pending]);
 }
 if(s.endsWith('/v1/checkout/sessions')&&method==='POST'){
  state.postStripe++;
  state.key=options.headers['Idempotency-Key'];
  const body=new URLSearchParams(options.body);
  state.sessionBody=body.toString();
  assert.equal(state.key,'gu58-live-'+(state.pending?.id||intent));
  assert.equal(body.get('client_reference_id'),state.pending?.id||intent);
  assert.equal(body.get('managed_payments[enabled]'),'true');
  assert.equal(body.get('line_items[0][price]'),price);
  assert.equal(body.get('metadata[gu58_member]'),uid);
  if(state.firstKey){assert.equal(state.key,state.firstKey)}
  else state.firstKey=state.key;
  return json(session());
 }
 if(s.includes('/v1/checkout/sessions/'+state.sessionId+'/line_items?')){
  state.providerReads++;
  assert.equal(method,'GET');
  return json({data:[{price:{id:state.invalidLinePrice?'price_wrong':price},quantity:1}],has_more:false});
 }
 if(s.endsWith('/v1/checkout/sessions/'+state.sessionId)){
  state.providerReads++;
  assert.equal(method,'GET');
  return json(session());
 }
 throw Error('Unexpected external operation '+method+' '+s);
};
const pay=async(e=env,hasAuth=true)=>onRequestPost({env:e,request:new Request(origin+'/api/stripe-live-checkout',{
 method:'POST',headers:{origin,...(hasAuth?{authorization:'Bearer fake-member-token'}:{})},
 body:JSON.stringify({type:'plan',code:'FULL_MONTHLY'})})});
const reset=()=>Object.assign(state,{pending:null,created:0,postStripe:0,providerReads:0,
 patched:0,insertRace:false,failPatch:false,zeroPatch:false,invalidLinePrice:false,invalidProvider:false,
 alreadyPaid:false,expired:false,unknownStatus:false,key:null,postIntent:null,
 firstKey:null,sessionBody:null});
// A guessed direct checkout URL is not authority to buy a hidden SKU.
// Product publication and the independent storefront release flag are checked on every attempt.
const row=(status='prepared',extra={})=>({id:intent,user_id:uid,sku_kind:'plan',
 sku_code:'FULL_MONTHLY',price_id:price,quoted_amount_cents:6999,currency:'usd',
 stripe_session_id:status==='checkout_created'?state.sessionId:null,
 created_at:fresh(),status,...extra});
try{
 // Initial paid Checkout Session creation is still only a simulated provider call.
 reset();let res=await pay(),answer=await res.json();
 assert.equal(res.status,200);assert.equal(answer.live,true);
 assert.equal(state.created,1);assert.equal(state.postStripe,1);assert.equal(state.patched,1);
 assert.equal(state.pending.status,'checkout_created');assert.equal(state.providerReads,0);
 assert.equal(answer.url,'https://checkout.stripe.com/c/pay/'+state.sessionId);
 assert.equal(state.lastAuth,'Bearer fake-member-token');

 // Re-entering checkout with the same member/SKU must reuse the existing
 // Stripe Session when still open, not create a second paid Checkout Session.
 res=await pay();assert.equal(res.status,200);
 assert.equal(state.created,1);assert.equal(state.postStripe,1);
 assert.equal(state.providerReads,2);assert.equal(state.patched,1);

 // An orphaned prepared reservation can be retried ONLY with the same
 // immutable intent, idempotency key and Stripe request parameter bytes.
 reset();state.failPatch=true;
 res=await pay();assert.equal(res.status,503);
 assert.equal(state.pending.status,'prepared');
 const initialBody=state.sessionBody,key=state.key;
 state.failPatch=false;res=await pay();
 assert.equal(res.status,200);
 assert.equal(state.created,1);
 assert.equal(state.postStripe,2,'Provider replay is allowed ONLY on same key');
 assert.equal(state.sessionBody,initialBody);
 assert.equal(state.key,key);
 assert.equal(state.patched,2);
 assert.equal(state.pending.status,'checkout_created');

 // A conditional PATCH that returns 200 but updates ZERO rows is not proof
 // that a Stripe Session is safely bound to the unique reservation.
 reset();state.zeroPatch=true;res=await pay();
 assert.equal(res.status,503);
 assert.equal(state.pending.status,'prepared');
 assert.equal(state.created,1);assert.equal(state.postStripe,1);
 state.zeroPatch=false;res=await pay();
 assert.equal(res.status,200);
 assert.equal(state.created,1);assert.equal(state.postStripe,2);
 assert.equal(state.pending.status,'checkout_created');

 // Existing signed binding cannot be reused if Stripe's line items no longer
 // contain exactly one unit of the approved LIVE Price.
 reset();state.pending=row('checkout_created');state.invalidLinePrice=true;
 res=await pay();assert.equal(res.status,503);
 assert.equal(state.postStripe,0);assert.equal(state.created,0);
 assert.equal(state.providerReads,2);
 // Database-level race rejects the losing request without a provider POST.
 reset();state.insertRace=true;res=await pay();assert.equal(res.status,409);
 assert.equal(state.postStripe,0);assert.equal(state.created,1);
 assert.equal(state.patched,0);

 // A previously made checkout must be rejected when paid, expired or altered.
 for(const [label,setup] of [
  ['paid',()=>{state.pending=row('checkout_created');state.alreadyPaid=true}],
  ['expired',()=>{state.pending=row('checkout_created');state.expired=true}],
  ['wrong member provider proof',()=>{state.pending=row('checkout_created');state.invalidProvider=true}],
  ['stale prepared record',()=>{state.pending=row('prepared',{created_at:new Date(Date.now()-3600e3).toISOString()})}],
  ['mismatched stored price',()=>{state.pending=row('prepared',{quoted_amount_cents:1})}],
  ['missing verified created_at',()=>{state.pending=row('prepared',{created_at:null})}]
 ]){
  reset();setup();
  const prev=state.postStripe;
  res=await pay();
  assert([409,503].includes(res.status),label+' must fail closed');
  assert.equal(state.created,0,label+' must not create new DB intent');
  assert.equal(state.postStripe,prev,label+' must not create Stripe session');
 }
 reset();res=await pay(env,false);assert.equal(res.status,401);
 assert.equal(state.postStripe,0);assert.equal(state.created,0);
 reset();res=await pay({...env,GU58_LIVE_CHECKOUT_ENABLED:'false'});
 assert.equal(res.status,503);assert.equal(state.postStripe,0);
 assert.equal(state.created,0);
 console.log('PASS v140: DB unique race, same-member session reuse, prepared idempotent replay after lost PATCH, stale/paid/invalid proof fail closed, no charges');
}finally{globalThis.fetch=savedFetch;crypto.randomUUID=savedUUID}
