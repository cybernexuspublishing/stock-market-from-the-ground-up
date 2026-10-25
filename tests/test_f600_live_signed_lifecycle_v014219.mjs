import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestPost} from '../functions/api/founding600-webhook.js';
if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
const secret='whsec_live_signing_fixture_only';
const uuid='11111111-1111-4111-8111-111111110246';
const values={sub:'sub_f600MockABC123',session:'cs_live_f600MockABC123',
 invoice:'in_f600MockABC123',price:'price_f600MockABC123',customer:'cus_f600MockABC123',
 event:'evt_f600MockABC123',charge:'ch_f600MockABC123',intent:'pi_f600MockABC123'};
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock_ci',
 GU_F600_LIVE_WEBHOOK_ENABLED:'true',GU_F600_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock_ci',GU_F600_LIVE_WEBHOOK_SECRET:secret,
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_1OxhOiJL0O4GGVBH',
 GU_F600_LIVE_CATALOG_JSON:JSON.stringify({FOUNDING_30:{priceId:values.price,productId:'prod_mockABC'},FOUNDING_60:{priceId:'price_mock60',productId:'prod_mock60'}})};
const t0=Math.floor(Date.now()/86400000)*86400;
const sub={id:values.sub,livemode:true,status:'active',customer:values.customer,
 metadata:{f600_reservation:uuid},cancel_at_period_end:false,
 items:{data:[{current_period_end:t0+30*86400,price:{id:values.price,recurring:{interval:'day',interval_count:30}}}]}};
const invoice={id:values.invoice,livemode:true,status:'paid',customer:values.customer,subscription:values.sub,
 currency:'usd',amount_paid:4999,subtotal:4999,
 lines:{has_more:false,data:[{amount:4999,price:{id:values.price},period:{start:t0,end:t0+30*86400}}]}};
const reservation={id:uuid,plan_code:'FOUNDING_30',user_id:'11111111-1111-4111-8111-111111110001',
 reservation_state:'consumed',checkout_session_id:values.session,checkout_subscription_id:values.sub,checkout_price_id:values.price};
const session={id:values.session,livemode:true,client_reference_id:uuid,mode:'subscription',
 subscription:values.sub,customer:values.customer,metadata:{f600_user:reservation.user_id}};
