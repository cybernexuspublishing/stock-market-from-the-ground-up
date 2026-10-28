import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('functions/api/store-product-overrides.js');
const ui=read('assets/js/store-inventory-ui-v014174.js');
const admin=read('assets/js/admin-product-catalog-v014175.js');
const server=read('functions/api/admin.js');
for(const state of ['coming_soon','release_ready']) assert.ok(api.includes(state),'Public publishable lifecycle missing: '+state);
for(const state of ['draft','paused']) assert.ok(admin.includes("'"+state+"'"),'Owner editor must support hidden lifecycle: '+state);
assert.ok(api.includes("['coming_soon','release_ready'].includes(x.lifecycle)"),'Public feed must allow only explicitly publishable lifecycle states');
for(const state of ['draft','paused']) assert.ok(!api.includes("'"+state+"'"),'Public feed must not enumerate hidden lifecycle: '+state);
assert.ok(api.includes('store_visible===true'));
assert.ok(!api.includes('items,hidden'),'Public response must not reveal hidden SKU identifiers');
assert.ok(api.includes("cache-control':'no-store'"),'No stale product visibility cache');
assert.ok(ui.includes('const listedCore=p=>')&&ui.includes("p.category==='Books'&&p.status==='existing_catalog'")&&
 !ui.includes("/^FOUNDING_(30|60)$/.test(p.sku)"),'Unverified fallback must retain existing approved books but never revive founding offers after closure');
assert.ok(ui.includes('base.filter(listedCore)')&&ui.includes('isFull=true'),'Only the authorized production catalog may expand beyond the safe fallback');
assert.ok(ui.includes("'/api/storefront-public-catalog'"),'Only published public production storefront records may expand the catalog');
const publicSource=read('functions/api/storefront-public-catalog.js');
assert.ok(publicSource.includes('visible=eq.true')&&publicSource.includes('x?.visible===true'),'The public endpoint must never expose hidden inventory');

assert.ok(admin.includes("expected_version:overrides.get(sku)?.version||0"),'Editor saves must carry CAS version');
assert.ok(admin.includes("api('store_product_release_check',undefined,sku)"),'Owner readiness button must call server');
assert.ok(server.includes("checkout_ready:false,can_enable_live_payments:false"),'Incomplete product must never be marked sellable');
assert.ok(!ui.includes('stripe-live-checkout')&&!admin.includes('stripe-live-checkout'));
console.log('PASS: owner status changes affect public listing only after server confirmation; no live checkout');
