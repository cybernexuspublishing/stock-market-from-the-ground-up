import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/chart-mixed-test-checkout.js';
const user='11111111-1111-4111-8111-111111111111';
const order='22222222-2222-4222-8222-222222222222';
const sessionId='cs_test_mockpendingopen12345';
const sku='CHART_PROFESSIONAL_30D';
const env={SUPABASE_URL:'https://chartmixedcancelmock.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 CHART_MIXED_TEST_ENABLED:'true',CHART_STUDIO_TEST_CHECKOUT_ENABLED:'true'};
const pending={id:order,user_id:user,sku,state:'pending',stripe_session_id:sessionId,stripe_price_id:'price_mock123456',amount_cents:1999};
const session={id:sessionId,client_reference_id:order,mode:'payment',amount_subtotal:1999,
 status:'open',payment_status:'unpaid',payment_intent:null,livemode:false,
 metadata:{chart_cash_test_id:order,chart_cash_test_user:user,chart_cash_test_sku:sku}};
let expires=0,hasPending=true,mode='open',otherSession=false;
const original=globalThis.fetch;
const ok=(data)=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
globalThis.fetch=async(input,init={})=>{
 const u=new URL(input),p=u.pathname;
 if(u.hostname==='chartmixedcancelmock.supabase.co'){
  if(p==='/auth/v1/user')return ok({id:user});
  if(p==='/auth/v1/admin/users/'+user)return ok({id:user,email_confirmed_at:'2026-10-30T00:00:00Z',
   app_metadata:{smfgu_qa_only:true,noncommercial:true,qa_chart_batch:'SMFGU-CHART-3-20261028'}});
  if(p==='/rest/v1/crownlight_chart_cash_upgrades_v1')return ok(hasPending?[pending]:[]);
  if(p==='/rest/v1/crownlight_chart_mixed_test_v1')return ok([]);
 }
 if(u.hostname==='api.stripe.com'){
  if(p==='/v1/checkout/sessions/'+sessionId)return ok({...session,status:mode,
   metadata:otherSession?{...session.metadata,chart_cash_test_user:'other-user'}:session.metadata,
   payment_intent:mode==='complete'?'pi_test_paid':null,payment_status:mode==='complete'?'paid':'unpaid'});
  if(p==='/v1/checkout/sessions/'+sessionId+'/expire'){
   assert.equal(init.method,'POST');
   assert.equal(mode,'open');
   expires++;mode='expired';return ok({...session,status:'expired'});
  }
 }
 throw Error('Unexpected request '+input);
};
const call=async()=>onRequestPost({env,request:new Request('https://market.example/api/chart-mixed-test-checkout',{
 method:'POST',headers:{origin:'https://market.example','content-type':'application/json',authorization:'Bearer qa-token'},
 body:JSON.stringify({action:'cancel_card_pending',sku})})});
try{
 let result=await call(),body=await result.json();
 assert.equal(result.status,200);assert.equal(body.ok,true);assert.equal(body.awaitingSignedWebhook,true);
 assert.equal(expires,1,'Only one Stripe TEST session expiry');
 result=await call();body=await result.json();assert.equal(body.canceled,true);assert.equal(expires,1,'Repeated cancellation does not re-expire');
 hasPending=false;result=await call();body=await result.json();assert.equal(result.status,409);
 assert.equal(body.error,'NO_SINGLE_PENDING_CARD_CHECKOUT');
 hasPending=true;mode='complete';result=await call();body=await result.json();
 assert.equal(result.status,409);assert.equal(body.error,'PAYMENT_RECONCILIATION_REQUIRED');
 assert.equal(expires,1,'Paid session must never be expired');
 mode='open';otherSession=true;result=await call();body=await result.json();
 assert.equal(result.status,409);assert.equal(body.error,'CARD_CHECKOUT_PROVIDER_MISMATCH');
 assert.equal(expires,1,'Foreign session must never be expired');
 console.log('PASS: unpaid TEST session expires once; cross-order, paid, duplicate and missing-session cases fail closed.');
}finally{globalThis.fetch=original}
