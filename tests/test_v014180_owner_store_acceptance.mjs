import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const endpoint=await import(new URL('../functions/api/store-product-overrides.js',import.meta.url).href);
const goodEnv={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const rows=[
 {sku:'BC-05-TRUTH',title:'Edited course',description:'Safe public copy',store_visible:true,lifecycle:'coming_soon',version:3},
 {sku:'BC-07-WATCH',title:'Hidden',description:'Do not expose',store_visible:false,lifecycle:'coming_soon',version:2},
 {sku:'SC-07-CANDLE',title:'Draft',description:'Do not expose',store_visible:true,lifecycle:'draft',version:1},
 {sku:'SC-10-TAPE',title:'Paused',description:'Do not expose',store_visible:true,lifecycle:'paused',version:1},
 {sku:'BC-30-CORE',title:'Release review',description:'Not for sale',store_visible:true,lifecycle:'release_ready',version:1}
];
const saved=globalThis.fetch;
try {
 globalThis.fetch=async(url,options)=>{
  assert.match(url,/store_product_overrides_v014175/);
  assert.equal(options.headers.apikey,'sb_secret_mock');
  return new Response(JSON.stringify(rows),{status:200,headers:{'content-type':'application/json'}});
 };
 let resp=await endpoint.onRequestGet({env:goodEnv});let data=await resp.json();
 assert.equal(resp.status,200);assert.equal(resp.headers.get('cache-control'),'no-store');
 assert.deepEqual(data.items.map(x=>x.sku),['BC-05-TRUTH','BC-30-CORE']);
 assert.ok(!JSON.stringify(data).includes('BC-07-WATCH'));
 assert.ok(!JSON.stringify(data).includes('SC-07-CANDLE'));
 assert.ok(!JSON.stringify(data).includes('SC-10-TAPE'));
 assert.ok(!JSON.stringify(data).includes('hidden'));
 assert.ok(!JSON.stringify(data).includes('version'));
 globalThis.fetch=async()=>new Response('Backend unavailable',{status:503});
 resp=await endpoint.onRequestGet({env:goodEnv});
 assert.equal(resp.status,503);assert.equal((await resp.json()).ok,false);
 resp=await endpoint.onRequestGet({env:{}});
 assert.equal(resp.status,503);
 const client=read('assets/js/store-inventory-ui-v014174.js');
 // The public All Products page now reads the FULL canonical storefront,
 // never a standalone paid/checkout grant. Historical list is fallback only.
 assert.ok(client.includes("'/api/storefront-public-catalog'"));
 assert.ok(client.includes("j.source!=='verified_storefront'"));
 assert.ok(client.includes('isFull=true'));
 assert.ok(client.includes('base.filter'));
 assert.ok(!client.includes('/api/stripe-live-checkout'));
 const publicCatalog=await import(new URL('../functions/api/storefront-public-catalog.js',import.meta.url).href);
 const liveRows=[
  {sku:'founding:FOUNDING_30',category:'founding',display_name:'Founding Standard',description:'Private founders beta',price_label:'$49.99',duration_label:'30 days',product_page:'',status:'coming_soon',visible:true,sale_ready:false},
  {sku:'tool:INTERACTIVE_LEARNING',category:'tool',display_name:'Interactive Labs',description:'First party educational beta',price_label:'$29.99',duration_label:'monthly',product_page:'https://attacker.example',status:'listed',visible:true,sale_ready:false},
  {sku:'feature:GUIDED_HISTORICAL_LABS',category:'feature',display_name:'Guided Labs',description:'Included in eligible memberships',price_label:'Not sold separately',duration_label:'',product_page:'labs.html',status:'coming_soon',visible:true,sale_ready:false},
  {sku:'plan:FREE',category:'membership',display_name:'Free Membership',description:'Hidden by Owner',price_label:'Free',duration_label:'',product_page:'store-membership-free.html',status:'listed',visible:true,sale_ready:false}
 ];
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers.apikey,'sb_secret_mock');
  const target=String(url);
  // Verified beta is open and there are no issued or reserved founder seats.
  if(target.includes('gu_founder_release_v014173'))return Response.json([{public_launch_open:false,enrollment_enabled:true}]);
  if(target.includes('gu_founder_members_v014173')||target.includes('gu_founder_reservations_v014173'))return Response.json([]);
  if(target.includes('gu_store_layout_v1'))return Response.json([]);
  if(target.includes('gu_storefront_items_v014174')){
   if(target.includes('category=eq.founding'))return Response.json(liveRows.filter(x=>x.category==='founding'));
   assert.match(target,/visible=eq.true/);
   return Response.json(liveRows);
  }
  if(target.includes('platform_tools?select=tool_code,status,active,public_visible,checkout_enabled,metadata'))return Response.json([]);
  if(target.includes('platform_plans?select=plan_code,public_visible,active')){
   return Response.json([{plan_code:'FREE',public_visible:false,active:true},
    {plan_code:'ONDEMAND_MONTHLY',public_visible:true,active:true}]);
  }
  throw new Error('Unexpected catalog query: '+target);
 };
 const publicResponse=await publicCatalog.onRequestGet({env:goodEnv});
 assert.equal(publicResponse.status,200);
 const report=await publicResponse.json();assert.equal(report.count,2,'Founding enrollment-closed product is not publicly offered');
 assert.deepEqual(report.items.map(x=>x.sku),liveRows.filter(x=>!['plan:FREE','founding:FOUNDING_30'].includes(x.sku)).map(x=>x.sku));
 assert.ok(!JSON.stringify(report).includes('Free Membership'),'Canonical plan public_visible=false must suppress stale visible Store records');
 assert.equal(report.items[0].page,null,'Never expose untrusted external product URLs');
 assert(report.items.every(x=>x.betaTestingReady===false),'No canonical ready tool in this fixture');
 assert.ok(!JSON.stringify(report).includes('sb_secret_mock'));
 assert.equal(report.items[0].saleReady,false);
 globalThis.fetch=async()=>new Response('Backend unavailable',{status:503});
 assert.equal((await publicCatalog.onRequestGet({env:goodEnv})).status,503);
 assert.equal((await publicCatalog.onRequestGet({env:{}})).status,503);
 const admin=read('functions/api/admin.js');
 assert.ok(admin.includes("action==='store_product_overlay_save'"));
 assert.ok(admin.includes("action==='store_product_release_check'"));
 assert.ok(admin.includes('checkout_ready:false,can_enable_live_payments:false'));
 const sql=read('supabase/migrations/v0.14.0.175_OWNER_STORE_PRODUCT_OVERLAYS.sql');
 assert.ok(sql.includes('version=p_expected_version'));
 assert.ok(sql.includes("lifecycle <> 'for_sale'"));
 assert.ok(sql.includes('INSERT INTO public.admin_audit_log'));
 console.log('PASS owner storefront acceptance: redaction, publish-only, 503 fail closed, owner security and checkout locked.');
} finally {globalThis.fetch=saved;}
