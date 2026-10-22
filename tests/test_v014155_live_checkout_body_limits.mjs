/* D15: no LIVE calls; test body-size/JSON guard independently of provider flags. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync('functions/api/stripe-live-checkout-v01458.js','utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const origin='https://site.example',url=origin+'/api/stripe-live-checkout';
const saved=globalThis.fetch;let remote=0;
globalThis.fetch=async()=>{remote++;throw Error('No network may occur during request validation')};
const send=async(raw,headers={})=>{
 const request=new Request(url,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:raw});
 const reply=await onRequestPost({request,env:{}});
 return {status:reply.status,body:await reply.json()};
};
try{
 let r=await send(JSON.stringify({type:'plan',code:'FULL_MONTHLY',extra:'A'.repeat(3000)}));
 assert.equal(r.status,413,'JSON payload must be bounded when Content-Length is absent');
 assert.equal(remote,0);
 r=await send(JSON.stringify({type:'plan',code:'FULL_MONTHLY',extra:'A'.repeat(3000)}),{'content-length':'1'});
 assert.equal(r.status,413,'False claimed byte length cannot bypass actual-stream count');
 r=await send(JSON.stringify({type:'plan',code:'FULL_MONTHLY'}),{'content-length':'999999'});
 assert.equal(r.status,413,'Oversized declared length must not be read or invoke provider');
 r=await send('{');
 assert.equal(r.status,400,'Malformed checkout request must fail before provider');
 r=await send('[{"type":"plan","code":"FULL_MONTHLY"}]');
 assert.equal(r.status,400,'Array body cannot become a product request');
 r=await send(JSON.stringify({type:'unknown',code:'FULL_MONTHLY'}));
 assert.equal(r.status,400,'Unknown product type must be refused before database calls');
 r=await send(JSON.stringify({type:'plan',code:'UNREGISTERED_FAKE'}));
 assert.equal(r.status,400,'Only eight Owner-approved paid products can enter payment processing');
 r=await send(JSON.stringify({type:'plan',code:'FULL_MONTHLY'}));
 assert.equal(r.status,503,'Valid small body must retain independently disabled payment gates');
 assert.equal(remote,0,'No network/provisioning for invalid or environment-disabled checkout');
 assert.match(code,/boundedCheckoutInput\(req\)/);
 assert.match(code,/GU_PAYMENT_LIVE_LAUNCH_APPROVED/);
 assert.match(code,/GU58_LIVE_DB_CONTRACT_APPROVED/);
 console.log('PASS D15: streaming bytes enforce 2KB LIVE checkout input cap even when declared Content-Length lies, without calling provider');
}finally{globalThis.fetch=saved}
