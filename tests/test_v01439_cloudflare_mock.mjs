import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const apiPath=new URL('../functions/api/gu39-sandbox.js',import.meta.url);
const hookPath=new URL('../functions/api/gu39-stripe-webhook.js',import.meta.url);
const load=async url=>import('data:text/javascript;base64,'+readFileSync(url).toString('base64'));
const api=await load(apiPath),hook=await load(hookPath);
const base='https://oxihglyfgzywsupnyicb.supabase.co', id='e1b5d7f0-52dc-493e-b513-71f39aaa879a';
const env={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'public-key',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_mock987654321'})};
let enabled=true,hookCalls=[],network=[];const prev=globalThis.fetch;
const result=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{let u=String(url),verb=opts.method||'GET';network.push([u,verb]);
 if(u.endsWith('/auth/v1/user'))return result({id});
 if(u.endsWith('/rpc/gu_staff_identity_v01431r1'))return result('OWNER');
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return result(true);
 if(u.endsWith('/v1/account'))return result({id:'acct_1URGkDJY9FI7byHB'});
 if(u.endsWith('/rpc/gu39_sandbox_owner_read'))return result({ok:true,role:'OWNER',enabled,updatedAt:'2026-10-16T12:00:00Z',intentCount:0,processedEventCount:0,shadowAccessCount:0});
 if(u.endsWith('/rpc/gu39_sandbox_owner_toggle')){enabled=JSON.parse(opts.body).p_enabled;return result({ok:true,enabled,updatedAt:'2026-10-16T12:01:00Z'});}
 if(u.includes('gu39_sandbox_intents?select=id'))return result([]);
 if(u.endsWith('/gu39_sandbox_intents')&&verb==='POST')return result([{id}]);
 if(u.includes('gu39_sandbox_intents?id=eq.')&&verb==='PATCH')return new Response(null,{status:204});
 if(u.includes('/v1/prices/'))return result({id:'price_mock987654321',livemode:false,active:true,product:'prod_VRvuGwLKI16MXU',currency:'usd',unit_amount:6999,type:'recurring',recurring:{interval:'month'}});
 if(u.endsWith('/v1/checkout/sessions')&&verb==='POST')return result({id:'cs_test_mock9876543',livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_mock9876543'});
 if(u.includes('gu39_sandbox_intents?select=*'))return result([{id,sku:'plan:FULL_MONTHLY',stripe_price_id:'price_mock987654321',stripe_product_id:'prod_VRvuGwLKI16MXU',quoted_cents:6999,session_id:'cs_test_mock9876543'}]);
 if(u.endsWith('/v1/checkout/sessions/cs_test_mock9876543'))return result({id:'cs_test_mock9876543',mode:'subscription',livemode:false,client_reference_id:id,metadata:{gu39_shadow_intent:id},currency:'usd',customer:'cus_mock567899',subscription:'sub_mock12345678'});
 if(u.includes('/v1/checkout/sessions/cs_test_mock9876543/line_items'))return result({data:[{quantity:1,price:{id:'price_mock987654321',product:'prod_VRvuGwLKI16MXU'}}]});
 if(u.endsWith('/v1/subscriptions/sub_mock12345678'))return result({id:'sub_mock12345678',status:'active',livemode:false,customer:'cus_mock567899',latest_invoice:'in_mock123456789',items:{data:[{price:{id:'price_mock987654321'},current_period_end:Math.floor(Date.now()/1000)+86400}]}});
 if(u.endsWith('/v1/invoices/in_mock123456789'))return result({id:'in_mock123456789',status:'paid',amount_paid:6999,subscription:'sub_mock12345678'});
 if(u.includes('/rpc/gu39_shadow_apply')){hookCalls.push(JSON.parse(opts.body));return result({ok:true,mode:'SHADOW_ONLY'});}
 throw Error('Unexpected mock request '+u+' '+verb);
};
try{
 assert.equal((await api.onRequestGet({request:new Request('https://example.com/api/gu39-sandbox'),env})).status,403);
 const headers={authorization:'Bearer example-token',origin:'https://example.com','content-type':'application/json'};
 let s=await (await api.onRequestGet({request:new Request('https://example.com/api/gu39-sandbox',{headers}),env})).json();
 assert.equal(s.enabled,true);assert.equal(s.liveCheckout,false);
 let disabledEnv={...env,GU39_SANDBOX_SHADOW_GATE:'false'};
 let deny=await api.onRequestPost({request:new Request('https://example.com/api/gu39-sandbox',{method:'POST',headers,body:JSON.stringify({action:'checkout',sku:'plan:FULL_MONTHLY'})}),env:disabledEnv});assert.equal(deny.status,403);
 const checkout=await api.onRequestPost({request:new Request('https://example.com/api/gu39-sandbox',{method:'POST',headers,body:JSON.stringify({action:'checkout',sku:'plan:FULL_MONTHLY'})}),env});assert.equal(checkout.status,200,await checkout.clone().text());
 const receipt=await checkout.json();assert.equal(receipt.testOnly,true);assert.equal(receipt.liveCheckout,false);
 assert(network.filter(([u])=>u.includes('/gu39_sandbox_intents')).length>=2);
 // Malicious webhook without Stripe signature cannot write shadow records.
 assert.equal((await hook.onRequestPost({request:new Request('https://example.com/api/gu39-stripe-webhook',{method:'POST',body:'{}'}),env})).status,401);
 const event={id:'evt_mock1234567890',livemode:false,type:'checkout.session.completed',created:Math.floor(Date.now()/1000),data:{object:{id:'cs_test_mock9876543'}}};
 const raw=JSON.stringify(event),t=String(Math.floor(Date.now()/1000));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.GU39_STRIPE_TEST_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw)));const hex=Array.from(signature,b=>b.toString(16).padStart(2,'0')).join('');
 const resp=await hook.onRequestPost({request:new Request('https://example.com/api/gu39-stripe-webhook',{method:'POST',headers:{'stripe-signature':`t=${t},v1=${hex}`},body:raw}),env});
 assert.equal(resp.status,200,await resp.clone().text());assert.equal(hookCalls.length,1);assert.equal(hookCalls[0].p_action,'paid');assert.equal(hookCalls[0].p_amount_cents,6999);
 assert(network.every(([u])=>!(/user_plan_grants|user_tool_passes|site_orders|site_subscriptions/.test(u))));
 console.log('PASS v39: Owner authentication, sandbox-only checkout, signed test webhook, shadow RPC only; unauthorized fail-closed.');
}finally{globalThis.fetch=prev}
