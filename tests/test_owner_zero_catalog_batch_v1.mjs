import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const handler=await import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL('../functions/api/owner-zero-live-checkout.js',import.meta.url),'utf8')).toString('base64'));
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev',
 supabase='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const env={PUBLIC_SITE_URL:origin,SUPABASE_URL:supabase,SUPABASE_SECRET_KEY:'sb_secret_mock',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',GU71_ZERO_LIVE_QA_ENABLED:'true',
 GU71_ZERO_LIVE_PRODUCT_ID:'prod_zero12345',GU71_ZERO_LIVE_PRICE_ID:'price_zero12345',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_prod12345',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU58_STRIPE_LIVE_CATALOG_JSON:'{}'};
const member='11111111-1111-4111-8111-111111111111';
let stripeCreated=0,batchCreated=0,bound=0,metadata={};
const all=[
 {sku:'course:BC-05-TRUTH',category:'bootcamp',visible:true},
 {sku:'course:BC-30-CORE',category:'bootcamp',visible:true},
 {sku:'tool:DISCOVERY_LAB',category:'tool',visible:true}
];
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json'}});
const saved=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';
 if(u.endsWith('/auth/v1/user'))return json({id:member});
 if(u.includes('/rpc/gu_staff_role'))return json({ok:true,role:'OWNER'});
 if(u.includes('/rpc/gu_staff_stepup_active'))return json(true);
 if(u.includes('/gu_storefront_items_v014174'))return json(all);
 if(u.includes('/gu_owner_zero_live_batches_v1')&&method==='POST'){
  batchCreated++;let x=JSON.parse(opts.body);
  assert.equal(x.owner_id,member);assert(Array.isArray(x.selected_skus));
  return json([{id:'22222222-2222-4222-8222-'+String(batchCreated).padStart(12,'0')}]);
 }
 if(u.includes('/gu_owner_zero_live_batches_v1')&&method==='PATCH'){
  bound++;return json([{stripe_session_id:JSON.parse(opts.body).stripe_session_id}]);
 }
 if(u.endsWith('/v1/account'))return json({id:'acct_prod12345'});
 if(u.endsWith('/v1/products/prod_zero12345'))return json({id:'prod_zero12345',active:true,livemode:true,metadata:{gu71_zero_qa:'true'}});
 if(u.endsWith('/v1/prices/price_zero12345'))return json({id:'price_zero12345',product:'prod_zero12345',livemode:true,active:true,
  currency:'usd',unit_amount:0,billing_scheme:'per_unit',transform_quantity:null,type:'one_time',recurring:null});
 if(u.endsWith('/v1/checkout/sessions')&&method==='POST'){
  stripeCreated++;let p=new URLSearchParams(opts.body);metadata=Object.fromEntries(p);
  assert.equal(p.get('mode'),'payment');
  assert.equal(p.get('line_items[0][price]'),'price_zero12345');
  assert.equal(p.get('line_items[0][quantity]'),'1');
  assert.equal(p.get('metadata[gu71_zero_qa]'),'true');
  assert(!p.has('metadata[gu58_intent]'));
  assert.match(p.get('metadata[gu71_batch_id]'),/^[a-f\d-]{36}$/);
  return json({id:'cs_live_batch12345',livemode:true,amount_total:0,amount_subtotal:0,
   mode:'payment',payment_intent:null,subscription:null,payment_method_collection:'if_required',
   url:'https://checkout.stripe.com/c/pay/cs_live_batch12345'});
 }
 throw Error('Unexpected request '+method+' '+u);
};
const run=async(data)=>{
 const response=await handler.onRequestPost({env,request:new Request(origin+'/api/owner-zero-live-checkout',{
 method:'POST',headers:{origin,authorization:'Bearer owner','content-type':'application/json'},
 body:JSON.stringify({confirm:'CREATE_ZERO_DOLLAR_LIVE_QA',...data})})});
 return {status:response.status,body:await response.json()};
};
try{
 let r=await run({selection:'category',category:'bootcamp'});
 assert.equal(r.status,200);assert.equal(r.body.selectedCount,2);
 assert.equal(metadata['metadata[gu71_selector]'],'category:bootcamp');
 assert.equal(metadata['metadata[gu71_target_count]'],'2');
 r=await run({selection:'selected',skus:['tool:DISCOVERY_LAB','course:BC-30-CORE']});
 assert.equal(r.status,200);assert.equal(r.body.selectedCount,2);
 r=await run({selection:'all'});assert.equal(r.status,200);assert.equal(r.body.selectedCount,3);
 assert.equal(stripeCreated,3);assert.equal(bound,3);assert.equal(batchCreated,3);
 r=await run({selection:'selected',skus:['tool:MISSING']});
 assert.equal(r.status,400);assert.equal(stripeCreated,3);
 r=await run({selection:'selected',skus:['course:BC-05-TRUTH','course:BC-05-TRUTH']});
 assert.equal(r.status,400);assert.equal(stripeCreated,3);
 console.log('PASS: category/selected/all Owner LIVE $0 catalog diagnostics; 1 zero-price Stripe session per action, idempotent audited manifests, no paid price or entitlement.');
}finally{globalThis.fetch=saved}