const payment={data:[{invoice:values.invoice,status:'paid',amount_paid:4999,payment:{payment_intent:values.intent}}],has_more:false};
async function sign(body){
 const now=Math.floor(Date.now()/1000),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(now+'.'+body)));
 return 't='+now+',v1='+Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
}
async function req(kind,object={},invalid=false){
 const event={id:values.event,livemode:true,type:kind,account:'acct_1OxhOiJL0O4GGVBH',data:{object}};
 const body=JSON.stringify(event),signature=invalid?'t=123,v1='+('0'.repeat(64)):await sign(body);
 return new Request('https://example.com/api/founding600-webhook',{method:'POST',
 headers:{'stripe-signature':signature},body});
}
function mocks({noPaidPayment=false,partialRefund=false}={}){
 const saved=globalThis.fetch,calls=[];
 globalThis.fetch=async (url,options={})=>{
  const p=new URL(String(url)).pathname,q=new URL(String(url)).searchParams;
  calls.push({p,body:options.body?JSON.parse(options.body):null});
  const out=obj=>new Response(JSON.stringify(obj),{status:200,headers:{'content-type':'application/json'}});
  if(p==='/v1/account')return out({id:'acct_1OxhOiJL0O4GGVBH',livemode:true});
  if(p==='/v1/invoices/'+values.invoice)return out(invoice);
  if(p==='/v1/subscriptions/'+values.sub)return out(sub);
  if(p==='/v1/checkout/sessions/'+values.session)return out(session);
  if(p==='/v1/invoice_payments'&&(q.get('invoice')===values.invoice||q.get('payment[payment_intent]')===values.intent))
    return out(noPaidPayment?{data:[],has_more:false}:payment);
  if(p==='/v1/payment_intents/'+values.intent)return out({id:values.intent,livemode:true,status:'succeeded',
   currency:'usd',amount:4999,customer:values.customer});
  if(p==='/v1/charges/'+values.charge)return out({id:values.charge,livemode:true,
   payment_intent:values.intent,amount:4999,
   amount_refunded:partialRefund?1000:4999,customer:values.customer});
  if(p.startsWith('/rest/v1/gu_founder_reservations_v014173'))return out([reservation]);
  if(p==='/rest/v1/rpc/gu_founder_record_paid_cycle_v014196')return out({ok:true,replayed:false});
  if(p==='/rest/v1/rpc/gu_founder_update_provider_state_v014218')return out({ok:true,replayed:false});
  if(p==='/rest/v1/rpc/gu_founder_reverse_paid_invoice_v014200')return out({ok:true,replayed:false});
  throw Error('Unknown mock HTTP '+p);
 };
 return {calls,restore(){globalThis.fetch=saved}};
}
test('invalid signature prevents provider and entitlement network calls',async()=>{
 const m=mocks();try{const r=await onRequestPost({request:await req('invoice.paid',{id:values.invoice},true),env});
 assert.equal(r.status,403);assert.equal(m.calls.length,0)}finally{m.restore()}
});
test('verified settled invoice grants through single atomic DB RPC',async()=>{
 const m=mocks();try{const r=await onRequestPost({request:await req('invoice.paid',{id:values.invoice}),env});
 assert.equal(r.status,200);assert.equal(await r.text(),'PAID');
 assert.equal(m.calls.filter(x=>x.p.endsWith('/rpc/gu_founder_record_paid_cycle_v014196')).length,1);
 }finally{m.restore()}
});
test('invoice.paid without succeeded allocated PaymentIntent cannot mint Sparks',async()=>{
 const m=mocks({noPaidPayment:true});try{const r=await onRequestPost({request:await req('invoice.paid',{id:values.invoice}),env});
 assert.equal(r.status,503);
 assert.equal(m.calls.some(x=>x.p.endsWith('gu_founder_record_paid_cycle_v014196')),false);
 }finally{m.restore()}
});
test('paid-through cancellation remains ACTIVE until end and does not mint credits',async()=>{
 const m=mocks();const was=sub.cancel_at_period_end;sub.cancel_at_period_end=true;
 try{const r=await onRequestPost({request:await req('customer.subscription.updated',{id:values.sub}),env});
 assert.equal(r.status,200);
 const x=m.calls.find(x=>x.p.endsWith('/rpc/gu_founder_update_provider_state_v014218'));
 assert.equal(x?.body?.p_status,'active');assert.equal(x.body.p_cancel_at_period_end,true);
 assert.equal(m.calls.some(x=>x.p.includes('gu_founder_record_paid_cycle_v014196')),false);
 }finally{sub.cancel_at_period_end=was;m.restore()}
});
test('verified failed renewal invoice records past-due but grants no new Sparks',async()=>{
 const m=mocks(),old=invoice.status;invoice.status='open';
 try{
  const r=await onRequestPost({request:await req('invoice.payment_failed',{id:values.invoice}),env});
  assert.equal(r.status,200);
  const call=m.calls.find(x=>x.p.endsWith('gu_founder_update_provider_state_v014218'));
  assert.equal(call?.body?.p_status,'past_due');
  assert.equal(m.calls.some(x=>x.p.endsWith('gu_founder_record_paid_cycle_v014196')),false);
 }finally{invoice.status=old;m.restore()}
});
test('duplicate paid invoice replay reuses ledger result, never grants twice',async()=>{
 const m=mocks(),saved=m.calls;
 const before=globalThis.fetch;
 globalThis.fetch=async (url,options={})=>{
  if(new URL(String(url)).pathname.endsWith('gu_founder_record_paid_cycle_v014196'))
   return new Response(JSON.stringify({ok:true,replayed:true}),{status:200,headers:{'content-type':'application/json'}});
  return before(url,options);
 };
 try{
  const r=await onRequestPost({request:await req('invoice.paid',{id:values.invoice}),env});
  assert.equal(r.status,200);
  assert.equal(await r.text(),'REPLAY');
 }finally{m.restore()}
});
test('full refund reverses exact paid invoice without restoring a founding seat',async()=>{
 const m=mocks();try{const r=await onRequestPost({request:await req('charge.refunded',{id:values.charge}),env});
 assert.equal(r.status,200);assert.equal(await r.text(),'FULL_REFUND_REVERSED');
 const x=m.calls.find(x=>x.p.endsWith('gu_founder_reverse_paid_invoice_v014200'));
 assert.equal(x?.body?.p_invoice,values.invoice);
 }finally{m.restore()}
});
test('partial refund never revokes a whole paid cycle automatically',async()=>{
 const m=mocks({partialRefund:true});try{const r=await onRequestPost({request:await req('charge.refunded',{id:values.charge}),env});
 assert.equal(r.status,200);assert.equal(await r.text(),'PARTIAL_REFUND_MANUAL_REVIEW');
 assert.equal(m.calls.some(x=>x.p.endsWith('gu_founder_reverse_paid_invoice_v014200')),false);
 }finally{m.restore()}
});
