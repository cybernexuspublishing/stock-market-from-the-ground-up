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
 // V1 Founding-only Store policy supersedes the legacy unrestricted
 // existing_catalog listing. Keep started public book entries, not legacy plans.
 assert.ok(client.includes('base.filter(listedCore)'));
 assert.ok(client.includes("p.category==='Books'&&p.status==='existing_catalog'"));
 assert.ok(client.includes("FOUNDING_(30|60)"));
 assert.ok(client.includes('bySku.has(p.sku)'));
 assert.ok(!client.includes('stripe-live-checkout'));
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
