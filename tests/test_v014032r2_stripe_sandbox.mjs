import assert from 'node:assert/strict';
import {onRequest as sandbox} from '../functions/api/stripe-managed-sandbox-v01432r2.js';
import {onRequestPost as webhook} from '../functions/api/stripe-managed-webhook-v01432r2.js';
import {onRequestGet as route} from '../functions/api/digital-payment-route-v01432r2.js';
const req=(body,auth)=>new Request('https://site.example/api/stripe-managed-sandbox-v01432r2',{method:'POST',headers:{...(auth?{authorization:auth}:{}),'content-type':'application/json','origin':'https://site.example'},body:JSON.stringify(body)});
const env={SUPABASE_URL:'https://app.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub',SUPABASE_SECRET_KEY:'svc',STRIPE_MANAGED_SECRET_KEY:'sk_test_fake',
 STRIPE_MANAGED_WEBHOOK_SECRET:'whsec_test-secret',STRIPE_MANAGED_TEST_CHECKOUT_ENABLED:'false',STRIPE_MANAGED_PRICE_MAP_JSON:'{}'};
let count=0;const original=globalThis.fetch;
try{
 globalThis.fetch=async()=>{count++;throw Error('Must not send network call when disabled')};
 assert.equal((await sandbox({request:req({type:'plan',code:'FULL_MONTHLY'},'Bearer jwt'),env})).status,503);
 assert.equal(count,0);
 assert.equal((await webhook({request:new Request('https://site.example/api/stripe-managed-webhook-v01432r2',{method:'POST',body:'{}'}),env})).status,503);
 assert.equal(count,0);
 env.STRIPE_MANAGED_TEST_CHECKOUT_ENABLED='true';
 assert.equal((await sandbox({request:req({type:'plan',code:'FULL_MONTHLY'}),env})).status,401);
 assert.equal(count,0);
 const unsigned=new Request('https://site.example/api/stripe-managed-webhook-v01432r2',{method:'POST',headers:{'stripe-signature':'t=123,v1=0000000000000000000000000000000000000000000000000000000000000000'},body:'{}'});
 assert.equal((await webhook({request:unsigned,env})).status,401);
 assert.equal(count,0);
 globalThis.fetch=async (u)=>{count++; if(String(u).includes('/rpc/gu_digital_payment_route_get_v01432r2'))return Response.json({provider:'STRIPE_MANAGED',enabled:false});throw Error('unexpected URL')};
 const r=await route({env});assert.equal((await r.json()).checkoutEnabled,false);
 // Signed test receipt is accepted only within 300 seconds and creates NO
 // site order, membership, digital entitlement, or physical shipping record.
 count=0;const accessed=[];
 globalThis.fetch=async (url,options)=>{
  accessed.push({url:String(url),method:options.method,body:options.body});
  assert.match(String(url),/gu_stripe_managed_test_events_v01432r2/);
  return Response.json([]);
 };
 const event={id:'evt_abc12345',type:'invoice.paid',livemode:false,data:{object:{id:'in_test'}}};
 const raw=JSON.stringify(event),ts=Math.floor(Date.now()/1000),payload=ts+'.'+raw;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_MANAGED_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const makeHook=(body,sigheader)=>new Request('https://site.example/api/stripe-managed-webhook-v01432r2',{method:'POST',headers:{'stripe-signature':sigheader},body});
 assert.equal((await webhook({request:makeHook(raw,`t=${ts},v1=${sig}`),env})).status,200);
 assert.equal(accessed.length,1);
 assert.equal(JSON.parse(accessed[0].body).event_id,'evt_abc12345');
 assert(accessed.every(a=>!a.url.includes('site_orders')&&!a.url.includes('user_plan_grants')));
 const live=JSON.stringify({...event,id:'evt_another1234',livemode:true});
 const liveSign=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+live)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 assert.equal((await webhook({request:makeHook(live,`t=${ts},v1=${liveSign}`),env})).status,503);
 assert.equal(accessed.length,1);
 assert.equal((await webhook({request:makeHook(raw,`t=${ts-1000},v1=${sig}`),env})).status,401);
 console.log('PASS R2: disabled sandbox, unsigned/stale/live webhook denied; signed test receipt stored without any real grant.');
}finally{globalThis.fetch=original}
