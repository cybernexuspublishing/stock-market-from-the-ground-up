import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestPost} from '../functions/api/gu39-stripe-webhook.js';
if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
const base='https://oxihglyfgzywsupnyicb.supabase.co',
 secret='whsec_ad_sandbox_ci_signing_only',
 env={GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_ci_only',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:secret,SUPABASE_URL:base,SUPABASE_SECRET_KEY:'sb_secret_ci'};
const ids={intent:'11111111-1111-4111-8111-111111110360',
 session:'cs_test_AdSandboxCIABC123',pi:'pi_AdSandboxCIABC123',
 charge:'ch_AdSandboxCIABC123',customer:'cus_AdSandboxCIABC123',
 price:'price_1UUJoPJY9FI7byHBdkreckh7',product:'prod_VVKT4YqjwCFGIM'};
const session={id:ids.session,livemode:false,mode:'payment',currency:'usd',
 client_reference_id:ids.intent,payment_status:'paid',payment_intent:ids.pi,
 amount_total:100,amount_subtotal:100,customer:ids.customer,
 metadata:{gu_ad_sandbox_intent:ids.intent,gu_ad_sandbox_tag:'AD_SANDBOX_2026',
 gu_ad_sandbox_package:'SITE_SPONSOR'}};
const price={package_code:'SITE_SPONSOR',test_product_id:ids.product,
 test_price_id:ids.price,test_amount_cents:100,test_currency:'usd'};
const intent={id:ids.intent,package_code:'SITE_SPONSOR',checkout_session:ids.session,
 status:'checkout_open'};
const payment={id:ids.pi,livemode:false,amount:100,amount_received:100,
 currency:'usd',status:'succeeded',metadata:{gu_ad_sandbox_intent:ids.intent,
 gu_ad_sandbox_tag:'AD_SANDBOX_2026'}};
const charge={id:ids.charge,livemode:false,amount:100,amount_refunded:100,
 paid:true,disputed:false,payment_intent:ids.pi,customer:ids.customer};
const invoice=()=>({id:'evt_adSandboxCIABC123',type:'checkout.session.completed',
 created:Math.floor(Date.now()/1000),livemode:false,
 data:{object:{id:ids.session}}});
async function makeRequest(event,valid=true){
 const raw=JSON.stringify(event),t=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw)));
 const signature=valid?Array.from(signed,x=>x.toString(16).padStart(2,'0')).join(''):'0'.repeat(64);
 return new Request('https://test.example/api/gu39-stripe-webhook',{method:'POST',
 headers:{'stripe-signature':'t='+t+',v1='+signature},body:raw});
}
function network({replay=false,wrongProduct=false}={}){
 const old=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,opts={})=>{
  const url=new URL(String(input)),p=url.pathname;calls.push({p,method:opts.method||'GET'});
  const res=v=>new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}});
  if(p.endsWith('/gu39_sandbox_settings'))return res([{enabled:true}]);
  if(p.includes('/gu_ad_sandbox_intents_v014240'))return res([intent]);
  if(p.includes('/gu_ad_sandbox_prices_v014240'))return res([price]);
  if(p==='/v1/checkout/sessions/'+ids.session)return res(session);
  if(p==='/v1/checkout/sessions/'+ids.session+'/line_items')
   return res({data:[{quantity:1,amount_total:100,price:{id:wrongProduct?'price_wrong':ids.price,
    product:ids.product}}],has_more:false});
  if(p==='/v1/payment_intents/'+ids.pi)return res(payment);
  if(p==='/v1/checkout/sessions'&&url.searchParams.get('payment_intent')===ids.pi)
   return res({data:[session],has_more:false});
  if(p==='/v1/charges/'+ids.charge)return res(charge);
  if(p==='/rest/v1/rpc/gu_ad_sandbox_apply_v014240'){
   const input=JSON.parse(opts.body);
   assert.equal(input.p_intent,ids.intent);
   return res({ok:true,mode:'SANDBOX',replayed:replay,status:input.p_kind,
    commercialAdActivated:false,livePayment:false});
  }
  throw Error('Unexpected test provider request '+url.toString());
 };
 return {calls,restore(){globalThis.fetch=old}};
}
test('signed Stripe TEST checkout paid event goes to ad-only shadow ledger',async()=>{
 const m=network();try{
  const r=await onRequestPost({request:await makeRequest(invoice()),env});
  assert.equal(r.status,200);assert.equal(await r.text(),'AD_TEST_PAID');
  assert.equal(m.calls.filter(x=>x.p.endsWith('/rpc/gu_ad_sandbox_apply_v014240')).length,1);
  assert.equal(m.calls.some(x=>/ad_campaigns|gu_ad_order_evidence|site_subscriptions|gu_founder_members/.test(x.p)),false);
 }finally{m.restore()}
});
test('signed replay is idempotent in isolated ledger',async()=>{
 const m=network({replay:true});try{
  const r=await onRequestPost({request:await makeRequest(invoice()),env});
  assert.equal(r.status,200);assert.equal(await r.text(),'AD_TEST_EVENT_REPLAY');
 }finally{m.restore()}
});
test('signed Stripe TEST full refund reverses only ad QA receipt',async()=>{
 const m=network();try{
  const ev={...invoice(),id:'evt_adSandboxRefundCI',type:'charge.refunded',
    data:{object:{id:ids.charge}}};
  const r=await onRequestPost({request:await makeRequest(ev),env});
  assert.equal(r.status,200);assert.equal(await r.text(),'AD_TEST_REFUNDED');
  assert.equal(m.calls.filter(x=>x.p.endsWith('/rpc/gu_ad_sandbox_apply_v014240')).length,1);
 }finally{m.restore()}
});
test('bad Stripe signature makes zero provider or DB calls',async()=>{
 const m=network();try{
  const r=await onRequestPost({request:await makeRequest(invoice(),false),env});
  assert.equal(r.status,401);assert.equal(m.calls.length,0);
 }finally{m.restore()}
});
test('LIVE Stripe payload is rejected before provider or DB',async()=>{
 const m=network();try{
  const r=await onRequestPost({request:await makeRequest({...invoice(),livemode:true}),env});
  assert.equal(r.status,400);assert.equal(m.calls.length,0);
 }finally{m.restore()}
});
test('disallowed test price blocks order without any paid ledger',async()=>{
 const m=network({wrongProduct:true});try{
  const r=await onRequestPost({request:await makeRequest(invoice()),env});
  assert.equal(r.status,503);
  assert.equal(m.calls.filter(x=>x.p.endsWith('/rpc/gu_ad_sandbox_apply_v014240')).length,0);
 }finally{m.restore()}
});
test('disabled Owner sitewide Sandbox gate blocks provider access',async()=>{
 const m=network();try{
  const r=await onRequestPost({request:await makeRequest(invoice()),env:{
   ...env,GU39_SANDBOX_SHADOW_GATE:'false'}});
  assert.equal(r.status,503);assert.equal(m.calls.length,0);
 }finally{m.restore()}
});
