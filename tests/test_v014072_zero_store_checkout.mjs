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
 GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED:'true',PUBLIC_SITE_URL:origin};
const state={id:uid,plan:'FREE',used:false,price:0,kind:'one_time',sent:0,dbWrites:0,
 sessionAmount:0,good:0,restricted:false};
const J=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';
 if(u.includes('/auth/v1/user'))return J({id:state.id,email_confirmed_at:'2026-10-18T00:00:00Z'});
 if(u.includes('/rpc/my_platform_access_for_user'))return J({planCode:state.plan});
 if(u.includes('user_plan_grants?'))return J(state.used?[{ends_at:'2026-11-18T00:00:00Z',source_reference:'cs_live_qa123456'}]:[]);
 if(u.includes('profiles?'))return J([{account_kind:'member'}]);
 if(u.includes('admin_user_flags?'))return J([]);
 if(u.endsWith('/v1/account'))return J({id:'acct_mocklive1'});
 if(u.includes('/v1/products/prod_qa123456'))return J({id:'prod_qa123456',active:true,livemode:true});
 if(u.includes('/v1/prices/price_qa123456'))return J({id:'price_qa123456',product:'prod_qa123456',
   active:true,livemode:true,unit_amount:state.price,currency:'usd',type:state.kind,
   recurring:null,billing_scheme:'per_unit',transform_quantity:null});
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  state.sent++;const p=new URLSearchParams(opts.body);
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
 return new Request(origin+'/api/store-zero-monthly-qa'+path,{method,headers,
  ...(method==='POST'?{body:'{"confirm":"ONE_TIME_ZERO_MONTHLY_QA"}'}:{})});
};
try{
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
 j=await r.json();assert.equal(j.activated,true);assert.equal(j.planCode,'FULL_MONTHLY');
 assert.equal(state.dbWrites,0);
 console.log('PASS v72: one allowlisted FREE member, store-only zero dollar Checkout, no card, GU58 or recurring, signed grant reflected in access and no unauthorised writes.');
}finally{globalThis.fetch=original}
