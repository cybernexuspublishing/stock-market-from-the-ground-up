import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/storefront-public-catalog.js';
const env={SUPABASE_URL:'https://mockcatalog.supabase.co',SUPABASE_SECRET_KEY:'mock-secret'};
const state={full:false,publicLaunch:false,available:true};
const source=[
 {sku:'plan:FOUNDING_30',category:'founding',display_name:'Founding Standard',description:'Beta 30d',price_label:'$49.99',
 duration_label:'30 days',product_page:'founding600.html',status:'listed',visible:true,sale_ready:false,display_order:0},
 {sku:'book:FOUNDATION_BOOK_1',category:'book',display_name:'Foundations Book I',description:'Book',price_label:'$10.99',
 duration_label:'',product_page:'store-book-foundation-1.html',status:'listed',visible:true,sale_ready:true,display_order:1}
];
const json=(a,status=200)=>new Response(JSON.stringify(a),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async input=>{
 const u=new URL(input);assert.equal(u.hostname,'mockcatalog.supabase.co');
 switch(u.pathname){
  case '/rest/v1/gu_founder_release_v014173':return json([{public_launch_open:state.publicLaunch,enrollment_enabled:true}]);
  case '/rest/v1/gu_founder_members_v014173':return json(state.full?Array.from({length:600},(_,i)=>({founder_number:i+1})):[]);
  case '/rest/v1/gu_founder_reservations_v014173':return json([]);
  case '/rest/v1/gu_storefront_items_v014174':return json(source);
  case '/rest/v1/platform_plans':return json([{plan_code:'FOUNDING_30',active:true,public_visible:true}]);
  case '/rest/v1/gu_store_layout_v1':return json([{catalog_columns:4,catalog_rows:3}]);
  default:throw Error('Unanticipated SQL endpoint '+u.pathname);
 }
};
try{
 let r=await onRequestGet({env});let j=await r.json();
 assert.equal(r.status,200);assert.equal(j.items.length,2);
 state.full=true;r=await onRequestGet({env});j=await r.json();
 assert.equal(j.items.length,1);assert(j.items.every(x=>x.category!=='founding'));
 state.full=false;state.publicLaunch=true;
 r=await onRequestGet({env});j=await r.json();
 assert.equal(j.items.length,1);assert(j.items[0].sku==='book:FOUNDATION_BOOK_1');
 console.log('PASS Public Store API: founders visible in available beta, hidden with all 600 seats or general launch; books preserved');
}finally{globalThis.fetch=original}
