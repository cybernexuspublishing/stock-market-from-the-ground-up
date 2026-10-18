import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// All provider and Supabase HTTP traffic below is mocked. The endpoint under
// test is the real Cloudflare source; no checkout creation or live grants.
const source=readFileSync(new URL('../functions/api/gu39-sandbox.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://example.com',endpoint=origin+'/api/gu39-sandbox';
const user='11111111-1111-4111-8111-111111111111',intent='22222222-2222-4222-8222-222222222222';
const sku='plan:FULL_MONTHLY';
const data={
 'plan:FULL_MONTHLY':['prod_VRvuGwLKI16MXU',6999,'month'],
 'plan:FULL_ANNUAL':['prod_VRvyBNhWk9jshb',69900,'year'],
 'plan:LIFETIME':['prod_VRwgISspL5mhls',249900,'one_time'],
 'plan:ONDEMAND_MONTHLY':['prod_VRwjus5sQLtTad',1999,'month'],
 'tool:INTERACTIVE_LEARNING':['prod_VRwmmu4zATdHAb',2999,'month'],
 'tool:JOURNAL_ANALYTICS':['prod_VRwoX4hTg8fRCm',2999,'month'],
 'tool:MARKET_SIMULATOR':['prod_VRwrsEpvfw60Xh',2999,'month'],
 'tool:MARKET_TUTOR':['prod_VRwuiqDt8qHayI',2999,'month']
};
const mapping=Object.fromEntries(Object.keys(data).map((k,i)=>[k,'price_mock000000'+String(i+1).padStart(6,'0')]));
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',
 GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify(mapping),
 GU_PAYMENT_LIVE_LAUNCH_APPROVED:'false'};
const events=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed',
 'customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const created='2026-10-17T00:39:34.300576Z';
const providerSession={id:'cs_test_mock0033333',livemode:false,
 client_reference_id:intent,metadata:{gu39_shadow_intent:intent},currency:'usd',
 amount_subtotal:6999,status:'open',mode:'subscription'};
const state={unbound:true,mode:'NO_MATCH',role:'OWNER',stepup:true,dbWrites:0,providerWrites:0,scans:0,
 postBody:null,partial:false,secretLeaked:false};
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}});
const req=()=>new Request(endpoint+'?view=complete-review&sku='+encodeURIComponent(sku),{
 headers:{authorization:'Bearer owner-jwt'}});
const post=()=>new Request(endpoint,{method:'POST',
 headers:{authorization:'Bearer owner-jwt',origin,'content-type':'application/json'},
 body:JSON.stringify({action:'reconcile',intentId:intent})});
