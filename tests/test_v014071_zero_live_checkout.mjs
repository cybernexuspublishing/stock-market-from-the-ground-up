/* v0.14.0.71 — Owner-only LIVE zero-dollar Checkout guard. No real provider calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../functions/api/owner-zero-live-checkout.js',import.meta.url),'utf8');
const handler=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const base='https://stock-market-from-the-ground-up.pages.dev';
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_correct12345',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU58_STRIPE_LIVE_CATALOG_JSON:JSON.stringify({'plan:FULL_MONTHLY':{product_id:'prod_membershipABC',price_id:'price_membershipABC'}}),
 GU71_ZERO_LIVE_QA_ENABLED:'true',GU71_ZERO_LIVE_PRODUCT_ID:'prod_gu71Zero123',
 GU71_ZERO_LIVE_PRICE_ID:'price_gu71Zero123',PUBLIC_SITE_URL:base};
const user='11111111-1111-4111-8111-111111111111';
const state={role:'OWNER',step:true,amount:0,kind:'one_time',marked:true,wrongProduct:false,sessionAmount:0,
 method:'if_required',status:'complete',account:'acct_correct12345',stripePost:0,dbWrites:0,authCount:0};
const json=(obj,code=200)=>new Response(JSON.stringify(obj),{status:code,headers:{'content-type':'application/json'}});
const saved=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';
 if(u.endsWith('/auth/v1/user')){state.authCount++;return json({id:user})}
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return json({ok:true,role:state.role});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return json(state.step);
 if(u.includes('/rest/v1/')&&method!=='POST'&&method!=='GET')state.dbWrites++;
 if(u.endsWith('/v1/account'))return json({id:state.account});
 if(u.endsWith('/v1/products/prod_gu71Zero123'))return json({
  id:'prod_gu71Zero123',active:true,livemode:true,metadata:state.marked?{gu71_zero_qa:'true'}:{}
 });
 if(u.endsWith('/v1/prices/price_gu71Zero123'))return json({
  id:'price_gu71Zero123',product:state.wrongProduct?'prod_membershipABC':'prod_gu71Zero123',
  active:true,livemode:true,currency:'usd',unit_amount:state.amount,billing_scheme:'per_unit',
  transform_quantity:null,type:state.kind,recurring:null
 });
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  state.stripePost++;
  const x=new URLSearchParams(options.body);
  assert.equal(x.get('mode'),'payment');assert.equal(x.get('line_items[0][quantity]'),'1');
  assert.equal(x.get('line_items[0][price]'),'price_gu71Zero123');
  assert.equal(x.get('payment_method_collection'),'if_required');
  assert.equal(x.get('automatic_tax[enabled]'),'false');
  assert.equal(x.get('metadata[gu71_zero_qa]'),'true');
  assert.equal(x.get('metadata[gu71_owner]'),user);
  assert.equal(x.has('managed_payments[enabled]'),false);
  assert.equal(x.has('subscription_data[metadata][gu58_intent]'),false);
  assert.equal(x.has('metadata[gu58_intent]'),false);
  return json({id:'cs_live_qa123456',livemode:true,mode:'payment',amount_subtotal:state.sessionAmount,
   amount_total:state.sessionAmount,payment_intent:null,subscription:null,
   payment_method_collection:state.method,url:'https://checkout.stripe.com/c/pay/cs_live_qa123456'});
 }
 if(u.endsWith('/v1/checkout/sessions/cs_live_qa123456')&&method==='GET')
  return json({id:'cs_live_qa123456',livemode:true,mode:'payment',
   client_reference_id:user,metadata:{gu71_zero_qa:'true',gu71_owner:user,
    gu71_price_id:'price_gu71Zero123'},status:state.status,payment_status:'no_payment_required',
   amount_subtotal:state.sessionAmount,amount_total:state.sessionAmount,
   payment_intent:null,subscription:null});
 throw Error('Unexpected '+method+' '+u);
};
const req=(method='GET',headers={},body)=>new Request(base+'/api/owner-zero-live-checkout',{
 method,headers:{authorization:'Bearer owner-token',...headers},body
});
const get=async(e=env)=>handler.onRequestGet({request:req(),env:e});
const post=async(e=env,confirm='CREATE_ZERO_DOLLAR_LIVE_QA')=>handler.onRequestPost({
 request:req('POST',{origin:base,'content-type':'application/json'},JSON.stringify({confirm})),env:e});
try{
 let r=await handler.onRequestGet({request:new Request(base+'/api/owner-zero-live-checkout'),env});
 assert.equal(r.status,401);assert.equal(state.stripePost,0);
 state.role='MEMBER';r=await get();assert.equal(r.status,403);
 state.role='OWNER';state.step=false;r=await get();assert.equal(r.status,403);
 state.step=true;
 r=await get();assert.equal(r.status,200);let out=await r.json();
 assert.equal(out.amountCents,0);assert.equal(state.stripePost,0);
 r=await post({...env,GU71_ZERO_LIVE_QA_ENABLED:'false'});
 assert.equal(r.status,403);assert.equal(state.stripePost,0,'Flag disabled never creates session');
 r=await post({...env,GU71_ZERO_LIVE_PRICE_ID:'price_membershipABC'});
 assert.equal(r.status,503);assert.equal(state.stripePost,0,'Paid GU58 SKU forbidden');
 state.amount=1;r=await post();assert.equal(r.status,503);assert.equal(state.stripePost,0,'Any amount >0 rejected');
 state.amount=0;state.kind='recurring';r=await post();assert.equal(r.status,503);assert.equal(state.stripePost,0,'No recurring subscription');
 state.kind='one_time';state.marked=false;r=await post();assert.equal(r.status,503);
 state.marked=true;state.wrongProduct=true;r=await post();assert.equal(r.status,503);
 state.wrongProduct=false;r=await post(env,'NOT_CONFIRMED');assert.equal(r.status,400);
 r=await handler.onRequestPost({request:req('POST',{origin:'https://attacker.example','content-type':'application/json'},'{}'),env});
 assert.equal(r.status,403);
 r=await post();assert.equal(r.status,200);out=await r.json();assert.equal(out.zeroDollar,true);
 assert(out.sessionUrl.startsWith('https://checkout.stripe.com/'));
 assert.equal(state.stripePost,1);
 const inspect=()=>handler.onRequestGet({request:new Request(base+'/api/owner-zero-live-checkout?session_id=cs_live_qa123456',
 {headers:{authorization:'Bearer owner-token'}}),env});
 r=await inspect();assert.equal(r.status,200);out=await r.json();
 assert.equal(out.verifiedSafe,true);assert.equal(out.paymentStatus,'no_payment_required');
 assert.equal(out.memberEntitlementGranted,false);
 state.sessionAmount=10;r=await post();assert.equal(r.status,503,'Unexpected amount response never reveals session URL');
 r=await inspect();out=await r.json();assert.equal(out.verifiedSafe,false);
 state.sessionAmount=0;state.method='always';r=await post();assert.equal(r.status,503,'Card-required Checkout is not permitted');
 assert.equal(state.dbWrites,0);
 console.log('PASS v71: Owner step-up and explicit POST, zero one-time only, separate product metadata, no paid SKU/card/subscription/member grant, safe Stripe-hosted URL.');
}finally{globalThis.fetch=saved}
