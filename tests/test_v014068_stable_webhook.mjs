/* v0.14.0.68: stable LIVE endpoint enforces GU58 signed event gates.
 * No provider requests, charges or database writes in this isolated smoke test.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestPost,onRequestGet} from '../functions/api/stripe-live-webhook.js';
const oldFetch=globalThis.fetch;
let calls=0;
globalThis.fetch=async()=>{calls++;throw Error('No external calls permitted');};
const origin='https://stock-market-from-the-ground-up.pages.dev';
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU58_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_mock',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mock123456',
 GU58_LIVE_WEBHOOK_ENABLED:'true',GU58_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_LIVE_DB_CONTRACT_APPROVED:'true',GU_PAYMENT_LIVE_LAUNCH_APPROVED:'false'};
const req=(body,sig)=>new Request(origin+'/api/stripe-live-webhook',{
 method:'POST',body,headers:{'stripe-signature':sig}});
try{
 const checked=new URL('../functions/api/stripe-live-webhook.js',import.meta.url);
 const source=readFileSync(checked,'utf8');
 assert(source.includes("from './stripe-live-webhook-v01458.js'"));
 let r=onRequestGet();assert.equal(r.status,405);
 r=await onRequestPost({request:req('{}','invalid'),env:{}});
 assert.equal(r.status,503,'Never accept without fulfillment approvals');
 r=await onRequestPost({request:req('{}','invalid'),env});
 assert.equal(r.status,401,'Never accept unsigned event');
 const raw=JSON.stringify({id:'evt_mock123456',livemode:true,created:Math.floor(Date.now()/1000),
  type:'checkout.session.completed',data:{object:{id:'cs_live_mock12345'}}});
 const ts=String(Math.floor(Date.now()/1000));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.GU58_STRIPE_LIVE_WEBHOOK_SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw))).toString('hex');
 r=await onRequestPost({request:req(raw,'t='+ts+',v1='+mac),env:{...env,GU58_LIVE_WEBHOOK_ENABLED:'false'}});
 assert.equal(r.status,503,'No signed event processing without the approved webhook gate');
 assert.equal(calls,0,'The mocked source must never contact LIVE Stripe or Supabase');
 const audit=readFileSync(new URL('../functions/api/stripe-live-merchant-readiness-v01467.js',import.meta.url),'utf8');
 assert(audit.includes("origin+'/api/stripe-live-webhook'"),'Readiness checks the permanent URL');
 assert(!audit.includes("origin+'/api/stripe-live-webhook-v01458'"));
 const book=readFileSync(new URL('../functions/api/signed-book-stripe-webhook.js',import.meta.url),'utf8');
 assert(book.includes('STRIPE_SIGNED_WEBHOOK_SECRET'),'Signed physical books keep a separately configured signed event contract');
 console.log('PASS v68: permanent Stripe LIVE URL, real signed GU58 handler delegation, rejected unsigned events, protected approved fulfillment and independent signed-book route.');
}finally{globalThis.fetch=oldFetch}
