/* Beta testing readiness is NOT checkout authorization, editorial approval, or a beta pass. */
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/storefront-public-catalog.js';
const originalFetch=globalThis.fetch;
const codes=['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'];
const entries=[...codes.map((code,index)=>({
 sku:'tool:'+code,category:'tool',display_name:code,description:'Educational tool',
 price_label:'$29.99/month',duration_label:'Monthly',product_page:'store-tool-market-tutor.html',
 status:'for_sale',visible:true,sale_ready:true,display_order:index+1,updated_at:'2026-10-28T00:00:00Z'
})),{sku:'tool:SCANNER_BUILDER',category:'tool',display_name:'Scanner Builder',
 status:'coming_soon',visible:true,sale_ready:false,display_order:6},
 {sku:'tool:OPTIONS_LAB',category:'tool',display_name:'Options Lab',
 status:'for_sale',visible:true,sale_ready:true,display_order:7},
 {sku:'book:FOUNDATION_BOOK_2',category:'book',display_name:'Book II',
 status:'for_sale',visible:true,sale_ready:true,display_order:8}];
const tools=[...codes.map(tool_code=>({
 tool_code,active:true,public_visible:true,checkout_enabled:true,status:'live',
 metadata:{beta_testing:{status:'ready_for_beta_testing'}}
})),{tool_code:'SCANNER_BUILDER',active:true,public_visible:true,checkout_enabled:false,status:'beta',
 metadata:{beta_testing:{status:'ready_for_beta_testing'}}},
 {tool_code:'OPTIONS_LAB',active:true,public_visible:true,checkout_enabled:false,status:'planned',
 metadata:{beta_testing:{status:'ready_for_beta_testing'}}}];
let omitTools=false;
const ok=(data)=>Response.json(data);
globalThis.fetch=async url=>{
 const path=String(url);
 if(path.includes('/gu_founder_release_v014173?'))return ok([{public_launch_open:false,enrollment_enabled:false}]);
 if(path.includes('/gu_founder_members_v014173?'))return ok([]);
 if(path.includes('/gu_founder_reservations_v014173?'))return ok([]);
 if(path.includes('/gu_storefront_items_v014174?select=sku,visible,sale_ready,status'))return ok([]);
 if(path.includes('/gu_storefront_items_v014174?select=sku,category,display_name'))return ok(entries);
 if(path.includes('/platform_plans?'))return ok([]);
 if(path.includes('/platform_tools?'))return omitTools?Response.json({error:'unavailable'},{status:503}):ok(tools);
 if(path.includes('/gu_store_layout_v1?'))return ok([]);
 throw Error('Unexpected external query '+path);
};
try{
 const env={SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'};
 const r=await onRequestGet({env});
 assert.equal(r.status,200);const response=await r.json();
 assert.equal(response.ok,true);assert.equal(response.items.length,entries.length);
 assert.deepEqual(response.items.filter(x=>x.betaTestingReady).map(x=>x.sku),
  codes.map(x=>'tool:'+x));
 for(const item of response.items.filter(x=>!codes.includes(x.sku.slice(5))))
  assert.equal(item.betaTestingReady,false,'Unreleased, non-tool, and unavailable SKUs stay unmarked');
 assert.equal(response.items.filter(x=>x.betaTestingReady).every(x=>x.saleReady),true);
 omitTools=true;
 const denied=await (await onRequestGet({env})).json();
 assert(denied.items.every(x=>x.betaTestingReady===false),'Missing canonical readiness must fail closed');
 console.log('PASS beta readiness: four eligible tools only; false on non-tools, planned tools, or canonical outage.');
}finally{globalThis.fetch=originalFetch}
