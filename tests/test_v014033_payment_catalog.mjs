import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/payment-catalog-v01433.js';
const req=(auth='Bearer session')=>new Request('https://stock.example/api/payment-catalog-v01433',{headers:{authorization:auth}});
const env={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publish-key',SUPABASE_SECRET_KEY:'server-secret',STRIPE_MANAGED_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_demoTEST123','tool:INTERACTIVE_LEARNING':'price_testDEF456'})};
const old=globalThis.fetch;
try{
 let calls=[];
 globalThis.fetch=async(url,opt)=>{calls.push({url:String(url),auth:opt.headers.authorization});
  if(String(url).includes('/rpc/gu_owner_digital_payment_route_read_v01432r2'))return Response.json({ok:true,role:'ADMIN',provider:'STRIPE_MANAGED',enabled:false});
  if(String(url).includes('/platform_plans?'))return Response.json([{plan_code:'FULL_MONTHLY',name:'Full Monthly',price_cents:6999,billing_interval:'month',active:true,public_visible:true},{plan_code:'FREE',name:'Free',price_cents:0,billing_interval:'none',active:true,public_visible:true}]);
  if(String(url).includes('/platform_tools?'))return Response.json([{tool_code:'INTERACTIVE_LEARNING',name:'Interactive Learning',individual_price_cents:2999,status:'live',active:true,public_visible:true},{tool_code:'PLANNED',name:'Planned Tool',individual_price_cents:2999,status:'planned',active:true,public_visible:true}]);
  if(String(url).includes('/catalog_products?'))return Response.json([{product_code:'FOUNDATION_BOOK_1',title:'Foundations',product_type:'book',kdp_select:true,direct_digital_enabled:false,metadata:{},active:true,store_visible:true,sales_status:'published'}]);
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
 assert.equal(JSON.stringify(data).includes('server-secret'),false);
 assert.equal(JSON.stringify(data).includes('price_demoTEST123'),false);
 assert.equal(calls.filter(c=>c.auth==='Bearer server-secret').length,3);
 // An authenticated member cannot invoke the service-catalog lookups.
 calls=[];
 globalThis.fetch=async(url,opt)=>{calls.push(String(url));return Response.json({ok:false,role:'MEMBER'},{status:403})};
 assert.equal((await onRequestGet({request:req(),env})).status,403);
 assert.equal(calls.length,1);
 assert.equal((await onRequestPost()).status,405);
 console.log('PASS v014033: privileged catalog, mapping flags only, no cross-role records or provider secrets');
}finally{globalThis.fetch=old}
