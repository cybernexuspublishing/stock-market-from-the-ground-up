import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestPost} from '../functions/api/gu39-stripe-webhook.js';

if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
const secret='whsec_founder_qa_signature_only';
const base='https://oxihglyfgzywsupnyicb.supabase.co';
const env={GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock_for_ci',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:secret,SUPABASE_URL:base,SUPABASE_SECRET_KEY:'sb_secret_mock_for_ci',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock_for_ci'};
const fixture={intent:'11111111-1111-4111-8111-111111110246',invoice:'in_founderQaABC123',
 sub:'sub_founderQaABC123',customer:'cus_founderQaABC123',price:'price_1UUCNbJY9FI7byHBCX2VWdLi'};
async function signed(raw){
 const ts=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sum=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw)));
 return 't='+ts+',v1='+Array.from(sum,x=>x.toString(16).padStart(2,'0')).join('');
}
const makeEvent=(mode=false,type='invoice.paid')=>({
 id:'evt_founderQaEvent123',type,created:Math.floor(Date.now()/1000),livemode:mode,
 data:{object:{id:fixture.invoice}}
});
async function request(event,good=true){
 const body=JSON.stringify(event);
 return new Request('https://example.com/api/gu39-stripe-webhook',{method:'POST',
 headers:{'stripe-signature':good?await signed(body):'t=123,v1='+('0'.repeat(64))},body});
}
function network(opts={}){
 const plan=opts.plan||'FOUNDING_30';
 const amount=opts.amount|| (plan==='FOUNDING_14'?2299:plan==='FOUNDING_60'?5999:4999);
 const days=plan==='FOUNDING_14'?14:plan==='FOUNDING_60'?60:30;
 const sparks=plan==='FOUNDING_14'?10:plan==='FOUNDING_60'?20:15;
 const price=plan==='FOUNDING_14'?'price_1UVDQoJY9FI7byHBuiYDnHrX':
  plan==='FOUNDING_60'?'price_1UUCNkJY9FI7byHBuh6pT4xd':fixture.price;
 const calls=[];const saved=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(String(url));const path=u.pathname;calls.push({path,method:options.method||'GET'});
  const result=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
  if(path.endsWith('/rest/v1/gu39_sandbox_settings'))return result([{enabled:true}]);
  if(path.startsWith('/rest/v1/gu_f600_sandbox_intents_v014215'))return result([{
   id:fixture.intent,plan_code:plan,stripe_subscription_id:null,stripe_customer_id:null
  }]);
  if(path.endsWith('/rest/v1/rpc/gu_f600_sandbox_apply_v014215')){
   const p=JSON.parse(options.body);
   assert.equal(p.p_kind,opts.expectedKind||'invoice.paid');
   if(!opts.expectedKind)assert.equal(p.p_amount,opts.invoiceAmount||amount);
   assert.equal(p.p_intent,fixture.intent);
   if(opts.expectedKind==='invoice.payment_failed'){
    assert.match(p.p_start,/^20/);assert.match(p.p_end,/^20/);
    assert.equal((Date.parse(p.p_end)-Date.parse(p.p_start))/86400000,days);
   }
   return result({ok:true,mode:'SANDBOX',replayed:opts.replayed===true,includedSparks:opts.replayed?0:sparks})
  }
  if(path.includes('/v1/invoices/'))return result({
   id:fixture.invoice,livemode:false,status:opts.invoiceStatus||'paid',currency:'usd',
   subscription:fixture.sub,customer:fixture.customer,amount_paid:opts.invoiceAmount||amount,subtotal:opts.invoiceAmount||amount,
   lines:{has_more:false,data:[{amount:opts.invoiceAmount||amount,price:{id:price},
    period:{start:Math.floor(Date.now()/1000),end:Math.floor(Date.now()/1000)+(opts.periodDays??days)*86400}}]}
  });
  if(path.includes('/v1/payment_intents/'))return result({
    id:'pi_founderQA123',livemode:false,status:'succeeded',amount:amount,
    metadata:{},customer:fixture.customer
  });
  if(path.includes('/v1/charges/'))return result({
   id:'ch_founderQA123',livemode:false,customer:fixture.customer,
   payment_intent:'pi_founderQA123',invoice:fixture.invoice,
   amount,amount_refunded:opts.partialRefund?1000:amount
  });
  if(path.includes('/v1/subscriptions/'))return result({
   id:fixture.sub,livemode:false,customer:fixture.customer,status:'active',
   metadata:{f600_qa_intent:fixture.intent,f600_qa_program:'FOUNDING600_TEST'},
   items:{data:[{price:{id:price,unit_amount:amount,currency:'usd',active:true,recurring:{interval:'day',interval_count:days}}}]},
   cancel_at_period_end:opts.cancelAtPeriodEnd===true
  });
  throw Error('Unexpected network call '+path)
 };
 return {calls,restore(){globalThis.fetch=saved}};
}
test('signed Stripe test paid invoice reaches only isolated founding QA ledger',async()=>{
 const n=network();
 try{const response=await onRequestPost({request:await request(makeEvent()),env});
 assert.equal(response.status,200);
 assert.equal(await response.text(),'F600_TEST_INVOICE_PAID');
 assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
 assert.equal(n.calls.some(x=>/rpc\/gu_founder_record_paid_cycle|site_subscriptions|gu_founder_members_v/.test(x.path)),false);
 }finally{n.restore()}
});
test('14-day signed TEST invoice uses exact $22.99 billing and separate sandbox ledger',async()=>{
 const n=network({plan:'FOUNDING_14'});
 try{
  const response=await onRequestPost({request:await request(makeEvent()),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_INVOICE_PAID');
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
  assert.equal(n.calls.some(x=>/rpc\/gu_founder_record_paid_cycle|site_subscriptions|gu_founder_members_v/.test(x.path)),false);
 }finally{n.restore()}
});
test('14-day wrong invoice amount never reaches sandbox ledger',async()=>{
 const n=network({plan:'FOUNDING_14',invoiceAmount:4999});
 try{const response=await onRequestPost({request:await request(makeEvent()),env});
  assert.equal(response.status,503);
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,0);
 }finally{n.restore()}
});
test('routine Stripe subscription update cannot falsely schedule QA cancellation',async()=>{
 const n=network({plan:'FOUNDING_14'});
 const event=makeEvent(false,'customer.subscription.updated');event.data.object.id=fixture.sub;
 try{const response=await onRequestPost({request:await request(event),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_UPDATE_NO_CANCEL');
  assert.equal(n.calls.filter(c=>c.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,0);
 }finally{n.restore()}
});
test('real Stripe cancel-at-period-end update may schedule QA cancellation',async()=>{
 const n=network({plan:'FOUNDING_14',cancelAtPeriodEnd:true,expectedKind:'customer.subscription.updated'});
 const event=makeEvent(false,'customer.subscription.updated');event.data.object.id=fixture.sub;
 try{const response=await onRequestPost({request:await request(event),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_CUSTOMER_SUBSCRIPTION_UPDATED');
  assert.equal(n.calls.filter(c=>c.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
 }finally{n.restore()}
});
test('bad Stripe signature cannot read Supabase or touch provider',async()=>{
 const n=network();
 try{const response=await onRequestPost({request:await request(makeEvent(),false),env});
 assert.equal(response.status,401);assert.equal(n.calls.length,0)
 }finally{n.restore()}
});
test('LIVE-mode payload rejected before provider or database',async()=>{
 const n=network();
 try{const response=await onRequestPost({request:await request(makeEvent(true)),env});
 assert.equal(response.status,400);assert.equal(n.calls.length,0)
 }finally{n.restore()}
});
test('disabled testing gate makes zero network calls',async()=>{
 const n=network();
 try{const response=await onRequestPost({request:await request(makeEvent()),env:{...env,GU39_SANDBOX_SHADOW_GATE:'false'}});
 assert.equal(response.status,503);assert.equal(n.calls.length,0)
 }finally{n.restore()}
});

test('signed TEST renewal failure records an exact plan period but never awards Sparks',async()=>{
 for(const plan of ['FOUNDING_14','FOUNDING_30','FOUNDING_60']){
  const n=network({plan,invoiceStatus:'open',expectedKind:'invoice.payment_failed'});
  try{
   const response=await onRequestPost({request:await request(makeEvent(false,'invoice.payment_failed')),env});
   assert.equal(response.status,200,plan);
   assert.equal(await response.text(),'F600_TEST_INVOICE_PAYMENT_FAILED');
   assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
  }finally{n.restore()}
 }
});
test('a formerly failed invoice now paid by Stripe cannot revoke a paid cycle',async()=>{
 const n=network({invoiceStatus:'paid',expectedKind:'invoice.payment_failed'});
 try{
  const response=await onRequestPost({request:await request(makeEvent(false,'invoice.payment_failed')),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_FAILED_INVOICE_ALREADY_PAID');
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,0);
 }finally{n.restore()}
});
test('a malformed failed renewal term is refused without a ledger mutation',async()=>{
 const n=network({plan:'FOUNDING_60',invoiceStatus:'open',expectedKind:'invoice.payment_failed',periodDays:30});
 try{
  const response=await onRequestPost({request:await request(makeEvent(false,'invoice.payment_failed')),env});
  assert.equal(response.status,503);
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,0);
 }finally{n.restore()}
});
test('an alternate signed delivery of an already settled invoice is acknowledged as a replay',async()=>{
 const n=network({plan:'FOUNDING_30',replayed:true});
 try{
  const response=await onRequestPost({request:await request(makeEvent(false,'invoice.paid')),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_REPLAY');
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
 }finally{n.restore()}
});
test('a verified subscription cancellation creates a TEST-only cancellation record',async()=>{
 const n=network({plan:'FOUNDING_60',expectedKind:'customer.subscription.deleted'});
 try{
  const event=makeEvent(false,'customer.subscription.deleted');event.data.object.id=fixture.sub;
  const response=await onRequestPost({request:await request(event),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_CUSTOMER_SUBSCRIPTION_DELETED');
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
  assert.equal(n.calls.some(x=>/gu_founder_paid_cycles|site_subscriptions|gu_founder_members_v/.test(x.path)),false);
 }finally{n.restore()}
});

test('signed TEST full refund reverses only the matching private Founder invoice',async()=>{
 const n=network({plan:'FOUNDING_60',expectedKind:'charge.refunded'});
 const event=makeEvent(false,'charge.refunded');event.data.object.id='ch_founderQA123';
 try{
  const response=await onRequestPost({request:await request(event),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'F600_TEST_CHARGE_REFUNDED');
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,1);
  assert.equal(n.calls.some(x=>/gu_founder_record_paid_cycle|gu_founder_members_v|site_subscriptions/.test(x.path)),false);
 }finally{n.restore()}
});
test('TEST partial refund is never treated as a complete Founder revocation',async()=>{
 const n=network({plan:'FOUNDING_30',partialRefund:true,expectedKind:'charge.refunded'});
 const event=makeEvent(false,'charge.refunded');event.data.object.id='ch_founderQA123';
 try{
  const response=await onRequestPost({request:await request(event),env});
  assert.equal(response.status,503);
  assert.equal(n.calls.filter(x=>x.path.includes('/rpc/gu_f600_sandbox_apply_v014215')).length,0);
 }finally{n.restore()}
});
