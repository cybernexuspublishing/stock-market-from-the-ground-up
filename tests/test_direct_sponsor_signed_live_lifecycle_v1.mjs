import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
const src=readFileSync('functions/api/stripe-live-webhook-v01458.js','utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const merchant='acct_1OxhOiJL0O4GGVBH',secret='whsec_sponsor_signed_ci_only',
 invoiceId='in_AdCaseABC123',customerId='cus_AdCaseABC123',
 intentId='pi_AdCaseABC123',chargeId='ch_AdCaseABC123';
const env={GU58_LIVE_WEBHOOK_ENABLED:'true',GU58_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_LIVE_DB_CONTRACT_APPROVED:'true',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_ciMock',
 GU58_STRIPE_LIVE_ACCOUNT_ID:merchant,GU58_STRIPE_LIVE_WEBHOOK_SECRET:secret,
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_ciMock'};
const invoice={id:invoiceId,livemode:true,status:'paid',amount_remaining:0,amount_paid:25000,
 customer:customerId,currency:'usd',collection_method:'send_invoice',metadata:{
 ad_campaign_id:'42',advertiser_id:'8',approved_quote_cents:'25000'}};
const campaign={id:42,advertiser_id:8,amount_cents:25000,approval_state:'approved',
 payment_state:'unpaid',stripe_invoice_id:invoiceId,stripe_customer_id:customerId};
const pi={id:intentId,livemode:true,status:'succeeded',currency:'usd',
 customer:customerId,amount_received:25000,latest_charge:chargeId,invoice:invoiceId};
function mocks({refund=0,dispute=false,underpaid=false,unrelated=false}={}){
 const prior=globalThis.fetch,seen=[],ledger=[];
 globalThis.fetch=async(url,opts={})=>{
  const x=new URL(String(url)),p=x.pathname,fail=()=>{throw Error('Unexpected fetch '+x.href)};
  seen.push({p,method:opts.method||'GET'});
  const send=v=>new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}});
  if(p==='/v1/account')return send({id:merchant});
  if(p==='/v1/invoices/'+invoiceId)return send(unrelated?{...invoice,metadata:{}}:
   {...invoice,amount_paid:underpaid?100:25000});
  if(p==='/v1/invoice_payments')return send({has_more:false,data:[{status:'paid',amount_paid:25000,
    payment:{payment_intent:intentId}}]});
  if(p==='/v1/payment_intents/'+intentId)return send(pi);
  if(p==='/v1/charges/'+chargeId)return send({id:chargeId,livemode:true,paid:true,amount:25000,
    amount_refunded:refund,disputed:dispute,customer:customerId,payment_intent:intentId,
    invoice:invoiceId});
  if(p==='/rest/v1/ad_campaigns')return send([campaign]);
  if(p==='/rest/v1/rpc/gu_ad_signed_live_apply_v1'){
   const data=JSON.parse(opts.body);ledger.push(data);
   return send({ok:true,replayed:false,paymentState:data.p_type==='invoice.paid'?'verified_paid':'refunded'});
  }
  return fail();
 };
 return {seen,ledger,restore(){globalThis.fetch=prior}};
}
async function signed(type,object,{valid=true,account=merchant}={}){
 const event={id:'evt_AdSponsorCI123',created:Math.floor(Date.now()/1000),type,livemode:true,account,
  data:{object}};
 const raw=JSON.stringify(event),ts=String(Math.floor(Date.now()/1000));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw)));
 const value=valid?[...sig].map(x=>x.toString(16).padStart(2,'0')).join(''):'0'.repeat(64);
 return new Request('https://stock-market-from-the-ground-up-d1r.pages.dev/api/stripe-live-webhook',{
  method:'POST',headers:{'stripe-signature':'t='+ts+',v1='+value},body:raw});
}
test('LIVE signed invoice.paid event verifies provider invoice, PI, charge and durable settlement',async()=>{
 const m=mocks();try{
  const r=await onRequestPost({request:await signed('invoice.paid',{id:invoiceId}),env});
  assert.equal(r.status,200,await r.text());assert.equal(m.ledger.length,1);
  assert.equal(m.ledger[0].p_type,'invoice.paid');
  assert.equal(m.ledger[0].p_amount,25000);
  assert.equal(m.ledger[0].p_invoice,invoiceId);
  assert(m.seen.some(x=>x.p==='/v1/invoice_payments'));
 }finally{m.restore()}
});
test('LIVE signed full or partial charge refunds invoke campaign reversal',async()=>{
 const m=mocks({refund:2500});try{
  const r=await onRequestPost({request:await signed('charge.refunded',{id:chargeId}),env});
  assert.equal(r.status,200);assert.equal(m.ledger.length,1);
  assert.equal(m.ledger[0].p_type,'charge.refunded');
  assert.equal(m.ledger[0].p_amount,2500);
 }finally{m.restore()}
});
test('LIVE signed dispute invokes immediate safe pause path',async()=>{
 const m=mocks({dispute:true});try{
  const r=await onRequestPost({request:await signed('charge.dispute.created',{id:'dp_123ABC',charge:chargeId}),env});
  assert.equal(r.status,200);assert.equal(m.ledger[0]?.p_type,'charge.dispute.created');
 }finally{m.restore()}
});
test('Invalid HMAC prevents all Stripe and database IO',async()=>{
 const m=mocks();try{
  const r=await onRequestPost({request:await signed('invoice.paid',{id:invoiceId},{valid:false}),env});
  assert.equal(r.status,401);assert.equal(m.seen.length,0);
 }finally{m.restore()}
});
test('Foreign Stripe account rejected before provider retrieval',async()=>{
 const m=mocks();try{
  const r=await onRequestPost({request:await signed('invoice.paid',{id:invoiceId},{account:'acct_FOREIGN123'}),env});
  assert.equal(r.status,400);assert.equal(m.seen.length,0);
 }finally{m.restore()}
});
test('Unrelated LIVE invoicing is ignored without ad ledger writes',async()=>{
 const m=mocks({unrelated:true});try{
  const r=await onRequestPost({request:await signed('invoice.paid',{id:invoiceId}),env});
  assert.equal(r.status,200);assert.equal(m.ledger.length,0);
 }finally{m.restore()}
});
test('Underpaid provider invoice receives non-2xx retry, never credited',async()=>{
 const m=mocks({underpaid:true});try{
  const r=await onRequestPost({request:await signed('invoice.paid',{id:invoiceId}),env});
  assert.equal(r.status,503);assert.equal(m.ledger.length,0);
 }finally{m.restore()}
});
