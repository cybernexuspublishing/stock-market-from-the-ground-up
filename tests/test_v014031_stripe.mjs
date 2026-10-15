import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {onRequest as checkout} from '../functions/api/signed-book-checkout.js';
import {onRequestPost as webhook} from '../functions/api/signed-book-stripe-webhook.js';
globalThis.crypto??=webcrypto;
const env={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub',SUPABASE_SECRET_KEY:'svc',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_SIGNED_WEBHOOK_SECRET:'whsec_fake',STRIPE_SIGNED_TEST_MODE:'true',PUBLIC_SITE_URL:'https://stock.example',ENABLE_SIGNED_BOOK_STRIPE:'true',STRIPE_SIGNED_TAX_ENABLED:'true'};
const order='12345678-1234-4234-8234-123456789012',sid='cs_test_s123',pi='pi_test_123';
let calls=[];const old=globalThis.fetch;
function fakeFetch(input,opt={}){
 const url=String(input);calls.push({url,method:opt.method||'GET',body:String(opt.body||''),auth:opt.headers?.authorization||''});
 if(url.endsWith('/auth/v1/user'))return Promise.resolve(Response.json({id:'8d123456-1234-4234-8234-123456789012',email:'buyer@example.test'}));
 if(url.includes('/rpc/gu_signed_quote_v01431'))return Promise.resolve(Response.json({available:true,code:'FOUNDATION_BOOK_1',edition:'paperback',priceCents:2999,shippingCents:699,title:'Book I'}));
 if(url.includes('/rpc/gu_signed_order_start_v01431'))return Promise.resolve(Response.json({ok:true,id:order,priceCents:'2999',shippingCents:'699',title:'Book I',edition:'paperback'}));
 if(url.includes('/rpc/gu_signed_order_attach_v01431'))return Promise.resolve(Response.json(true));
 if(url.includes('/rpc/gu_signed_stripe_paid_v01431'))return Promise.resolve(Response.json({ok:true,duplicate:false}));
 if(url.includes('/rpc/gu_signed_stripe_reversal_v01431'))return Promise.resolve(Response.json({ok:true,duplicate:false}));
 if(url.includes('/v1/payment_intents/'))return Promise.resolve(Response.json({id:pi,metadata:{signed_book_v01431:'true',gu_order_id:order}}));
 if(url==='https://api.stripe.com/v1/checkout/sessions')return Promise.resolve(Response.json({id:sid,url:'https://checkout.stripe.com/c/pay/test'}));
 throw Error('Unexpected request '+url);
}
globalThis.fetch=fakeFetch;
const quoteReq=()=>new Request('https://stock.example/api/signed-book-checkout?action=quote&code=FOUNDATION_BOOK_1&edition=paperback');
const createReq=()=>new Request('https://stock.example/api/signed-book-checkout?action=create',{method:'POST',headers:{authorization:'Bearer userjwt',origin:'https://stock.example','content-type':'application/json'},body:JSON.stringify({code:'FOUNDATION_BOOK_1',edition:'paperback',priceCents:1})});
try{
 calls=[];const q=await checkout({request:quoteReq(),env});assert.equal(q.status,200);assert((await q.json()).available);assert.equal(calls.length,1);
 calls=[];let off=await checkout({request:createReq(),env:{...env,ENABLE_SIGNED_BOOK_STRIPE:'false'}});assert.equal(off.status,503);assert.equal(calls.length,0);
 calls=[];const r=await checkout({request:createReq(),env});assert.equal(r.status,200);assert.equal((await r.json()).url,'https://checkout.stripe.com/c/pay/test');
 let paid=calls.find(x=>x.url==='https://api.stripe.com/v1/checkout/sessions');assert(paid);
 const params=new URLSearchParams(paid.body);
 assert.equal(params.get('line_items[0][price_data][unit_amount]'),'2999');assert.equal(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'699');
 assert.equal(params.get('shipping_address_collection[allowed_countries][0]'),'US');
 assert.equal(params.get('automatic_tax[enabled]'),'true');assert.equal(params.get('consent_collection[terms_of_service]'),'required');
 assert.equal(params.get('payment_intent_data[metadata][gu_order_id]'),order);
 assert.equal(params.get('client_reference_id'),order);assert(!paid.body.includes('1.00'));
 const event={id:'evt_paid123',livemode:false,type:'checkout.session.completed',data:{object:{id:sid,mode:'payment',payment_status:'paid',payment_intent:pi,client_reference_id:order,metadata:{gu_order_id:order},currency:'usd',amount_subtotal:2999,amount_total:3698,shipping_cost:{amount_total:699}}}};
 function signed(obj,ts=Math.floor(Date.now()/1000),secret='whsec_fake'){
  const body=JSON.stringify(obj),sig=createHmac('sha256',secret).update(ts+'.'+body).digest('hex');return new Request('https://stock.example/api/signed-book-stripe-webhook',{method:'POST',headers:{'stripe-signature':`t=${ts},v1=${sig}`,'content-type':'application/json'},body});
 }
 calls=[];assert.equal((await webhook({request:signed(event,1),env})).status,400);assert.equal(calls.length,0);
 calls=[];const paidResult=await webhook({request:signed(event),env});assert.equal(paidResult.status,200);
 const payment=calls.find(x=>x.url.includes('/rpc/gu_signed_stripe_paid_v01431'));assert(payment);const data=JSON.parse(payment.body);assert.equal(data.p_order,order);assert.equal(data.p_total,3698);
 calls=[];const refund={id:'evt_ref123',livemode:false,type:'charge.refunded',data:{object:{id:'ch_123',payment_intent:pi}}};
 assert.equal((await webhook({request:signed(refund),env})).status,200);
 assert(calls.some(x=>x.url.endsWith('/v1/payment_intents/'+pi)));
 assert(calls.some(x=>x.url.includes('/rpc/gu_signed_stripe_reversal_v01431')));
 calls=[];assert.equal((await webhook({request:new Request('https://stock.example/api/signed-book-stripe-webhook',{method:'POST',body:'{}',headers:{'stripe-signature':'t=100,v1=bad'}}),env})).status,400);assert.equal(calls.length,0);
 console.log('PASS v014031: independent tax/shipping quote, checkout gating, provider metadata, raw HMAC, payment & refund reconciliation, bad signature denied.');
}finally{globalThis.fetch=old}
