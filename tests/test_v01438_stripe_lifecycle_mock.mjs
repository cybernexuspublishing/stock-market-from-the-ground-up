/* HTTP-mocked integration; does NOT prove live provider or database acceptance. */
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);const moduleFrom=async path=>import('data:text/javascript;base64,'+readFileSync(new URL(path,root)).toString('base64'));
const checkout=await moduleFrom('functions/api/stripe-customer-checkout-v01438.js');
const webhook=await moduleFrom('functions/api/stripe-customer-webhook-v01438.js');
const ref='aaaaaaaaaaaaaaaaaaaa',base=`https://${ref}.supabase.co`;
const env={GU_STRIPE_V38_STAGING:'true',GU_STRIPE_V38_FULFILLMENT:'true',GU_STRIPE_V38_STAGING_PROJECT_REF:ref,SUPABASE_URL:base,
 SUPABASE_SECRET_KEY:'service_test_not_real',SUPABASE_PUBLISHABLE_KEY:'pub_test',STRIPE_MANAGED_SECRET_KEY:'sk_test_not_real',STRIPE_MANAGED_WEBHOOK_SECRET:'whsec_mock',
 STRIPE_MANAGED_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_mock12345678'})};
const oldFetch=globalThis.fetch,calls=[],asJSON=(j,status=200)=>new Response(JSON.stringify(j),{status,headers:{'content-type':'application/json'}});
let current='active', paid='paid', applied=[];
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';calls.push([u,method]);
 if(u.endsWith('/auth/v1/user'))return asJSON({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(u.includes('/profiles?'))return asJSON([{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',account_kind:'member'}]);
 if(u.includes('/admin_user_flags?')||u.includes('/admin_user_roles?')||u.includes('/site_subscriptions?')||u.includes('/user_plan_grants?')||u.includes('/user_tool_passes?'))return asJSON([]);
 if(u.includes('/platform_plans?'))return asJSON([{plan_code:'FULL_MONTHLY',active:true,public_visible:true,checkout_enabled:true,price_cents:6999,billing_interval:'month'}]);
 if(u.includes('/rpc/gu_digital_payment_route_get_v01432r2'))return asJSON({provider:'STRIPE_MANAGED',enabled:true});
 if(u.includes('/site_settings?'))return asJSON([{value:true}]);
 if(u.includes('/v1/prices/'))return asJSON({id:'price_mock12345678',livemode:false,active:true,product:'prod_VRvuGwLKI16MXU',currency:'usd',unit_amount:6999,type:'recurring',recurring:{interval:'month'}});
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  const form=new URLSearchParams(opts.body);assert.equal(form.get('line_items[0][price]'),'price_mock12345678');
  assert.equal(form.get('managed_payments[enabled]'),'true');
  return asJSON({id:'cs_test_mock12345',url:'https://checkout.stripe.com/c/pay/cs_test_mock12345'});
 }
 if(u.includes('gu_stripe_checkout_intents_v01438')&&method==='POST')return asJSON([{}]);
 if(u.includes('gu_stripe_checkout_intents_v01438')&&method==='PATCH')return asJSON([]);
 if(u.endsWith('/v1/checkout/sessions/cs_test_mock12345'))return asJSON({id:'cs_test_mock12345',livemode:false,mode:'subscription',currency:'usd',subscription:'sub_mock12345'});
 if(u.includes('/line_items'))return asJSON({data:[{price:{id:'price_mock12345678'},quantity:1}]});
 if(u.includes('/v1/subscriptions/sub_mock12345'))return asJSON({id:'sub_mock12345',livemode:false,status:current,items:{data:[{price:{id:'price_mock12345678'},current_period_end:Math.floor(Date.now()/1000)+86400}]},latest_invoice:'in_mock12345'});
 if(u.includes('/v1/invoices/in_mock12345'))return asJSON({id:'in_mock12345',subscription:'sub_mock12345',status:paid,amount_paid:6999});
 if(u.endsWith('/v1/checkout/sessions/cs_test_life12345'))return asJSON({id:'cs_test_life12345',livemode:false,mode:'payment',currency:'usd',payment_status:'paid',amount_subtotal:249900,payment_intent:'pi_life12345'});
 if(u.includes('/v1/checkout/sessions/cs_test_life12345/line_items'))return asJSON({data:[{price:{id:'price_life12345'},quantity:1}]});
 if(u.includes('/v1/charges/ch_sub12345'))return asJSON({id:'ch_sub12345',livemode:false,amount:6999,amount_refunded:6999,currency:'usd',invoice:'in_mock12345',payment_intent:'pi_sub12345'});
 if(u.includes('/v1/payment_intents/pi_sub12345'))return asJSON({id:'pi_sub12345',livemode:false});
 if(u.includes('/v1/charges/ch_life12345'))return asJSON({id:'ch_life12345',livemode:false,amount:249900,amount_refunded:249900,currency:'usd',payment_intent:'pi_life12345'});
 if(u.includes('/v1/payment_intents/pi_life12345'))return asJSON({id:'pi_life12345',livemode:false});
 if(u.includes('/v1/checkout/sessions?payment_intent=pi_life12345'))return asJSON({data:[{id:'cs_test_life12345'}]});
 if(u.includes('/rpc/gu_stripe_apply_event_v01438')){const b=JSON.parse(opts.body);applied.push(b);return asJSON({ok:true,intentId:'test'})}
 throw new Error('Unexpected API request '+u);
};
try{
 const r=await checkout.onRequestPost({request:new Request('https://site.example/api/stripe-customer-checkout-v01438',{method:'POST',headers:{authorization:'Bearer valid-test-token',origin:'https://site.example','content-type':'application/json'},body:JSON.stringify({type:'plan',code:'FULL_MONTHLY'})}),env});
 assert.equal(r.status,200,(await r.clone().text()));assert.equal((await r.json()).sandboxOnly,true);
 const signed=async(type,body)=>{const e={id:'evt_mock'+applied.length+'event',type,livemode:false,created:Math.floor(Date.now()/1000),data:{object:body||{id:type.startsWith('customer.subscription.')?'sub_mock12345':'cs_test_mock12345',subscription:'sub_mock12345'}}};
 const raw=JSON.stringify(e),ts=String(Math.floor(Date.now()/1000));const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_MANAGED_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(ts+'.'+raw)));const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return webhook.onRequestPost({request:new Request('https://site.example/api/stripe-customer-webhook-v01438',{method:'POST',headers:{'stripe-signature':`t=${ts},v1=${hex}`},body:raw}),env});
 };
 let result=await signed('checkout.session.completed');assert.equal(result.status,200,(await result.clone().text()));
 assert.equal(applied.at(-1).p_action,'subscription_active');assert.equal(applied.at(-1).p_amount_cents,6999);
 current='past_due';paid='open';result=await signed('customer.subscription.updated');assert.equal(result.status,200);assert.equal(applied.at(-1).p_action,'subscription_past_due');
 current='canceled';result=await signed('customer.subscription.deleted');assert.equal(result.status,200);assert.equal(applied.at(-1).p_action,'subscription_canceled');
 current='active';paid='paid';result=await signed('charge.refunded',{id:'ch_sub12345'});assert.equal(result.status,200,(await result.clone().text()));assert.equal(applied.at(-1).p_action,'subscription_refunded');assert.equal(applied.at(-1).p_invoice_id,'in_mock12345');
 result=await signed('checkout.session.completed',{id:'cs_test_life12345'});assert.equal(result.status,200,(await result.clone().text()));assert.equal(applied.at(-1).p_action,'lifetime_paid');assert.equal(applied.at(-1).p_amount_cents,249900);
 result=await signed('charge.refunded',{id:'ch_life12345'});assert.equal(result.status,200,(await result.clone().text()));assert.equal(applied.at(-1).p_action,'payment_refunded');
 console.log('PASS v01438: HTTP-mocked checkout, signed active/past_due/canceled/refunded subscriptions, lifetime purchase/refund, server-bound price and safe staging gates');
}finally{globalThis.fetch=oldFetch}
