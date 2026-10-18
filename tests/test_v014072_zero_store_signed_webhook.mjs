import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../functions/api/stripe-live-webhook-v01458.js',import.meta.url),'utf8');
const hook=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const uid='11111111-1111-4111-8111-111111111111',sid='cs_live_qa123456',price='price_qa123456';
const secret='whsec_mockzero',account='acct_mocklive1';
const env={GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED:'true',GU72_QA_ALLOWED_USER_ID:uid,
 GU71_ZERO_LIVE_PRICE_ID:price,GU71_ZERO_LIVE_PRODUCT_ID:'prod_qa123456',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',GU58_STRIPE_LIVE_ACCOUNT_ID:account,
 GU58_STRIPE_LIVE_WEBHOOK_SECRET:secret,SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',GU58_LIVE_WEBHOOK_ENABLED:'false',
 GU58_LIVE_FULFILLMENT_APPROVED:'false',GU58_LIVE_DB_CONTRACT_APPROVED:'false'};
const state={amount:0,status:'complete',payment:'no_payment_required',
 price,uuid:uid,events:0,grants:0,failGrant:false};
const J=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const orig=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';
 if(u.endsWith('/v1/account'))return J({id:account});
 if(u.endsWith('/v1/checkout/sessions/'+sid))return J({id:sid,livemode:true,
   status:state.status,mode:'payment',payment_status:state.payment,amount_total:state.amount,
   amount_subtotal:state.amount,currency:'usd',payment_intent:null,subscription:null,
   client_reference_id:state.uuid,metadata:{
    gu72_zero_monthly_qa:'true',gu72_member_id:state.uuid,gu72_price_id:price}});
 if(u.endsWith('/v1/prices/'+price))return J({id:price,product:'prod_qa123456',
   livemode:true,active:true,currency:'usd',type:'one_time',unit_amount:0});
 if(u.includes('/line_items?'))return J({data:[{price:{id:state.price},quantity:1,amount_total:0}]});
 if(u.includes('/rest/v1/rpc/gu72_signed_zero_monthly_grant')){
  assert.equal(method,'POST');state.grants++;
  const body=JSON.parse(opts.body);
  assert.equal(body.p_user_id,uid);assert.equal(body.p_session_id,sid);
  assert.equal(body.p_price_id,price);
  return state.failGrant?J({message:'SQL rpc missing'},404):J({ok:true,grantId:10,expiresAt:'2026-11-18T00:00:00Z'});
 }
 throw Error('Unexpected provider/database '+method+' '+u);
};
const event={id:'evt_live_zeroQa123456',livemode:true,type:'checkout.session.completed',
 created:Math.floor(Date.now()/1000),data:{object:{id:sid,metadata:{gu72_zero_monthly_qa:'true'}}}};
async function fire(obj=event, environment=env, invalid=false){
 const raw=JSON.stringify(obj),stamp=String(Math.floor(Date.now()/1000));
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=Buffer.from(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(stamp+'.'+raw))).toString('hex');
 return hook.onRequestPost({env:environment,request:new Request(
 'https://stock-market-from-the-ground-up.pages.dev/api/stripe-live-webhook',
 {method:'POST',body:raw,headers:{'stripe-signature':'t='+stamp+',v1='+(invalid?'0'.repeat(64):sig)}})});
}
try{
 let r=await fire();assert.equal(r.status,200);
 assert.equal(await r.text(),'qa-monthly-signed-grant-verified');assert.equal(state.grants,1);
 r=await fire(event,env,true);assert.equal(r.status,401);assert.equal(state.grants,1);
 state.amount=1;r=await fire();assert.equal(r.status,503);assert.equal(state.grants,1);
 state.amount=0;state.payment='unpaid';r=await fire();assert.equal(r.status,503);assert.equal(state.grants,1);
 state.payment='no_payment_required';state.price='price_paid1234';r=await fire();
 assert.equal(r.status,503);assert.equal(state.grants,1);
 state.price=price;
 r=await fire(event,{...env,GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED:'false'});
 assert.equal(r.status,503);assert.equal(state.grants,1);
 state.failGrant=true;r=await fire();assert.equal(r.status,503);
 assert.equal(state.grants,2,'Unavailable RPC must result in retryable status');
 console.log('PASS v72: authenticated LIVE signed checkout granted once, bad HMAC/amount/unpaid/foreign price rejected, no GU58 activation, RPC outage retried.');
}finally{globalThis.fetch=orig}
