/* Uses existing unchanged webhook; only rejects unauthenticated/foreign events. */
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/lemon-webhook.js';
let called=false;
const prior=globalThis.fetch;globalThis.fetch=async()=>{called=true;throw Error('Database call must not happen for invalid signature')};
try{
 const env={LEMON_SQUEEZY_WEBHOOK_SECRET:'dummy-webhook-test-secret',LEMON_SQUEEZY_TEST_MODE:'true',LEMON_SQUEEZY_STORE_ID:'111'};
 const body=JSON.stringify({meta:{test_mode:true,event_name:'order_created'},data:{id:'123',attributes:{store_id:'111',total:1999,currency:'USD'}}});
 let r=await onRequestPost({request:new Request('https://site.example/api/lemon-webhook',{method:'POST',headers:{'x-signature':'0'.repeat(64),'x-event-name':'order_created','content-type':'application/json'},body}),env});
 assert.equal(r.status,401);assert.equal(called,false);
 r=await onRequestPost({request:new Request('https://site.example/api/lemon-webhook',{method:'POST',headers:{'x-signature':'garbage','content-type':'application/json'},body}),env});
 assert.equal(r.status,401);assert.equal(called,false);
 r=await onRequestPost({request:new Request('https://site.example/api/lemon-webhook',{method:'POST',headers:{'x-signature':'0'.repeat(64),'content-type':'application/json'},body}),env:{}});
 assert.equal(r.status,503);
 console.log('PASS existing Lemon webhook: invalid HMAC and absent secret fail closed before database access.');
}finally{globalThis.fetch=prior}
