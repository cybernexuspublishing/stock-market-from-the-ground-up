import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestPost as checkout,onRequestGet as checkoutGet} from '../functions/api/book-stripe-test-checkout-v1.js';
import {onRequestPost as webhook} from '../functions/api/book-stripe-test-webhook-v1.js';
import {onRequestPost as download} from '../functions/api/book-stripe-test-download-v1.js';
import {BOOK_CODE,TEST_PRICE,TEST_PRODUCT,TEST_ACCOUNT} from '../functions/_lib/book-stripe-test-v1.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const id='d01d1d1d-1d1d-41d1-81d1-1d1d1d1d1d1d',uid='0a507eeb-e9ff-44a2-b61e-c53e9073981c';
const sid='cs_test_qa261027',pi='pi_qa261027',charge='ch_qa261027',secret='whsec_dummy_test_secret_12345';
const path=BOOK_CODE+'/f489c372-247e-4883-9688-88c27b54a6d9.epub';
const env={GU_BOOK_STRIPE_TEST_ENABLED:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_123456789012345678',
 GU_BOOK_STRIPE_TEST_WEBHOOK_SECRET:secret,SUPABASE_URL:'https://test.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const res=(x,s=200)=>Response.json(x,{status:s});
const req=(route,body,auth=true)=>new Request('https://site.example'+route,{method:'POST',headers:{
 origin:'https://site.example','content-type':'application/json',...(auth?{authorization:'Bearer test.jwt'}:{})},body:JSON.stringify(body)});
const session={id:sid,mode:'payment',livemode:false,status:'complete',payment_status:'paid',payment_intent:pi,
 currency:'usd',amount_subtotal:1099,client_reference_id:id,
 metadata:{gu_book_test_intent:id,gu_book_test_member:uid,gu_book_test_code:BOOK_CODE},
 url:'https://checkout.stripe.com/c/pay/test_only'};
let applied=[],signed=0,allow=false;const original=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url),p=u.pathname;
 if(p==='/auth/v1/user')return res({id:uid});
 if(p==='/v1/account')return res({id:TEST_ACCOUNT});
 if(p==='/v1/prices/'+TEST_PRICE)return res({id:TEST_PRICE,product:TEST_PRODUCT,unit_amount:1099,currency:'usd',livemode:false,active:true,type:'one_time'});
 if(p==='/v1/checkout/sessions'&&options.method==='POST'){
  const v=new URLSearchParams(options.body);assert.equal(v.get('line_items[0][price]'),TEST_PRICE);
  return res({...session,status:'open',payment_status:'unpaid'});
 }
 if(p==='/v1/checkout/sessions/'+sid)return res(session);
 if(p==='/v1/checkout/sessions/'+sid+'/line_items')return res({data:[{price:{id:TEST_PRICE},quantity:1,amount_subtotal:1099}],has_more:false});
 if(p==='/v1/payment_intents/'+pi)return res({id:pi,livemode:false,status:'succeeded',currency:'usd',amount_received:1099,metadata:{gu_book_test_intent:id}});
 if(p==='/v1/charges/'+charge)return res({id:charge,livemode:false,payment_intent:pi,amount_refunded:1099});
 if(p==='/v1/checkout/sessions'&&u.searchParams.has('payment_intent'))return res({data:[session],has_more:false});
 if(p==='/rest/v1/rpc/gu_book_test_reserve_v1')return res({ok:true,id,existing:false});
 if(p==='/rest/v1/rpc/gu_book_test_bind_v1')return res({ok:true});
 if(p==='/rest/v1/rpc/gu_book_test_apply_v1'){
  const v=JSON.parse(options.body),duplicate=applied.some(x=>x.p_event===v.p_event);applied.push(v);
  return res({ok:true,duplicate});
 }
 if(p==='/rest/v1/rpc/gu_book_test_file_v1')return res(allow?{allowed:true,path}:{allowed:false});
 if(p.startsWith('/storage/v1/object/sign/gu-digital-ebooks/')){
  assert.equal(JSON.parse(options.body).expiresIn,60);signed++;
  return res({signedURL:'/object/sign/gu-digital-ebooks/'+path+'?token=qa-test'});
 }
 throw Error('Unexpected call '+url);
};
async function evt(eventId,type,obj){
 const body=JSON.stringify({id:eventId,type,livemode:false,data:{object:obj}}),t=Math.floor(Date.now()/1000),enc=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,enc.encode(t+'.'+body));
 const signature=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 return new Request('https://site.example/api/book-stripe-test-webhook-v1',{method:'POST',
 headers:{'stripe-signature':'t='+t+',v1='+signature},body});
}
try{
 assert.equal((await (await checkoutGet({env:{}})).json()).ready,false);
 assert.equal((await (await checkoutGet({env})).json()).ready,true,'Only verified TEST provider and price may report ready');
 assert.equal((await checkout({env:{},request:req('/api/book-stripe-test-checkout-v1',{code:BOOK_CODE,format:'epub'})})).status,503);
 assert.equal((await checkout({env,request:req('/api/book-stripe-test-checkout-v1',{code:BOOK_CODE,format:'epub'},false)})).status,401);
 assert.equal((await checkout({env,request:req('/api/book-stripe-test-checkout-v1',{code:BOOK_CODE,format:'pdf'})})).status,400);
 assert.equal((await checkout({env,request:req('/api/book-stripe-test-checkout-v1',{code:BOOK_CODE,format:'epub'})})).status,200);
 const invalid=await webhook({env,request:new Request('https://site.example/api/book-stripe-test-webhook-v1',{
  method:'POST',headers:{'stripe-signature':'t=1,v1='+'a'.repeat(64)},body:'{}'})});
 assert.equal(invalid.status,400);assert.equal(applied.length,0);
 const paid=await webhook({env,request:await evt('evt_qaPaid261027','checkout.session.completed',{id:sid})});
 assert.equal(paid.status,200);assert.equal(applied.at(-1).p_kind,'paid');
 const replay=await webhook({env,request:await evt('evt_qaPaid261027','checkout.session.completed',{id:sid})});
 assert.equal((await replay.json()).duplicate,true);
 assert.equal((await download({env,request:req('/api/book-stripe-test-download-v1',{code:BOOK_CODE,format:'epub'})})).status,403);
 assert.equal(signed,0);
 allow=true;
 const d=await download({env,request:req('/api/book-stripe-test-download-v1',{code:BOOK_CODE,format:'epub'})});
 assert.equal(d.status,200);assert.equal((await d.json()).expiresInSeconds,60);assert.equal(signed,1);
 assert.equal((await webhook({env,request:await evt('evt_qaRefund261027','charge.refunded',{id:charge})})).status,200);
 assert.equal(applied.at(-1).p_kind,'refunded');
 assert.equal((await webhook({env,request:await evt('evt_qaDispute261027','charge.dispute.created',{charge})})).status,200);
 assert.equal(applied.at(-1).p_kind,'disputed');
 assert.equal((await webhook({env:{...env,GU_BOOK_STRIPE_TEST_ENABLED:'false'},request:await evt('evt_qaRefundAfterOff261027','charge.refunded',{id:charge})})).status,200);
 console.log('PASS isolated Stripe TEST ebook: checkout, HMAC paid/replay, guarded download, refund, dispute, post-pause reversal');
}finally{globalThis.fetch=original;}
