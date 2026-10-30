import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {onRequestPost} from '../functions/api/stripe-test-webhook.js';
globalThis.crypto ||= webcrypto;
const now=Math.floor(Date.now()/1000),secret='whsec_unit_test_secret_2026',endpoint='https://example.com/api/stripe-test-webhook';
const env={STRIPE_TEST_WEBHOOK_SECRET:secret};
const signed=(body,t=now,key=secret)=>'t='+t+',v1='+createHmac('sha256',key).update(t+'.'+body).digest('hex');
const event={id:'evt_TESTWEBHOOK2026',created:now,livemode:false,type:'customer.created',data:{object:{id:'cus_TESTONE'}}};
const send=async (payload,header)=>onRequestPost({request:new Request(endpoint,{method:'POST',headers:{'stripe-signature':header,'content-type':'application/json'},body:payload}),env});
const body=JSON.stringify(event);
assert.equal((await send(body,signed(body))).status,200,'signed unrelated event ignored');
assert.equal((await send(body,signed(body,now-800))).status,401,'expired signature rejected');
assert.equal((await send(body,signed(body,now,'whsec_wrong'))).status,401,'wrong secret rejected');
assert.equal((await send(body.replace('customer.created','invoice.paid'),signed(body))).status,401,'tampered payload rejected');
assert.equal((await send(JSON.stringify({...event,livemode:true}),signed(JSON.stringify({...event,livemode:true})))).status,400,'LIVE Stripe event rejected');
assert.equal((await send(JSON.stringify({...event,account:'acct_WRONG'}),signed(JSON.stringify({...event,account:'acct_WRONG'})))).status,400,'foreign account rejected');
console.log('PASS unified TEST endpoint signature, timestamp, tampering, mode and account isolation');


const liveFetch=globalThis.fetch;
const testEnv={...env,STRIPE_TEST_SECRET_KEY:'sk_test_UNIT_TEST_ONLY'};
const route=async (metadata)=> {
 const e={id:'evt_ROUTE2026103001',created:now,livemode:false,type:'checkout.session.completed',
   data:{object:{id:'cs_test_20261030UNIFIED'}}};
 const payload=JSON.stringify(e);
 globalThis.fetch=async (url)=> {
  assert(String(url).includes('/v1/checkout/sessions/cs_test_20261030UNIFIED'));
  return new Response(JSON.stringify({id:'cs_test_20261030UNIFIED',livemode:false,metadata}),{status:200,headers:{'content-type':'application/json'}});
 };
 return onRequestPost({request:new Request(endpoint,{method:'POST',headers:{'stripe-signature':signed(payload)},body:payload}),env:testEnv});
};
try {
 const book=await route({gu_book_test_intent:'book-intent-test'});
 assert.match(await book.text(),/Book TEST webhook unavailable/,'book event reaches book-specific handler');
 const member=await route({});
 assert.equal(await member.text(),'SHADOW_SANDBOX_DISABLED','non-book checkout reaches guarded membership handler');
}finally {globalThis.fetch=liveFetch}
console.log('PASS distinct book versus membership provider-backed TEST routing');
