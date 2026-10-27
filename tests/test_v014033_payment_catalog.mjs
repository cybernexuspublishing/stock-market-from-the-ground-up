import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/payment-catalog-v01433.js';
const req=(auth='Bearer session')=>new Request('https://stock.example/api/payment-catalog-v01433',{headers:{authorization:auth}});
const env={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publish-key',SUPABASE_SECRET_KEY:'mock_service_key',STRIPE_MANAGED_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_demoTEST123','tool:INTERACTIVE_LEARNING':'price_testDEF456'})};
const old=globalThis.fetch;
try{
 let calls=[];
 globalThis.fetch=async(url,opt)=>{calls.push({url:String(url),auth:opt.headers.authorization});
  if(String(url).includes('/rpc/gu_owner_digital_payment_route_read_v01432r2'))return Response.json({ok:true,role:'ADMIN',provider:'STRIPE_MANAGED',enabled:false});
  if(String(url).includes('/platform_plans?'))return Response.json([{plan_code:'FULL_MONTHLY',name:'Full Monthly',price_cents:6999,billing_interval:'month',active:true,public_visible:true},{plan_code:'FREE',name:'Free',price_cents:0,billing_interval:'none',active:true,public_visible:true}]);
  if(String(url).includes('/platform_tools?'))return Response.json([{tool_code:'INTERACTIVE_LEARNING',name:'Interactive Learning',individual_price_cents:2999,status:'live',active:true,public_visible:true},{tool_code:'PLANNED',name:'Planned Tool',individual_price_cents:2999,status:'planned',active:true,public_visible:true}]);
  if(String(url).includes('/catalog_products?'))return Response.json([{product_code:'FOUNDATION_BOOK_1',title:'Foundations',product_type:'book',kdp_select:true,direct_digital_enabled:false,metadata:{},active:true,store_visible:true,sales_status:'published'}]);
  if(String(url).includes('/gu_storefront_items_v014174?'))return Response.json([{sku:'tool:INTERACTIVE_LEARNING',category:'tool',display_name:'Interactive Learning',status:'listed',visible:false,sale_ready:false,price_label:'$29.99',version:1}]);
  if(String(url).includes('/gu_storefront_items_v014174?'))return Response.json([{sku:'founding:FOUNDING_30',category:'founding',display_name:'Founding Standard',status:'coming_soon',visible:false,sale_ready:false,price_label:'$49.99',version:1}]);
  throw Error('Unexpected URL '+url);
 };
 assert.equal((await onRequestGet({request:req(''),env})).status,401);
 assert.equal(calls.length,0);
 let result=await onRequestGet({request:req(),env});
 assert.equal(result.status,200);const data=await result.json();assert.equal(data.products.length,5);
 assert.equal(data.products.find(x=>x.key==='plan:FULL_MONTHLY').mapped,true);
 assert.equal(data.products.find(x=>x.key==='plan:FREE').eligible,false);
 assert.equal(data.products.find(x=>x.key==='book:FOUNDATION_BOOK_1').eligible,false);
 assert.equal(data.products.find(x=>x.key==='book:FOUNDATION_BOOK_1').amountCents,null);
 assert.equal(data.products.find(x=>x.key==='tool:PLANNED').eligible,false);
 assert.equal(JSON.stringify(data).includes('mock_service_key'),false);
 assert.equal(JSON.stringify(data).includes('price_demoTEST123'),false);
 assert.equal(calls.filter(c=>c.auth==='Bearer mock_service_key').length,4);
 // The current production contract uses GU58/F600 catalogs; legacy map may
 // be missing entirely. Never report a false 0 mapped in that configuration.
 delete env.STRIPE_MANAGED_PRICE_MAP_JSON;
 env.GU58_STRIPE_LIVE_CATALOG_JSON=JSON.stringify({
  'plan:FULL_MONTHLY':{product_id:'prod_prodTEST888',price_id:'price_liveTEST888'},
  'tool:INTERACTIVE_LEARNING':{product_id:'prod_prodTEST999',price_id:'price_liveTEST999'}
 });
 env.GU_F600_LIVE_CATALOG_JSON=JSON.stringify({
  'FOUNDING_30':{productId:'prod_founderTEST8',priceId:'price_founderTEST8'}
 });
 result=await onRequestGet({request:req(),env});
 assert.equal(result.status,200);
 const modern=await result.json();
 assert.equal(modern.mappedCount,2,'GU58 must map canonical standard SKUs');
 assert.equal(modern.foundingMappedCount,1,'F600 mapped separately');
 assert.equal(modern.products.find(x=>x.key==='plan:FULL_MONTHLY').mappingSource,'GU58_LIVE');
 assert.equal(JSON.stringify(modern).includes('price_liveTEST888'),false,'Do not reveal provider ids');

 // An authenticated member cannot invoke the service-catalog lookups.
 calls=[];
 globalThis.fetch=async(url,opt)=>{calls.push(String(url));return Response.json({ok:false,role:'MEMBER'},{status:403})};
 assert.equal((await onRequestGet({request:req(),env})).status,403);
 assert.equal(calls.length,1);
 assert.equal((await onRequestPost()).status,405);
 console.log('PASS v014033: privileged catalog, mapping flags only, no cross-role records or provider secrets');
}finally{globalThis.fetch=old}
