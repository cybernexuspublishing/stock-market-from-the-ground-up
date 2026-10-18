/* v0.14.0.71 — actual GU58 webhook handler, signed no-charge QA event, no Supabase. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../functions/api/stripe-live-webhook-v01458.js',import.meta.url),'utf8');
const h=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const uid='11111111-1111-4111-8111-111111111111';
const sid='cs_live_zeroQa12345',pid='price_gu71Zero123';
const secret='whsec_testingmock',account='acct_correct12345';
const env={GU71_ZERO_LIVE_QA_ENABLED:'true',GU71_ZERO_LIVE_PRICE_ID:pid,
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',GU58_STRIPE_LIVE_WEBHOOK_SECRET:secret,
 GU58_STRIPE_LIVE_ACCOUNT_ID:account,
 GU58_LIVE_WEBHOOK_ENABLED:'false',GU58_LIVE_FULFILLMENT_APPROVED:'false',
 GU58_LIVE_DB_CONTRACT_APPROVED:'false'};
const state={amount:0,owner:uid,price:pid,status:'complete',client:uid,lineAmount:0,
 calls:0,providerWrites:0,dbCalls:0};
const response=(x)=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const old=globalThis.fetch;
globalThis.fetch=async(url,opt={})=>{
 const u=String(url),m=opt.method||'GET';
 if(u.includes('.supabase.co')){state.dbCalls++;throw Error('NO_DB_ACCESSES')}
 if(m!=='GET'){state.providerWrites++;throw Error('NO_STRIPE_WRITES')}
 state.calls++;
 if(u.endsWith('/v1/account'))return response({id:account});
 if(u.endsWith('/v1/checkout/sessions/'+sid))return response({id:sid,livemode:true,mode:'payment',
   status:state.status,amount_total:state.amount,amount_subtotal:state.amount,currency:'usd',
   payment_intent:null,subscription:null,
   client_reference_id:state.client,metadata:{gu71_zero_qa:'true',gu71_owner:state.owner,
    gu71_price_id:pid}});
 if(u.includes('/line_items?'))return response({data:[{price:{id:state.price},quantity:1,amount_total:state.lineAmount}]});
 throw Error('Unexpected provider GET '+u);
};
const event={id:'evt_live_zeroQA123456',livemode:true,created:Math.floor(Date.now()/1000),
 type:'checkout.session.completed',data:{object:{id:sid,metadata:{gu71_zero_qa:'true'}}}};
async function send(e=event,body){
 const raw=body??JSON.stringify(e),stamp=String(Math.floor(Date.now()/1000));
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=Buffer.from(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(stamp+'.'+raw))).toString('hex');
 return h.onRequestPost({request:new Request('https://stock-market-from-the-ground-up.pages.dev/api/stripe-live-webhook',
  {method:'POST',body:raw,headers:{'stripe-signature':'t='+stamp+',v1='+mac}}),env});
}
try{
 let r=await send();
 assert.equal(r.status,200);assert.equal(await r.text(),'qa-zero-signed-verified-no-grant');
 assert.equal(state.dbCalls,0);assert.equal(state.providerWrites,0);
 state.amount=1;r=await send({...event,id:'evt_live_zeroQA123457'});
 assert.equal(r.status,503,'Any nonzero LIVE session must never count as a free QA');
 state.amount=0;state.price='price_someOther123';r=await send();
 assert.equal(r.status,503,'Price change cannot count as QA');
 state.price=pid;state.owner='22222222-2222-4222-8222-222222222222';
 r=await send();assert.equal(r.status,503,'Owner metadata must match Stripe reference');
 state.owner=uid;
 r=await send({...event,data:{object:{id:sid,metadata:{gu71_zero_qa:'false'}}}});
 assert.equal(r.status,503,'Unknown event cannot bypass locked GU58 grant gate');
 assert.equal(state.dbCalls,0);assert.equal(state.providerWrites,0);
 console.log('PASS v71: HMAC-signed $0 LIVE Checkout isolated acknowledgement with GU58 fulfillment OFF, rejects nonzero/different Price and mismatched Owner, zero Supabase grants.');
}finally{globalThis.fetch=old}
