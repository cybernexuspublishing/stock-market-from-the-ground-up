import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const script=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const load=async p=>import('data:text/javascript;base64,'+Buffer.from(script(p)).toString('base64'));
const hook=await import(new URL('../functions/api/gu39-stripe-webhook.js',import.meta.url).href);
const api=await load('../functions/api/gu39-sandbox.js');
const origin='https://example.com',uid='11111111-1111-4111-8111-111111111111';
const iid='22222222-2222-4222-8222-222222222222';
const price='price_test_acceptance123456',product='prod_VRwgISspL5mhls',sid='cs_test_acceptance123456';
const event={id:'evt_acceptance123456',livemode:false,type:'checkout.session.completed',
 created:Math.floor(Date.now()/1000),data:{object:{id:sid}}};
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock'};
const intent={id:iid,tester_user_id:uid,sku:'plan:LIFETIME',status:'checkout_created',
 session_id:sid,stripe_price_id:price,stripe_product_id:product,quoted_cents:249900,
 created_at:new Date().toISOString()};
const provider={id:sid,livemode:false,client_reference_id:iid,
 metadata:{gu39_shadow_intent:iid},currency:'usd',status:'complete',
 payment_status:'paid',amount_subtotal:249900,amount_total:249900,mode:'payment',
 payment_intent:'pi_testacceptance12345',subscription:null,customer:'cus_testacceptance12345'};
const state={webhookWrites:0,hasAccess:false,eventRows:[],tampered:false,ownerMode:true};
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';
 if(u.endsWith('/auth/v1/user'))return respond({id:uid});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return respond({ok:true,role:'OWNER'});
 if(u.includes('/rest/v1/gu39_sandbox_settings?'))return respond([{enabled:state.ownerMode}]);
 if(u.includes('/rest/v1/gu39_sandbox_intents?')){
  if(u.includes('session_id=eq.'))return respond([intent]);
  if(u.includes('session_id=not.is.null'))return respond([intent]);
  throw Error('Unexpected intent selection '+u);
 }
 if(u.includes('/rest/v1/gu39_sandbox_events?'))return respond(state.eventRows);
 if(u.includes('/rest/v1/gu39_sandbox_access?'))
  return respond(state.hasAccess?[{shadow_access:true,access_until:null}]:[]);
 if(u.endsWith('/rest/v1/rpc/gu39_shadow_apply')&&method==='POST'){
  const pay=JSON.parse(options.body);assert.equal(pay.p_action,'paid');
  assert.equal(pay.p_intent_id,iid);assert.equal(pay.p_session_id,sid);
  assert.equal(pay.p_price_id,price);
  if(state.eventRows.some(x=>x.event_id===pay.p_event_id))return respond({ok:true,duplicate:true});
  state.webhookWrites++;
  intent.status='test_active';
  state.hasAccess=true;
  state.eventRows.push({event_id:pay.p_event_id,action:'paid',outcome:'shadow_applied',
    occurred_at:new Date().toISOString()});
  return respond({ok:true,mode:'SHADOW_ONLY',status:'test_active'});
 }
 if(u.endsWith('/v1/account'))return respond({id:'acct_1URGkDJY9FI7byHB'});
 if(u.endsWith('/v1/checkout/sessions/'+sid))return respond(
  state.tampered?{...provider,client_reference_id:'unrelated'}:provider);
 if(u.includes('/v1/checkout/sessions/'+sid+'/line_items?'))
  return respond({data:[{price:{id:price,product},quantity:1}]});
 if(u.endsWith('/v1/events/'+event.id))return respond(event);
 throw Error('Unexpected route '+method+' '+u);
};
async function makeWebhook(badSignature=false){
 const body=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
 const key=await crypto.subtle.importKey('raw',
  new TextEncoder().encode(env.GU39_STRIPE_TEST_WEBHOOK_SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,
  new TextEncoder().encode(timestamp+'.'+body))),b=>b.toString(16).padStart(2,'0')).join('');
 const request=new Request(origin+'/api/gu39-stripe-webhook',{method:'POST',
  headers:{'stripe-signature':'t='+timestamp+',v1='+(badSignature?'0'.repeat(64):digest)},body});
 return hook.onRequestPost({request,env});
}
async function acceptance(){
 const request=new Request(origin+'/api/gu39-sandbox?view=acceptance',
  {headers:{authorization:'Bearer owner-jwt'}});
 const r=await api.onRequestGet({request,env});assert.equal(r.status,200,await r.clone().text());
 return r.json();
}
try{
 // Read-only acceptance never creates checkout or grants access.
 let a=await acceptance();
 assert.equal(a.status,'PENDING');
 assert.deepEqual(a.steps.map(s=>s.status),['PASS','PASS','PENDING','PENDING']);
 assert.equal(state.webhookWrites,0);
 assert.equal(a.realMemberEntitlementsVerified,false);
 let r=await makeWebhook(true);assert.equal(r.status,401);
 assert.equal(state.webhookWrites,0);
 state.ownerMode=false;r=await makeWebhook();assert.equal(r.status,503);
 assert.equal(state.webhookWrites,0);
 state.ownerMode=true;r=await makeWebhook();
 assert.equal(r.status,200,await r.clone().text());
 assert.equal(await r.text(),'SHADOW_RECORDED');
 assert.equal(state.webhookWrites,1);
 a=await acceptance();
 assert.equal(a.status,'PASS');assert.equal(a.passed,4);assert.equal(a.total,4);
 assert.deepEqual(a.steps.map(s=>s.status),['PASS','PASS','PASS','PASS']);
 assert.equal(a.lifeCycle.refund,'NOT_TESTED');
 assert.equal(a.realMemberEntitlementsVerified,false);
 // Duplicate delivery is idempotent inside PostgreSQL, not a second grant.
 r=await makeWebhook();assert.equal(r.status,200);
 assert.equal(state.webhookWrites,1);
 // Provider reference mismatch blocks falsely marked acceptance.
 state.tampered=true;a=await acceptance();
 assert.equal(a.status,'EVIDENCE_UNAVAILABLE');
 assert.equal(a.error,'STRIPE_SESSION_BINDING_MISMATCH');
 assert.equal(state.webhookWrites,1);
 console.log('PASS v57: actual HMAC path, Owner TEST gate, duplicate webhook, provider correlation, shadow-only grant and tamper detection.');
}finally{globalThis.fetch=original}
