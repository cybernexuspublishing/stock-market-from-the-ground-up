/* D15: check all LIVE webhook codepaths bound physical HTTP body before
 * signature, QA, Stripe or Supabase calls. No real network/payment.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync('functions/api/stripe-live-webhook-v01458.js','utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const prior=globalThis.fetch;
let remotes=0;
globalThis.fetch=async()=>{remotes++;throw Error('No provider call allowed')};
const url='https://site.example/api/stripe-live-webhook';
const send=async(body,headers={},env={})=>{
 const req=new Request(url,{method:'POST',headers,body});
 return onRequestPost({request:req,env});
};
const tooBig='{"data":"'+'X'.repeat(262145)+'"}';
try{
 let x=await send(tooBig);assert.equal(x.status,413,'missing Content-Length still bounded');
 x=await send(tooBig,{'content-length':'1'});assert.equal(x.status,413,'lying Content-Length still bounded');
 x=await send('{"ok":true}',{'content-length':'262145'});assert.equal(x.status,413,'declared oversize rejected');
 x=await send('{"ok":true}',{'content-length':'-1'});assert.equal(x.status,413,'invalid declared length rejected');
 x=await send('{"type":"checkout.session.completed","data":{"object":{"metadata":{"gu72_zero_monthly_qa":"true"}}}}'+'X'.repeat(262145),{},{
  GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED:'true'
 });assert.equal(x.status,413,'zero-dollar QA must not materialize oversized body');
 x=await send(new Uint8Array([0xc3,0x28]));assert.equal(x.status,400,'invalid UTF-8 denied');
 x=await send('{}');assert.equal(x.status,503,'small JSON keeps existing paid launch gate disabled');
 x=await send('null',{}, {GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED:'true'});
 assert.equal(x.status,503,'null JSON is not a zero-dollar QA event');
 // Signed null JSON with LIVE fulfillment enabled must fail as a client error,
 // before any Stripe account lookup or entitlement RPC.
 const {webcrypto}=await import('node:crypto');
 const time=String(Math.floor(Date.now()/1000)),secret='whsec_mocksecure';
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=Buffer.from(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(time+'.null'))).toString('hex');
 x=await send('null',{'stripe-signature':'t='+time+',v1='+mac},{
   SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test',
   GU58_LIVE_WEBHOOK_ENABLED:'true',GU58_LIVE_FULFILLMENT_APPROVED:'true',
   GU58_LIVE_DB_CONTRACT_APPROVED:'true',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_test',
   GU58_STRIPE_LIVE_WEBHOOK_SECRET:secret,GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mocklive1234'
 });assert.equal(x.status,400,'validly signed JSON null must not throw or reach Stripe');

 assert.equal(remotes,0,'oversized and disabled-mode events must not call Stripe/Supabase');
 assert.match(code,/boundedStripeBody\(request\)/);
 assert.doesNotMatch(code,/request\.clone\(\)\.text\(\)|request\.text\(\)/);
 console.log('PASS D15: webhook streaming 256 KiB cap precedes QA/signature/provider calls');
}finally{globalThis.fetch=prior}
