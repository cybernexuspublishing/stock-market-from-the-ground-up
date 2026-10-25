import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context={window:{}};vm.runInNewContext(read('assets/js/store-inventory-v014174.js'),context);
const rows=Array.from(context.window.GroundUpPrelaunchInventory),planned=rows.filter(r=>r.status==='coming_soon');
const sql=read('supabase/migrations/v0.14.0.176_SEED_PRELAUNCH_PRODUCT_COPY.sql'),api=read('functions/api/admin.js'),
frontend=read('assets/js/admin-product-catalog-v014175.js'),publicEndpoint=read('functions/api/store-product-overrides.js');
assert.equal(rows.length,51);assert.equal(planned.length,38);
for(const r of planned){assert.ok(sql.includes("'"+r.sku+"'"),'Missing DB seed: '+r.sku);assert.ok(api.includes('"'+r.sku+'"'),'Missing API allowlist: '+r.sku)}
assert.ok(sql.includes('ON CONFLICT (sku) DO NOTHING'),'Seed must preserve edited products');
assert.ok(frontend.includes('api(\'store_product_release_check\',undefined,sku)'),'Readiness route must send independent SKU parameter');
assert.ok(frontend.includes('expected_version:overrides.get(sku)?.version||0'),'Client must send CAS revision');
assert.ok(api.includes("return bad('For Sale is locked"));
assert.ok(publicEndpoint.includes("cache-control':'no-store"));
console.log('PASS: 38 seeded, allowed, revision-safe product drafts; 13 established items remain separately governed.');
