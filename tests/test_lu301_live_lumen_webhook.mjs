/* LU301 purchased-Lumens LIVE webhook provider verification.
 * ALL Stripe and Supabase network calls are intercepted; no real charges, credits,
 * refunds, or real wallet mutation. Exercises the canonical signed handler.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const text=readFileSync('functions/api/stripe-live-webhook-v01458.js','utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
const id='22222222-2222-4222-8222-222222222222';
const uid='11111111-1111-4111-8111-111111111111';
const session='cs_live_LU301MOCKabcdef123';
const pi='pi_LU301MOCKabcdef123';
const charge='ch_LU301MOCKabcdef123';
const price='price_LU301MOCKabcdef123';
const product='prod_LU301MOCKabcdef123';
const acct='acct_LU301MOCKabcdef123';
const secret='whsec_LU301MockSecret123';
const metadata={gu_lumen_live_id:id,gu_lumen_live_user:uid,gu_lumen_live_sku:'SPARKS_25'};
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_LIVE_WEBHOOK_ENABLED:'true',GU58_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_LIVE_DB_CONTRACT_APPROVED:'true',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU301_STRIPE_LIVE_SIGNING_SECRET:secret,STRIPE_LIVE_ACCOUNT_ID:acct};
const state={price,refund:false,partial:false,account:acct,actions:[],outbound:0};
const order={id,user_id:uid,request_id:'44444444-4444-4444-8444-444444444444',sku:'SPARKS_25',
 quantity:25,amount_cents:500,stripe_product_id:product,stripe_price_id:price,
 stripe_session_id:session,stripe_payment_intent_id:null,status:'bound'};
const sessionObject={id:session,livemode:true,status:'complete',payment_status:'paid',
 mode:'payment',currency:'usd',amount_subtotal:500,amount_total:500,client_reference_id:id,
 payment_intent:pi,metadata};
const payment={id:pi,livemode:true,status:'succeeded',currency:'usd',amount_received:500,
 latest_charge:charge,metadata};
const currentCharge={id:charge,livemode:true,payment_intent:pi,amount:500,
 amount_refunded:500,refunded:true,invoice:null};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const previousFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const path=String(url);state.outbound++;
 if(path.endsWith('/v1/account'))return json({id:state.account});
 if(path.endsWith('/v1/checkout/sessions/'+session))return json(sessionObject);
 if(path.endsWith('/v1/checkout/sessions/'+session+'/line_items?limit=2'))
  return json({data:[{price:{id:state.price,product},quantity:1,amount_subtotal:500}],has_more:false});
 if(path.endsWith('/v1/prices/'+price))return json({id:price,product,livemode:true,
  currency:'usd',type:'one_time',unit_amount:500});
 if(path.endsWith('/v1/products/'+product))return json({id:product,livemode:true,active:true});
 if(path.endsWith('/v1/payment_intents/'+pi))return json(payment);
 if(path.endsWith('/v1/charges/'+charge))return json({...currentCharge,amount_refunded:state.partial?200:500});
 if(path.includes('/rest/v1/gu_lumen_live_orders_v1?'))return json([{...order,
  status:state.refund?'paid':order.status,stripe_payment_intent_id:state.refund?pi:order.stripe_payment_intent_id}]);
 if(path.endsWith('/rest/v1/rpc/gu_lumen_live_apply_v1')){
  const body=JSON.parse(options.body);
  state.actions.push(body);
  if(body.p_kind==='paid'){
   assert.equal(body.p_session,session);assert.equal(body.p_pi,pi);
   assert.equal(body.p_amount,500);order.status='paid';order.stripe_payment_intent_id=pi;
  }
  if(body.p_kind==='refunded'){
   assert.equal(body.p_session,session);assert.equal(body.p_pi,pi);
  }
  return json({ok:true,duplicate:state.actions.length>1});
 }
 throw new Error('Unexpected provider/network call: '+path);
};
const base={id:'evt_LU301MOCKpaid123456',type:'checkout.session.completed',livemode:true,
 created:Math.floor(Date.now()/1000),data:{object:{id:session,metadata}}};
async function signedEvent(event,valid=true){
 const raw=JSON.stringify(event),t=String(Math.floor(Date.now()/1000));
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=Buffer.from(await webcrypto.subtle.sign('HMAC',key,
  new TextEncoder().encode(t+'.'+raw))).toString('hex');
 return onRequestPost({env,request:new Request('https://example.com/api/stripe-live-webhook',{
  method:'POST',body:raw,headers:{'stripe-signature':'t='+t+',v1='+(valid?mac:'f'.repeat(64))}})});
}
try{
 let r=await signedEvent(base,false);
 assert.equal(r.status,401,'invalid signature must reject before any provider call');
 assert.equal(state.outbound,0);
 r=await signedEvent(base);
 assert.equal(r.status,200,await r.clone().text());
 assert.equal(await r.text(),'lumen-live-accounted');
 assert.equal(state.actions.length,1);
 assert.equal(state.actions[0].p_kind,'paid');
 const oldActions=state.actions.length;
 state.price='price_WRONGMOCK1234567';
 r=await signedEvent({...base,id:'evt_LU301BadPrice123456'});
 assert.equal(r.status,503,'price substitution must retry fail closed');
 assert.equal(state.actions.length,oldActions);
 state.price=price;
 state.refund=true;state.partial=true;
 const refund={...base,id:'evt_LU301Refund1234567',type:'charge.refunded',
  data:{object:{id:charge}}};
 r=await signedEvent(refund);
 assert.equal(r.status,503,'partial refund must never claim full wallet reversal');
 assert.equal(state.actions.length,oldActions);
 state.partial=false;
 r=await signedEvent(refund);
 assert.equal(r.status,200,await r.clone().text());
 assert.equal(state.actions.length,2);
 assert.equal(state.actions[1].p_kind,'refunded');
 r=await signedEvent({...base,id:'evt_LU301Unrelated123456',type:'customer.updated',
  data:{object:{id:'cus_other'}}});
 assert.equal(r.status,200);
 assert.equal(state.actions.length,2,'unrelated signed customer event must not credit');
 console.log('PASS LU301: signed LIVE paid and refund correctly matched canonical ledger; invalid signature, price substitution, partial refund rejected; unrelated events ignored; all network intercepted.');
}finally{globalThis.fetch=previousFetch}
