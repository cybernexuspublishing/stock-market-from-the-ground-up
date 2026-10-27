import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/owner-stripe-product-sync.js';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_liveMock1234'};
const user='11111111-1111-4111-8111-111111111111';
const books={id:'prod_fullSku123456',name:'Reading the Tape',metadata:{site_sku:'book:READING_THE_TAPE',catalog_category:'book'},amount:1499,type:'one_time'};
const tool={id:'prod_codeSku123456',name:'Catalyst Research',metadata:{site_sku:'CATALYST_RESEARCH',catalog_category:'tool_candidate'},amount:2999,type:'recurring'};
const fresh={id:'prod_NoExisting12345',name:'New Strategy Clinic',metadata:{},amount:2499,type:'one_time'};
const products=[books,tool,fresh];
const rows=[{sku:'book:READING_THE_TAPE',category:'book'},{sku:'tool:CATALYST_RESEARCH',category:'tool'}];
const mapped=[];
let writes=0,stripeMetadataWrites=0,providerAccount='acct_liveMock1234';
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(path,o={})=>{
 const u=String(path),method=o.method||'GET';
 if(u.endsWith('/auth/v1/user'))return reply({id:user});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return reply({ok:true,role:'OWNER'});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return reply(true);
 if(u.endsWith('/v1/account'))return reply({id:providerAccount});
 if(u.includes('/gu_storefront_items_v014174?'))return reply(rows);
 if(u.includes('/gu_owner_stripe_registry_v1?')){
  const id=new URL(u).searchParams.get('stripe_product_id')?.slice(3)||'';
  return reply(mapped.filter(x=>x.stripe_product_id===id));
 }
 if(u.includes('/platform_tools?'))return reply([{individual_price_cents:2999}]);
 if(u.includes('/catalog_products?'))return reply([{metadata:{website_price_by_format_cents_v135:{digital:1499}}}]);
 for(const p of products){
  if(u.endsWith('/v1/products/'+p.id)){
   if(method==='POST'){
    stripeMetadataWrites++;
    const fields=new URLSearchParams(o.body);
    p.metadata.site_sku=fields.get('metadata[site_sku]');
    p.metadata.site_category=fields.get('metadata[site_category]');
   }
   return reply({id:p.id,name:p.name,metadata:p.metadata,livemode:true,active:true});
  }
  if(u.endsWith('/v1/prices/price_'+p.id.slice(5))){
   return reply({id:'price_'+p.id.slice(5),product:p.id,livemode:true,active:true,
    currency:'usd',unit_amount:p.amount,billing_scheme:'per_unit',transform_quantity:null,
    type:p.type,recurring:p.type==='one_time'?null:{interval:'month',interval_count:1,usage_type:'licensed'}});
  }
 }
 if(u.endsWith('/rpc/gu_owner_register_stripe_product_v1')){
  writes++;
  const p=JSON.parse(o.body);
  mapped.push({sku:p.p_sku,stripe_product_id:p.p_product_id,stripe_price_id:p.p_price_id});
  if(!rows.find(r=>r.sku===p.p_sku))rows.push({sku:p.p_sku,category:p.p_sku.split(':')[0]});
  return reply({ok:true,sku:p.p_sku,newStoreItem:writes===1});
 }
 throw Error('Unhandled '+method+' '+u);
};
async function action(product,rest={}){
 const input={productId:product.id,priceId:'price_'+product.id.slice(5),...rest};
 const r=await onRequestPost({env,request:new Request(site+'/api/owner-stripe-product-sync',
  {method:'POST',headers:{authorization:'Bearer owner',origin:site,'content-type':'application/json'},body:JSON.stringify(input)})});
 return {status:r.status,data:await r.json()};
}
try{
 let r=await action(tool,{operation:'preview'});
 assert.equal(r.status,200);assert.equal(r.data.sku,'tool:CATALYST_RESEARCH');
 assert.equal(r.data.source,'existing_store_item');assert.equal(writes,0);
 r=await action(books,{operation:'preview'});
 assert.equal(r.status,200);assert.equal(r.data.sku,'book:READING_THE_TAPE');
 r=await action(books,{operation:'preview',category:'tool'});
 assert.equal(r.status,409);
 r=await action(fresh,{operation:'preview'});
 assert.equal(r.status,400,'No SKU/category should ask Owner to select category');
 r=await action(fresh,{operation:'preview',category:'course'});
 assert.equal(r.status,200);assert.equal(r.data.sku,'course:STRIPE_NOEXISTING12345');
 assert.equal(r.data.generated,true);assert.equal(writes,0);
 const generated=r.data.sku;
 r=await action(fresh,{operation:'save',category:'course',expectedSku:generated});
 assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal(r.data.sku,generated);assert.equal(writes,1);
 assert.equal(stripeMetadataWrites,1);assert.equal(fresh.metadata.site_sku,generated);
 assert.equal(fresh.metadata.site_category,'course');
 r=await action(fresh,{operation:'preview'});
 assert.equal(r.status,200);assert.equal(r.data.sku,generated);
 r=await action(fresh,{operation:'save',expectedSku:generated});
 assert.equal(r.status,200);assert.equal(stripeMetadataWrites,1,'Retry must not rewrite existing Stripe SKU');
 r=await action(tool,{operation:'preview',category:'book'});assert.equal(r.status,409);
 r=await action(tool,{operation:'save',expectedSku:'tool:WRONG'});assert.equal(r.status,409);
 assert.equal(writes,2,'Only verified saves should write');
 providerAccount='acct_unrelated99999';
 r=await action(tool,{operation:'preview'});assert.equal(r.status,409);
 console.log('PASS: existing raw/full Stripe site_sku, category inference, stable generated SKU, Stripe metadata synchronization, price/account guards, no writes in preview.');
}finally{globalThis.fetch=original}
