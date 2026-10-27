/* Noncharging Owner Stripe registry + CAPTCHA coordination contracts. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const importer=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../functions/api/owner-stripe-product-sync.js',import.meta.url),'utf8')).toString('base64'));
const captcha=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../functions/api/owner-captcha-control.js',import.meta.url),'utf8')).toString('base64'));
const base='https://stock-market-from-the-ground-up-d1r.pages.dev',supabase='https://oxihglyfgzywsupnyicb.supabase.co';
const env={SUPABASE_URL:supabase,SUPABASE_SECRET_KEY:'sb_secret_mock',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_testlive12345678'};
const testActor='11111111-1111-4111-8111-111111111111';
const state={role:'OWNER',step:true,dbWrites:0,providerWrites:0,enabled:true,siteEnabled:true,priceCents:2999};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const saved=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';
 if(u.endsWith('/auth/v1/user'))return json({id:testActor});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return json({ok:true,role:state.role});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return json(state.step);
 if(u.endsWith('/v1/account'))return json({id:'acct_testlive12345678'});
 if(u.endsWith('/v1/products/prod_validABC123'))return json({id:'prod_validABC123',livemode:true,active:true,name:'Market Discovery Lab',metadata:{site_sku:'DISCOVERY_LAB',catalog_category:'tool_candidate'}});
 if(u.endsWith('/v1/prices/price_validABC123'))return json({id:'price_validABC123',product:'prod_validABC123',livemode:true,active:true,
  currency:'usd',unit_amount:state.priceCents,billing_scheme:'per_unit',transform_quantity:null,
  type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}});
 if(u.includes('/rest/v1/gu_storefront_items_v014174?'))return json([{sku:'tool:DISCOVERY_LAB',category:'tool'}]);
 if(u.includes('/rest/v1/gu_owner_stripe_registry_v1?'))return json([]);
 if(u.includes('/rest/v1/platform_tools?'))return json([{individual_price_cents:2999}]);
 if(u.endsWith('/rpc/gu_owner_register_stripe_product_v1')){
  state.dbWrites++;const p=JSON.parse(opts.body);
  assert.equal(p.p_sku,'tool:DISCOVERY_LAB');assert.equal(p.p_amount_cents,2999);assert.equal(p.p_actor,testActor);
  return json({ok:true,sku:p.p_sku,newStoreItem:false});
 }
 if(u.includes('site_settings?')&&method==='GET')return json([{value:state.siteEnabled}]);
 if(u.includes('site_settings?')&&method==='PATCH'){
  state.siteEnabled=JSON.parse(opts.body).value;return json([{value:state.siteEnabled}]);
 }
 if(u.includes('api.supabase.com/v1/projects/')&&method==='GET')return json({security_captcha_enabled:state.enabled});
 if(u.includes('api.supabase.com/v1/projects/')&&method==='PATCH'){
  state.providerWrites++;state.enabled=JSON.parse(opts.body).security_captcha_enabled;return json({security_captcha_enabled:state.enabled});
 }
 if(u.endsWith('/rest/v1/admin_audit_log')&&method==='POST')return json([{id:6}]);
 if(u.endsWith('/rest/v1/gu_owner_stripe_registry_v1?select=sku,stripe_product_id,stripe_price_id,amount_cents,billing_interval,billing_interval_count,updated_at&order=updated_at.desc&limit=150'))return json([]);
 throw Error('Unexpected request '+method+' '+u);
};
try{
 const r=(handler,kind,path,data,over=env)=>handler[kind]({env:over,request:new Request(base+path,
  {method:data?'POST':'GET',headers:{authorization:'Bearer authorized-owner',
  ...(data?{'content-type':'application/json',origin:base}:{})},
  body:data?JSON.stringify(data):undefined})});
 let v=await r(importer,'onRequestPost','/api/owner-stripe-product-sync',
  {sku:'tool:DISCOVERY_LAB',productId:'prod_validABC123',priceId:'price_validABC123'});
 assert.equal(v.status,200);assert.equal((await v.json()).source,'verified_stripe_live');assert.equal(state.dbWrites,1);
 state.priceCents=3099;v=await r(importer,'onRequestPost','/api/owner-stripe-product-sync',
  {sku:'tool:DISCOVERY_LAB',productId:'prod_validABC123',priceId:'price_validABC123'});
 assert.equal(v.status,409);assert.equal(state.dbWrites,1,'Never silently replace an approved price');
 state.priceCents=2999;state.role='MEMBER';
 v=await r(importer,'onRequestPost','/api/owner-stripe-product-sync',{sku:'tool:DISCOVERY_LAB',productId:'prod_validABC123',priceId:'price_validABC123'});
 assert.equal(v.status,403);state.role='OWNER';
 v=await r(captcha,'onRequestGet','/api/owner-captcha-control');assert.equal(v.status,200);
 let d=await v.json();assert.equal(d.available,false);assert.equal(d.websiteEnabled,true);
 v=await r(captcha,'onRequestPost','/api/owner-captcha-control',{enabled:false,confirm:'CHANGE_PRODUCTION_CAPTCHA'});
 assert.equal(v.status,503);assert.equal(state.providerWrites,0,'Missing management token must never partially toggle CAPTCHA');
 const withPat={...env,SUPABASE_MANAGEMENT_ACCESS_TOKEN:'pat_mock'};
 v=await r(captcha,'onRequestPost','/api/owner-captcha-control',{enabled:false,confirm:'CHANGE_PRODUCTION_CAPTCHA'},withPat);
 assert.equal(v.status,200);assert.equal((await v.json()).synchronized,true);
 assert.equal(state.enabled,false);assert.equal(state.siteEnabled,false);
 v=await r(captcha,'onRequestPost','/api/owner-captcha-control',{enabled:true,confirm:'CHANGE_PRODUCTION_CAPTCHA'},withPat);
 assert.equal(v.status,200);assert.equal(state.enabled,true);assert.equal(state.siteEnabled,true);
 state.step=false;v=await r(captcha,'onRequestPost','/api/owner-captcha-control',{enabled:false,confirm:'CHANGE_PRODUCTION_CAPTCHA'},withPat);
 assert.equal(v.status,403);assert.equal(state.enabled,true);
 console.log('PASS: Stripe sync checks LIVE price, rejects mismatched prices and non-Owners. CAPTCHA requires Management credentials, updates both layers and fails on missing step-up.');
}finally{globalThis.fetch=saved}
