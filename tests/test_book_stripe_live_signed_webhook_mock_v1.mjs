/* Noncharging LIVE book webhook contract: fake provider and signed events.
 * No real Stripe sessions, payments or user entitlements are created. */
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestPost} from '../functions/api/stripe-live-webhook-v01458.js';
const SECRET='whsec_local_mock_book_123456789';
const ACCOUNT='acct_bookmock123456';
const CODE='FOUNDATION_BOOK_1';
const INTENT='11111111-1111-4111-8111-111111111111';
const MEMBER='22222222-2222-4222-8222-222222222222';
const SESSION='cs_live_mockbook0001';
const PI='pi_mockbook0001';
const CHARGE='ch_mockbook0001';
const PRICE='price_1UVBsDJL0O4GGVBHdqAaP15z';
const META={gu_book_live_intent:INTENT,gu_book_live_member:MEMBER,gu_book_live_code:CODE};
const env={
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock_token_123456',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mocksecret123456789',
 GU58_STRIPE_LIVE_WEBHOOK_SECRET:SECRET,
 GU58_STRIPE_LIVE_ACCOUNT_ID:ACCOUNT,
 GU58_LIVE_WEBHOOK_ENABLED:'true',
 GU58_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_LIVE_DB_CONTRACT_APPROVED:'true'
};
const headers={'content-type':'application/json'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
let calls=[],priceWrong=false,paid=true,refundAmount=1099;
let currentCode=CODE,currentPrice=PRICE,currentAmount=1099;
const currentMeta=()=>({...META,gu_book_live_code:currentCode});
let seen=new Set();
const session=()=>({id:SESSION,livemode:true,mode:'payment',status:'complete',
 payment_status:paid?'paid':'unpaid',amount_subtotal:currentAmount,currency:'usd',
 payment_intent:PI,client_reference_id:INTENT,metadata:currentMeta()});
const intent=()=>({id:PI,livemode:true,status:'succeeded',currency:'usd',
 amount_received:currentAmount,metadata:currentMeta()});
const requestHost='https://example.org/api/stripe-live-webhook-v01458';
const oldFetch=globalThis.fetch;
globalThis.crypto??=webcrypto;
globalThis.fetch=async (url,opts={})=>{
 const path=String(url);
 if(path.endsWith('/v1/account'))return response({id:ACCOUNT});
 if(path.includes('/checkout/sessions/'+SESSION+'/line_items'))
  return response({data:[{price:{id:priceWrong?'price_wrong':currentPrice},quantity:1,amount_subtotal:currentAmount}],has_more:false});
 if(path.includes('/checkout/sessions/'+SESSION))return response(session());
 if(path.includes('/payment_intents/'+PI))return response(intent());
 if(path.includes('/charges/'+CHARGE))return response({
   id:CHARGE,livemode:true,payment_intent:PI,amount:1099,amount_refunded:refundAmount
 });
 if(path.endsWith('/rest/v1/rpc/gu_book_live_apply_v1')){
  const data=JSON.parse(opts.body);calls.push(data);
  const duplicate=seen.has(data.p_event);seen.add(data.p_event);
  return response({ok:true,duplicate});
 }
 throw Error('Unexpected mock fetch URL '+path);
};
const sign=async raw=>{
 const t=Math.floor(Date.now()/1000),key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=new Uint8Array(await webcrypto.subtle.sign('HMAC',key,
  new TextEncoder().encode(t+'.'+raw)));
 return 't='+t+',v1='+Array.from(sig).map(b=>b.toString(16).padStart(2,'0')).join('');
};
let counter=0;
const post=async(type,data,{badSignature=false,customMeta=null}={})=>{
 const e={id:'evt_bookmock_'+(++counter),created:Math.floor(Date.now()/1000),livemode:true,
  account:ACCOUNT,type,data:{object:data}};
 const raw=JSON.stringify(e),sig=badSignature?'t='+e.created+',v1='+'0'.repeat(64):await sign(raw);
 return onRequestPost({request:new Request(requestHost,{method:'POST',
  headers:{'stripe-signature':sig,'content-type':'application/json'},body:raw}),env});
};
try{
 let r=await post('checkout.session.completed',{id:SESSION,metadata:META});
 assert.equal(r.status,200);
 assert.equal(calls.length,1);
 assert.equal(calls[0].p_kind,'paid');
 assert.equal(calls[0].p_price,PRICE);
 assert.equal(calls[0].p_amount,1099);
 // Repeated signed event should be idempotent in the DB, not a second purchase.
 const same={id:'evt_bookmock_replay1',created:Math.floor(Date.now()/1000),livemode:true,
  account:ACCOUNT,type:'checkout.session.completed',data:{object:{id:SESSION,metadata:META}}};
 const raw=JSON.stringify(same),sig=await sign(raw);
 for(let i=0;i<2;i++){
  const resp=await onRequestPost({request:new Request(requestHost,{method:'POST',
   headers:{'stripe-signature':sig},body:raw}),env});
  assert.equal(resp.status,200);
 }
 assert.equal(calls[1].p_event,calls[2].p_event);
 assert(seen.has(calls[1].p_event));
 const before=calls.length;
 r=await post('checkout.session.completed',{id:SESSION,metadata:META},{badSignature:true});
 assert.equal(r.status,401);assert.equal(calls.length,before);
 priceWrong=true;r=await post('checkout.session.completed',{id:SESSION,metadata:META});
 assert.equal(r.status,503);assert.equal(calls.length,before);priceWrong=false;
 paid=false;r=await post('checkout.session.completed',{id:SESSION,metadata:META});
 assert.equal(r.status,200);assert.equal(calls.length,before);paid=true;
 refundAmount=500;r=await post('charge.refunded',{id:CHARGE});
 assert.equal(r.status,200);assert.equal(calls.length,before);
 refundAmount=1099;r=await post('charge.refunded',{id:CHARGE});
 assert.equal(r.status,200);assert.equal(calls.at(-1).p_kind,'refunded');
 r=await post('charge.dispute.created',{charge:CHARGE});
 assert.equal(r.status,200);assert.equal(calls.at(-1).p_kind,'disputed');
 const extra=[
  ['FOUNDATION_BOOK_2','price_1UVBsFJL0O4GGVBHP75QJV4N',1099],
  ['FOUNDATION_BOOK_3','price_1UVBsLJL0O4GGVBH37PPBw4s',1199],
  ['DAY_TRADING_BOOK_1','price_1UVBsPJL0O4GGVBH1cdsLBT3',1499],
  ['READING_THE_TAPE','price_1UVBsSJL0O4GGVBHjElhhG8W',1499]
 ];
 for(const [code,price,amount] of extra){
  currentCode=code;currentPrice=price;currentAmount=amount;
  const count=calls.length;
  r=await post('checkout.session.completed',{id:SESSION,metadata:currentMeta()});
  assert.equal(r.status,200,code+' signed paid event');
  assert.equal(calls.length,count+1);
  assert.equal(calls.at(-1).p_price,price);
  assert.equal(calls.at(-1).p_amount,amount);
  priceWrong=true;
  r=await post('checkout.session.completed',{id:SESSION,metadata:currentMeta()});
  assert.equal(r.status,503,code+' invalid Stripe line price must be refused');
  assert.equal(calls.length,count+1);
  priceWrong=false;
 }
 assert(calls.every(c=>c.p_id===INTENT));
 console.log('PASS no-charge LIVE five-title signed book webhook: paid proof, replay, bad HMAC, wrong price, unpaid, partial/full refunds and dispute.');
}finally{globalThis.fetch=oldFetch}
