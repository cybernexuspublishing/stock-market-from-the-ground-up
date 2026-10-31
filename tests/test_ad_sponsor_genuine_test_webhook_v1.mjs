import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptSignedSponsorTestEvent} from '../functions/_lib/ad-sponsor-test-webhook-acceptance-v1.js';
import {readFileSync} from 'node:fs';
const invoiceId='in_SponsorTestABC123',piId='pi_SponsorTestABC123',chargeId='ch_SponsorTestABC123';
const env={STRIPE_TEST_SECRET_KEY:'sk_test_CIFixtureNotReal',
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_CIFixture'};
function fixture({refund=0,unrelated=false,dispute=false,invoiceStatus='paid'}={}){
 const prev=globalThis.fetch,read=[],insert=[];
 globalThis.fetch=async(url,opts={})=>{
  const u=new URL(String(url)),p=u.pathname;
  read.push({p,method:opts.method||'GET'});
  let data;
  if(p==='/v1/invoices/'+invoiceId)data={
   id:invoiceId,livemode:false,status:invoiceStatus,currency:'usd',total:100,
   amount_paid:100,amount_remaining:0,customer:'cus_SponsorTestABC123',
   collection_method:'send_invoice',
   metadata:unrelated?{}:{gu_ad_sponsor_qa:'true',ad_campaign_id:'999990',
    advertiser_id:'999990',approved_quote_cents:'100'}
  };
  else if(p==='/v1/invoice_payments')data={has_more:false,data:[{
   status:'paid',amount_paid:100,payment:{payment_intent:piId}}]};
  else if(p==='/v1/payment_intents/'+piId)data={
   id:piId,livemode:false,status:'succeeded',amount_received:100,
   customer:'cus_SponsorTestABC123',latest_charge:chargeId,
   payment_details:{order_reference:invoiceId}
  };
  else if(p==='/v1/charges/'+chargeId)data={
   id:chargeId,livemode:false,paid:true,amount_refunded:refund,
   disputed:dispute,customer:'cus_SponsorTestABC123',payment_intent:piId};
  else if(p==='/rest/v1/gu_ad_sponsor_test_webhook_acceptance_v1'){
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers.apikey,env.SUPABASE_SECRET_KEY);
   assert(opts.headers.prefer.includes('ignore-duplicates'));
   const payload=JSON.parse(opts.body);insert.push(payload);data=[payload];
  }else throw Error('Unexpected external request '+u.href);
  return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
 };
 return {read,insert,restore:()=>{globalThis.fetch=prev}};
}
test('Genuine signed TEST invoice event is provider-reconciled and creates isolated QA receipt',async()=>{
 const m=fixture();try{
  const accepted=await acceptSignedSponsorTestEvent({
   id:'evt_SponsorTestABC123',type:'invoice.paid',livemode:false,
   data:{object:{id:invoiceId}}},env);
  assert.equal(accepted,true);
  assert.equal(m.insert.length,1);
  assert.equal(m.insert[0].event_type,'invoice.paid');
  assert.equal(m.insert[0].invoice_total_cents,100);
  assert.equal(m.insert[0].signature_checked,true);
  assert.equal(m.insert[0].stripe_provider_checked,true);
  assert(m.read.some(x=>x.p==='/v1/invoice_payments'));
  assert(!m.read.some(x=>/ad_campaigns|gu_ad_signed_live_apply|member_entitlement/.test(x.p)));
 }finally{m.restore()}
});
test('Genuine signed TEST refund records its provider-refunded amount, not a LIVE campaign change',async()=>{
 const m=fixture({refund:100});try{
  const accepted=await acceptSignedSponsorTestEvent({
   id:'evt_SponsorTestRefundABC123',type:'charge.refunded',livemode:false,
   data:{object:{id:chargeId}}},env);
  assert.equal(accepted,true);
  assert.equal(m.insert[0].event_type,'charge.refunded');
  assert.equal(m.insert[0].amount_refunded_cents,100);
  assert.equal(m.insert[0].charge_id,chargeId);
  assert.equal(m.insert[0].payment_intent_id,piId);
  assert(!m.read.some(x=>/ad_campaigns|gu_ad_signed_live_apply/.test(x.p)));
 }finally{m.restore()}
});
test('A non-sponsor TEST invoice cannot enter the QA ledger',async()=>{
 const m=fixture({unrelated:true});try{
  const accepted=await acceptSignedSponsorTestEvent({
   id:'evt_UnrelatedTestABC123',type:'invoice.paid',livemode:false,
   data:{object:{id:invoiceId}}},env);
  assert.equal(accepted,false);assert.equal(m.insert.length,0);
 }finally{m.restore()}
});
test('LIVE event cannot be recorded as a Stripe TEST sponsorship',async()=>{
 const m=fixture();try{
  const accepted=await acceptSignedSponsorTestEvent({
   id:'evt_LiveEventABC123',type:'invoice.paid',livemode:true,
   data:{object:{id:invoiceId}}},env);
  assert.equal(accepted,false);assert.equal(m.read.length,0);
 }finally{m.restore()}
});
test('Invoice status must be settled for receipt',async()=>{
 const m=fixture({invoiceStatus:'open'});try{
  await assert.rejects(acceptSignedSponsorTestEvent({
   id:'evt_UnpaidTestABC123',type:'invoice.paid',livemode:false,
   data:{object:{id:invoiceId}}},env),/SPONSOR_TEST_INVOICE_REJECTED/);
  assert.equal(m.insert.length,0);
 }finally{m.restore()}
});
test('TEST webhook entry point checks raw-body HMAC before sponsor-acceptance processing',()=>{
 const router=readFileSync('functions/api/stripe-test-webhook.js','utf8');
 assert(router.includes("if(!await signed(raw,request.headers.get('stripe-signature'),secret))"));
 assert(router.indexOf("if(!await signed(raw,request.headers.get('stripe-signature'),secret))")<
  router.indexOf('if(await acceptSignedSponsorTestEvent(event,env))'));
 assert(router.includes("return respond('SPONSOR_TEST_SIGNED_AND_RECORDED',200)"));
});
