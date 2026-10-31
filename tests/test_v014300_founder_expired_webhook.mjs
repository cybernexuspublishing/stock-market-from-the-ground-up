/* GU300 — signed LIVE expired-Founder Checkout cleanup, fully mocked.
 * No LIVE API key or real Stripe/Supabase network requests.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const code=readFileSync('functions/api/stripe-live-webhook-v01458.js','utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const id='f03db0bf-da5e-4790-a4ef-54dd86b70fcd';
const uid='f42f9301-18e6-43a3-8531-32d371fd22c1';
const sessionId='cs_live_GU300MockSession123';
const price='price_GU300Mock123';
const secret='whsec_GU300MockSecret';
const account='acct_GU300Mock123';
const metadata={f600_reservation:id,f600_user:uid,f600_plan:'FOUNDING_30'};
const env={SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',GU58_LIVE_WEBHOOK_ENABLED:'true',
 GU58_LIVE_FULFILLMENT_APPROVED:'true',GU58_LIVE_DB_CONTRACT_APPROVED:'true',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',GU58_STRIPE_LIVE_WEBHOOK_SECRET:secret,
 STRIPE_LIVE_ACCOUNT_ID:account};
const state={status:'expired',payment:'unpaid',amount:4999,subscription:null,price,
 writes:[],readCount:0};
const old=globalThis.fetch;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';
 if(u.endsWith('/v1/account')){state.readCount++;return json({id:account})}
 if(u.endsWith('/v1/checkout/sessions/'+sessionId)){
  state.readCount++;return json({id:sessionId,livemode:true,mode:'subscription',
   status:state.status,payment_status:state.payment,amount_total:state.amount,
   currency:'usd',client_reference_id:id,metadata,subscription:state.subscription,
   payment_intent:null});
 }
 if(u.includes('/line_items?')){
  state.readCount++;return json({data:[{price:{id:state.price},quantity:1,amount_total:state.amount}],has_more:false});
 }
 if(u.endsWith('/rpc/gu_founder_release_expired_checkout_v014300')&&method==='POST'){
  const body=JSON.parse(options.body);
  assert.deepEqual(body,{p_reservation:id,p_user:uid,p_session:sessionId,
    p_event:'evt_GU300Expired123',p_plan:'FOUNDING_30',p_price:price,p_amount:4999});
  state.writes.push(body);return json({ok:true,replayed:state.writes.length>1,released:state.writes.length===1});
 }
 throw new Error('Unexpected outbound network access: '+method+' '+u);
};
const event={id:'evt_GU300Expired123',type:'checkout.session.expired',livemode:true,
 created:Math.floor(Date.now()/1000),data:{object:{id:sessionId,metadata}}};
async function request(e=event,valid=true){
 const body=JSON.stringify(e),stamp=String(Math.floor(Date.now()/1000));
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=Buffer.from(await webcrypto.subtle.sign('HMAC',key,
  new TextEncoder().encode(stamp+'.'+body))).toString('hex');
 const signature='t='+stamp+',v1='+(valid?mac:'f'.repeat(64));
 return onRequestPost({request:new Request('https://example.com/api/stripe-live-webhook',
  {method:'POST',body,headers:{'stripe-signature':signature}}),env});
}
try{
 let r=await request();
 assert.equal(r.status,200);assert.equal(await r.text(),'founder-expired-reconciled');
 assert.equal(state.writes.length,1);
 r=await request();assert.equal(r.status,200,'Repeat verified expired event is idempotent');
 assert.equal(state.writes.length,2);
 const count=state.readCount;
 r=await request(event,false);
 assert.equal(r.status,401,'Forged HMAC rejected');
 assert.equal(state.readCount,count,'Invalid signature does not call provider');
 state.payment='paid';r=await request();assert.equal(r.status,503,'Paid session must never be released');
 assert.equal(state.writes.length,2);
 state.payment='unpaid';state.subscription='sub_fake';
 r=await request();assert.equal(r.status,503,'Existing subscription cannot be released');
 assert.equal(state.writes.length,2);
 state.subscription=null;state.price='price_different1234';
 r=await request();assert.equal(r.status,503,'Wrong provider Price must not trigger release');
 assert.equal(state.writes.length,2);
 state.price=price;
 r=await request({...event,type:'checkout.session.completed'});
 assert.equal(r.status,200,'Unrelated checkout event ignored by this cleanup');
 assert.equal(state.writes.length,2,'Only signed terminal expirations can release seats');
 console.log('PASS GU300: signed terminal LIVE Founder session releases one verified bound seat; replay safe; forged signature, paid session, subscription and wrong price rejected; no real provider calls.');
}finally{globalThis.fetch=old}
