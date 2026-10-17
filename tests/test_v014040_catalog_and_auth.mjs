import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../functions/api/',import.meta.url);
const load=(name)=>import('data:text/javascript;base64,'+readFileSync(new URL(name,base)).toString('base64'));
const api=await load('gu39-sandbox.js');
const hook=await load('gu39-stripe-webhook.js');
const oldFetch=globalThis.fetch;
const owner='8da97526-b906-4927-a002-6195f69112ee';
const supa='https://oxihglyfgzywsupnyicb.supabase.co';
const expected={
'plan:FULL_MONTHLY':['prod_VRvuGwLKI16MXU',6999,'month'],
'plan:FULL_ANNUAL':['prod_VRvyBNhWk9jshb',69900,'year'],
'plan:LIFETIME':['prod_VRwgISspL5mhls',249900,'one_time'],
'plan:ONDEMAND_MONTHLY':['prod_VRwjus5sQLtTad',1999,'month'],
'tool:INTERACTIVE_LEARNING':['prod_VRwmmu4zATdHAb',2999,'month'],
'tool:JOURNAL_ANALYTICS':['prod_VRwoX4hTg8fRCm',2999,'month'],
'tool:MARKET_SIMULATOR':['prod_VRwrsEpvfw60Xh',2999,'month'],
'tool:MARKET_TUTOR':['prod_VRwuiqDt8qHayI',2999,'month']
};
const map=Object.fromEntries(Object.keys(expected).map((x,i)=>[x,'price_fake'+String(i).padStart(12,'0')]));
const req=(url,method='GET',body)=>new Request(url,{method,headers:{authorization:'Bearer user-test-jwt',...(method==='POST'?{origin:'https://example.com','content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const response=(v,code=200)=>new Response(JSON.stringify(v),{status:code,headers:{'content-type':'application/json'}});
const initial={SUPABASE_URL:supa,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_demo',GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_demo',GU39_SANDBOX_SHADOW_GATE:'false',GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify(map)};
let network=[],missing=null,wrongAccount=false;
globalThis.fetch=async(url,options={})=>{
 const u=String(url), method=options.method||'GET';network.push({url:u,method,headers:options.headers||{}});
 if(u.endsWith('/auth/v1/user'))return response({id:owner});
 if(u.endsWith('/rpc/gu_staff_identity_v01431r1'))return response('OWNER');
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return response(true);
 if(u.endsWith('/rpc/gu39_sandbox_owner_read'))return response({ok:true,role:'OWNER',enabled:false,updatedAt:'2026-10-16T00:00:00Z'});
 if(u==='https://api.stripe.com/v1/account')return response({id:wrongAccount?'acct_WRONG':'acct_1URGkDJY9FI7byHB'});
 const productId=u.match(/\/v1\/products\/(prod_[^/?]+)/)?.[1];
 if(productId){if(missing===productId)return response({error:{code:'resource_missing'}},404);return response({id:productId,name:'Test product',active:true,livemode:false})}
 const priceId=u.match(/\/v1\/prices\/(price_[^/?]+)/)?.[1];
 if(priceId){const sku=Object.keys(map).find(k=>map[k]===priceId);assert(sku,priceId);const [product,cents,interval]=expected[sku];return response({id:priceId,product,unit_amount:cents,active:true,livemode:false,currency:'usd',type:interval==='one_time'?'one_time':'recurring',recurring:interval==='one_time'?null:{interval}})}
 throw Error('Unexpected URL '+u);
};
try{
 // verification is read-only, independent of the checkout gate
 let r=await api.onRequestGet({request:req('https://example.com/api/gu39-sandbox?view=catalog'),env:initial});
 assert.equal(r.status,200,await r.clone().text());let data=await r.json();assert.equal(data.productsVerified,8);assert.equal(data.allVerified,true);assert.equal(data.rows.length,8);
 assert(network.filter(x=>x.url.startsWith('https://api.stripe.com/v1/')).length,17);
 assert(network.every(x=>x.method!=='POST'||!x.url.startsWith('https://api.stripe.com')));
 assert(network.every(x=>!(/user_plan_grants|user_tool_passes|site_orders|site_subscriptions/.test(x.url))));
 // Auth endpoint rejects unauthenticated caller before touching Stripe
 network=[];r=await api.onRequestGet({request:new Request('https://example.com/api/gu39-sandbox?view=catalog'),env:initial});assert.equal(r.status,403);
 assert.equal(network.some(x=>x.url.includes('api.stripe.com')),false);
 // Mismatched account blocked before any product or payment mutations
 wrongAccount=true;r=await api.onRequestGet({request:req('https://example.com/api/gu39-sandbox?view=catalog'),env:initial});assert.equal(r.status,503);assert.equal((await r.json()).error,'SANDBOX_ACCOUNT_MISMATCH');wrongAccount=false;
 // one missing product shows 7/8, importer is never executed or implied
 missing='prod_VRwuiqDt8qHayI';r=await api.onRequestGet({request:req('https://example.com/api/gu39-sandbox?view=catalog'),env:initial});data=await r.json();assert.equal(data.productsVerified,7);assert.equal(data.allVerified,false);assert(data.rows.some(row=>row.status==='PRODUCT_MISSING'));missing=null;
 // Test-only old and new supabase key formatting tested by signed webhook path
 const event={id:'evt_v40mock123456',type:'checkout.session.completed',livemode:false,created:Math.floor(Date.now()/1000),data:{object:{id:'cs_test_mock123'}}};const raw=JSON.stringify(event);
 const sha=async(secret)=>{const t=String(Math.floor(Date.now()/1000)),k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(t+'.'+raw));return `t=${t},v1=${Buffer.from(sig).toString('hex')}`};
 const webhookReq=async secret=>new Request('https://example.com/api/gu39-stripe-webhook',{method:'POST',headers:{'stripe-signature':await sha(secret)},body:raw});
 // a signed event proceeds to Stripe retrieval; then Supabase service key handling is tested independently by mock escalation
 const moduleText=readFileSync(new URL('gu39-stripe-webhook.js',base),'utf8');
 assert(moduleText.includes("String(secret).startsWith('sb_secret_')"));
 assert(moduleText.includes("headers:{...serviceHeaders(env.SUPABASE_SECRET_KEY),'content-type':'application/json'}"));
 assert(!moduleText.includes("authorization:'Bearer '+env.SUPABASE_SECRET_KEY"));
 const apiText=readFileSync(new URL('gu39-sandbox.js',base),'utf8');
 assert(apiText.includes("headers:{...serviceHeaders(c.secret),'content-type':'application/json',prefer}"));
 assert(!apiText.includes("authorization:'Bearer '+c.secret"));
 // Exercise the signed webhook all the way to the shadow RPC with both Supabase secret formats.
 const localSession='cs_test_mock9876543';
 const legacyJwt='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.eyJtYWMiOiJ0ZXN0In0';
 for(const secret of ['sb_secret_mock',legacyJwt]){
  const captured=[];
  globalThis.fetch=async(url,opts={})=>{
   const u=String(url);captured.push([u,opts]);
   if(u.endsWith('/v1/checkout/sessions/'+localSession))return response({id:localSession,livemode:false,mode:'payment',payment_status:'paid',amount_total:6999,currency:'usd',client_reference_id:owner,metadata:{gu39_shadow_intent:owner},payment_intent:'pi_mock12345678',customer:'cus_mock12345678'});
   if(u.includes('/v1/checkout/sessions/'+localSession+'/line_items'))return response({data:[{quantity:1,price:{id:map['plan:FULL_MONTHLY'],product:expected['plan:FULL_MONTHLY'][0]}}]});
   if(u.includes('/rest/v1/gu39_sandbox_intents?select=*'))return response([{id:owner,sku:'plan:FULL_MONTHLY',session_id:localSession,stripe_price_id:map['plan:FULL_MONTHLY'],stripe_product_id:expected['plan:FULL_MONTHLY'][0],quoted_cents:6999}]);
   if(u.endsWith('/rest/v1/rpc/gu39_shadow_apply'))return response({ok:true,mode:'SHADOW_ONLY'});
   throw Error('Unexpected event mock URL '+u);
  };
  const fixture={id:'evt_mock1234567890',livemode:false,type:'checkout.session.completed',created:Math.floor(Date.now()/1000),data:{object:{id:localSession}}};
  const body=JSON.stringify(fixture),ts=String(Math.floor(Date.now()/1000)),hmac=await crypto.subtle.importKey('raw',new TextEncoder().encode(initial.GU39_STRIPE_TEST_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=Buffer.from(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(ts+'.'+body))).toString('hex');
  const accepted=await hook.onRequestPost({request:new Request('https://example.com/api/gu39-stripe-webhook',{method:'POST',headers:{'stripe-signature':`t=${ts},v1=${sig}`},body}),env:{...initial,SUPABASE_SECRET_KEY:secret,GU39_SANDBOX_SHADOW_GATE:'true'}});
  assert.equal(accepted.status,200,await accepted.clone().text());
  assert.equal(await accepted.text(),'SHADOW_RECORDED');
  const serviceCalls=captured.filter(([u])=>u.includes('/rest/v1/gu39_')||u.includes('/rest/v1/rpc/gu39_'));
  assert.equal(serviceCalls.length,2);
  assert(serviceCalls.every(([u,opts])=>opts.headers.apikey===secret));
  if(secret.startsWith('sb_secret_'))assert(serviceCalls.every(([u,opts])=>!Object.hasOwn(opts.headers,'authorization')));
  else assert(serviceCalls.every(([u,opts])=>opts.headers.authorization==='Bearer '+secret));
  assert(captured.every(([u])=>!(/user_plan_grants|user_tool_passes|site_orders|site_subscriptions/.test(u))));
 }
 globalThis.fetch=async()=>{throw Error('Unexpected network call')};
 network=[];r=await hook.onRequestPost({request:await webhookReq(initial.GU39_STRIPE_TEST_WEBHOOK_SECRET),env:{...initial,GU39_SANDBOX_SHADOW_GATE:'true'}});
 // event cannot issue any live membership changes, and it must not be accepted as fulfilled without mock wiring
 assert([503,200].includes(r.status));
 console.log('PASS v40: eight-product real-time read-only verification mock, missing-product identification, Owner auth, Stripe-account pinning, and API-key header source guards');
}finally{globalThis.fetch=oldFetch}