const prev=globalThis.fetch;
globalThis.fetch=async(url,opt={})=>{
 const u=String(url),method=opt.method||'GET';
 if(u.includes('api.stripe.com')&&method!=='GET'){state.providerWrites++;throw Error('Provider write forbidden')}
 if(u.endsWith('/auth/v1/user'))return json({id:user});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return json({ok:true,role:state.role});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return json(state.stepup);
 if(u.endsWith('/rpc/gu39_sandbox_owner_read'))return json({ok:true,role:state.role,enabled:true,
  updatedAt:created,intentCount:Number(state.unbound),processedEventCount:0,shadowAccessCount:0});
 if(u.endsWith('/v1/account'))return json({id:'acct_1URGkDJY9FI7byHB'});
 if(u.includes('/v1/webhook_endpoints?'))return json({has_more:false,data:[{
  url:origin+'/api/gu39-stripe-webhook',livemode:false,status:'enabled',enabled_events:events}]});
 if(u.includes('/v1/checkout/sessions/')&&u.includes('/line_items?')){
  return json({data:[{price:{id:mapping[sku]},quantity:1}]});
 }
 if(u.includes('/v1/checkout/sessions?')){
  state.scans++;
  if(state.mode==='UNAVAILABLE')return json({error:{message:'Test outage'}},503);
  if(state.mode==='INCOMPLETE')return json({has_more:true,data:[{id:'cs_test_paginated0000000'}]});
  if(state.mode==='MATCH')return json({has_more:false,data:[providerSession]});
  if(state.mode==='DUPLICATE')return json({has_more:false,data:[providerSession,{...providerSession,id:'cs_test_other00000'}]});
  return json({has_more:false,data:[]});
 }
 if(u.includes('/v1/prices/')){
  const id=u.split('/').at(-1),key=Object.keys(mapping).find(x=>mapping[x]===id);
  if(!key)return json({error:{code:'resource_missing'}},404);
  const [product,amount,interval]=data[key];
  return json({id,product,unit_amount:amount,livemode:false,active:true,currency:'usd',
   type:interval==='one_time'?'one_time':'recurring',
   recurring:interval==='one_time'?null:{interval}});
 }
 if(u.includes('/v1/products/'))return json({id:u.split('/').at(-1),name:'Test Product',
    active:true,livemode:false,tax_code:'txcd_10000000'});
 if(u.includes('/rest/v1/gu39_sandbox_settings?'))return json([{enabled:true}]);
 if(u.includes('/rest/v1/gu39_sandbox_intents?')&&method==='GET'&&u.includes('status=eq.prepared')){
  if(!state.unbound)return json([]);
  if(u.includes('order=created_at.asc'))return json([{
   id:intent,sku,stripe_price_id:mapping[sku],quoted_cents:6999,created_at:created,
   status:'prepared',session_id:null}]);
  return json([{id:intent,created_at:created}]);
 }
 if(u.includes('/rest/v1/gu39_sandbox_intents?')&&u.includes('select=id'))return json([]);
 if(u.includes('/rest/v1/admin_audit_log')&&method==='POST'){
  assert.equal(JSON.parse(opt.body).action,'commerce.stripe.shadow.reconcile.v014056');
  return json([{id:3}]);
 }
 if(u.includes('/rest/v1/gu39_sandbox_intents?')&&method==='PATCH'){
  state.dbWrites++;state.postBody=JSON.parse(opt.body);
  assert.equal(state.postBody.status,state.mode==='MATCH'?'checkout_created':'test_failed');
  if(state.mode==='MATCH')assert.equal(state.postBody.session_id,providerSession.id);
  state.unbound=false;
  return json([{id:intent,...state.postBody}]);
 }
 throw Error('Unexpected route '+method+' '+u);
};
try{
 let r=await api.onRequestGet({request:req(),env});assert.equal(r.status,200,await r.clone().text());
 let d=await r.json();
 assert.equal(d.version,'0.14.0.56');
 assert.equal(d.pending.totalUnbound,1);
 assert.equal(d.pending.results[0].status,'NO_MATCH_FOUND');
 assert.equal(d.pending.safeToReconcile,true);
 assert.equal(d.readyForSingleSandboxCheckout,false);
 assert.equal(d.catalog.productsVerified,8);
 assert.equal(d.catalog.pricesVerified,8);
 assert.equal(d.production.liveCheckoutApproved,false);
 assert.equal(d.checksPassed,16);
 assert.equal(d.totalChecks,17);
 assert.equal(state.dbWrites,0);assert.equal(state.providerWrites,0);
 assert(!JSON.stringify(d).includes(env.GU39_STRIPE_TEST_SECRET_KEY));
 // Explicit Owner-confirmed, one-row TEST-only reconciliation, no charge.
 r=await api.onRequestPost({request:post(),env});
 assert.equal(r.status,200,await r.clone().text());
 d=await r.json();assert.equal(d.action,'MARKED_UNBOUND_TEST_FAILED');
 assert.equal(d.auditRecorded,true);
 assert.equal(state.dbWrites,1);assert.equal(state.providerWrites,0);
 r=await api.onRequestGet({request:req(),env});d=await r.json();
 assert.equal(d.readyForSingleSandboxCheckout,true);
 assert.equal(d.checksPassed,17);
 assert.equal(d.totalChecks,17);
 assert.equal(d.pending.totalUnbound,0);
 // Second attempt is rejected instead of modifying anything twice.
 r=await api.onRequestPost({request:post(),env});
 assert.equal(r.status,403);assert.equal(state.dbWrites,1);
 // Provider match case: exact session client ref, metadata, price, amount, test status.
 state.unbound=true;state.mode='MATCH';state.dbWrites=0;
 r=await api.onRequestGet({request:req(),env});d=await r.json();
 assert.equal(d.pending.results[0].status,'MATCHED_VERIFIED_SESSION');
 assert.equal(d.pending.safeToReconcile,true);
 r=await api.onRequestPost({request:post(),env});d=await r.json();
 assert.equal(d.action,'BOUND_VERIFIED_TEST_SESSION');
 assert.equal(d.auditRecorded,true);
 assert.equal(state.dbWrites,1);
 // Ambiguous/missing provider permissions must fail CLOSED.
 state.unbound=true;state.mode='DUPLICATE';
 r=await api.onRequestGet({request:req(),env});d=await r.json();
 assert.equal(d.pending.safeToReconcile,false);
 state.mode='INCOMPLETE';r=await api.onRequestGet({request:req(),env});d=await r.json();
 assert.equal(d.pending.results[0].status,'STRIPE_SCAN_INCOMPLETE');
 assert.equal(d.pending.safeToReconcile,false);
 state.mode='UNAVAILABLE';r=await api.onRequestGet({request:req(),env});d=await r.json();
 assert.equal(d.pending.safeToReconcile,false);
 // ADMIN cannot run Owner-only combined review or reconciliation.
 state.role='ADMIN';r=await api.onRequestGet({request:req(),env});assert.equal(r.status,403);
 r=await api.onRequestPost({request:post(),env});assert.equal(r.status,403);
 assert.equal(state.providerWrites,0);
 console.log('PASS v56: comprehensive 17 checks, read-only Stripe session correlation, safe TEST-only reconciliation, incomplete pagination and role denial.');
}finally{globalThis.fetch=prev}
