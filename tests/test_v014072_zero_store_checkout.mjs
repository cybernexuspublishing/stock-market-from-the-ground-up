import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../functions/api/store-zero-monthly-qa.js',import.meta.url),'utf8');
const app=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const origin='https://stock-market-from-the-ground-up.pages.dev',uid='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mocklive1',
 GU58_STRIPE_LIVE_CATALOG_JSON:'{"plan:FULL_MONTHLY":{"product_id":"prod_paid12345","price_id":"price_paid12345"}}',
 GU71_ZERO_LIVE_PRICE_ID:'price_qa123456',GU71_ZERO_LIVE_PRODUCT_ID:'prod_qa123456',
 GU72_QA_ALLOWED_USER_ID:uid,GU72_ZERO_MONTHLY_QA_ENABLED:'true',
 GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED:'true',
 GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED:'true',PUBLIC_SITE_URL:origin};
const state={id:uid,plan:'FREE',used:false,price:0,kind:'one_time',sent:0,dbWrites:0,idempotencyKeys:[],
 sessionAmount:0,good:0,restricted:false};
const J=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';
 if(u.includes('/auth/v1/user'))return J({id:state.id,email_confirmed_at:'2026-10-18T00:00:00Z'});
 if(u.includes('/rpc/my_platform_access_for_user'))return J({planCode:state.plan});
 if(u.includes('/rpc/gu76_reset_zero_monthly_qa')){
   assert.equal(method,'POST');
   assert.equal(JSON.parse(opts.body).p_user_id,uid);
   if(!state.used)return J({ok:true,resetCount:0});
   state.used=false;state.plan='FREE';
   return J({ok:true,resetCount:1,paidGrantsUnaffected:true});
 }
 if(u.includes('user_plan_grants?'))return J(state.used?[{ends_at:'2099-11-18T00:00:00Z',status:'active',source_reference:'cs_live_qa123456'}]:[]);
 if(u.includes('profiles?'))return J([{account_kind:'member'}]);
 if(u.includes('admin_user_flags?'))return J([]);
 if(u.includes('account_private_identity?'))return J([{age_eligible:true,date_of_birth:'1990-01-01'}]);
 if(u.endsWith('/v1/account'))return J({id:'acct_mocklive1'});
 if(u.includes('/v1/products/prod_qa123456'))return J({id:'prod_qa123456',name:'Live Test',active:true,livemode:true});
 if(u.includes('/v1/prices/price_qa123456'))return J({id:'price_qa123456',product:'prod_qa123456',
   active:true,livemode:true,unit_amount:state.price,currency:'usd',type:state.kind,
   recurring:null,billing_scheme:'per_unit',transform_quantity:null});
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  state.sent++;state.idempotencyKeys.push(opts.headers['Idempotency-Key']);
  const p=new URLSearchParams(opts.body);
  assert.equal(p.get('mode'),'payment');assert.equal(p.get('line_items[0][price]'),'price_qa123456');
  assert.equal(p.has('payment_method_collection'),false,'Unsupported payment mode option forbidden');
  assert.equal(p.get('metadata[gu72_member_id]'),uid);
  assert.equal(p.has('metadata[gu58_intent]'),false);
  return J({id:'cs_live_qa123456',livemode:true,amount_total:state.sessionAmount,
   amount_subtotal:state.sessionAmount,mode:'payment',payment_intent:null,subscription:null,
   client_reference_id:uid,metadata:{gu72_zero_monthly_qa:'true'},
   url:'https://checkout.stripe.com/c/pay/cs_live_qa123456'});
 }
 if(u.includes('/v1/checkout/sessions/cs_live_qa123456'))return J({
  id:'cs_live_qa123456',client_reference_id:uid,
  metadata:{gu72_zero_monthly_qa:'true',gu72_member_id:uid,gu72_price_id:'price_qa123456'},
  status:'complete'
 });
 if(method!=='GET'&&!u.includes('/rpc/'))state.dbWrites++;
 throw Error('Unexpected request '+method+' '+u);
};
const req=(method='GET',path='',originHeader=origin)=>{
 const headers={authorization:'Bearer test_jwt',...(method==='POST'?{origin:originHeader,'content-type':'application/json'}:{})};
 const data=path.includes('action=reset')?{confirm:'RESET_MY_ZERO_MONTHLY_QA_ACCESS'}:
   {confirm:'ONE_TIME_ZERO_MONTHLY_QA',checkoutAttemptId:state.nextAttempt||'11111111-2222-4333-8444-555555555555'};
 return new Request(origin+'/api/store-zero-monthly-qa'+path,{method,headers,
  ...(method==='POST'?{body:JSON.stringify(data)}:{})});
};
try{
 // Public sales are default-OFF irrespective of older Cloudflare QA flags.
 let previousRequests=state.sent;
 let retired=await app.onRequestGet({request:req(),env:{...env,GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED:undefined}});
 let retiredData=await retired.json();
 assert.equal(retired.status,200);assert.equal(retiredData.available,false);
 assert.equal(retiredData.offerClosed,true);
 let rejected=await app.onRequestPost({request:req('POST'),env:{...env,GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED:undefined}});
 assert.equal(rejected.status,410);
 assert.equal((await rejected.json()).error,'QA_OFFER_CLOSED');
 rejected=await app.onRequestPost({request:req('POST','?action=reset'),env:{...env,GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED:'false'}});
 assert.equal(rejected.status,410);
 assert.equal(state.sent,previousRequests,'Retired QA must never create any new Stripe session');
 // Separately reauthorized QA still exercises the original anti-fraud contract.
 let r=await app.onRequestGet({request:req(),env}),j=await r.json();
 assert.equal(r.status,200);assert.equal(j.available,true);assert.equal(j.amountCents,0);
 state.id='22222222-2222-4222-8222-222222222222';
 r=await app.onRequestGet({request:req(),env});assert.equal(r.status,403);
 state.id=uid;state.plan='FULL_MONTHLY';
 r=await app.onRequestPost({request:req('POST'),env});assert.equal(r.status,409);
 state.plan='FREE';state.used=true;
 r=await app.onRequestPost({request:req('POST'),env});assert.equal(r.status,409);
 state.used=false;state.price=100;
 r=await app.onRequestPost({request:req('POST'),env});assert.equal(r.status,503);
 assert.equal(state.sent,0);
 state.price=0;state.kind='recurring';
 r=await app.onRequestPost({request:req('POST'),env});assert.equal(r.status,503);
 state.kind='one_time';
 r=await app.onRequestPost({request:req('POST','', 'https://evil.example'),env});
 assert.equal(r.status,403);
 r=await app.onRequestPost({request:req('POST'),env:{...env,GU72_ZERO_MONTHLY_QA_ENABLED:'false'}});
 assert.equal(r.status,403);
 r=await app.onRequestPost({request:req('POST'),env});
 j=await r.json();assert.equal(r.status,200);assert.equal(j.amountCents,0);assert.equal(state.sent,1);
 state.sessionAmount=5;r=await app.onRequestPost({request:req('POST'),env});
 assert.equal(r.status,503,'Nonzero provider response must never be offered');
 state.sessionAmount=0;state.plan='FULL_MONTHLY';state.used=true;
 r=await app.onRequestGet({request:req('GET','?session_id=cs_live_qa123456'),env});
 j=await r.json();assert.equal(j.activated,true);assert.equal(j.canReset,true);
 r=await app.onRequestGet({request:req(),env});j=await r.json();
 assert.equal(j.canReset,true);assert.equal(j.available,false,'No new checkout while QA grant is active');
 const badReset=req('POST','?action=reset','https://evil.example');
 r=await app.onRequestPost({request:badReset,env});assert.equal(r.status,403);
 const resetDenied=await app.onRequestPost({request:req('POST','?action=reset'),env:{...env,GU72_ZERO_MONTHLY_QA_ENABLED:'false'}});
 assert.equal(resetDenied.status,403,'Reset forbidden when QA is switched off');
 r=await app.onRequestPost({request:req('POST','?action=reset'),env});
 j=await r.json();assert.equal(r.status,200);assert.equal(j.reset,true);assert.equal(state.plan,'FREE');
 assert.equal(state.used,false,'Reset revokes only active QA grant');
 r=await app.onRequestGet({request:req(),env});j=await r.json();
 assert.equal(j.available,true,'Same UUID eligible again after its QA grant reset');
 state.nextAttempt='22222222-3333-4444-8555-666666666666';
 r=await app.onRequestPost({request:req('POST'),env});j=await r.json();
 assert.equal(r.status,200);assert.equal(j.amountCents,0);
 assert.ok(state.idempotencyKeys.length>=3);
 assert.notEqual(state.idempotencyKeys[0],state.idempotencyKeys.at(-1),
  'Each distinct deliberate same-account test must use a different Stripe idempotency key');
 assert.equal(state.dbWrites,0,'No direct customer writes outside service-only QA RPC');
 console.log('PASS v76: same FREE member can explicitly reset QA grant and repeat $0 checkout with distinct idempotency; paid plans unchanged, unsafe and unauthorized actions blocked.');
}finally{globalThis.fetch=original}
