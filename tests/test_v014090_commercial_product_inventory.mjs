import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const registry=read('assets/js/store-upcoming-offerings-v01490.js');
const sandbox={window:{}};vm.runInNewContext(registry,sandbox);
const rows=Array.from(sandbox.window.GroundUpUpcomingOfferings);
assert.equal(rows.length,6,'Six existing supporting educational offerings must be represented');
assert.equal(new Set(rows.map(x=>x.code)).size,rows.length,'Duplicate roadmap SKU codes');
for(const item of rows){
 assert.match(item.code,/^[A-Z][A-Z_]+$/);
 assert.ok(existsSync(new URL('../'+item.route,import.meta.url)),'Missing actual page '+item.route);
 assert.ok(item.name&&item.description&&item.category);
 assert.equal(item.priceCents,undefined,'Never invent pricing for planned offerings');
 assert.equal(item.stripePriceId,undefined,'Never invent Stripe Price records');
}
const store=read('assets/js/store.js'),admin=read('assets/js/admin-products-v01489.js'),editor=read('assets/js/admin-platform.js'),
storeHtml=read('store.html'),adminHtml=read('admin.html'),css=read('assets/css/store-sales-v01489.css'),
payment=read('functions/api/admin.js');
for(const name of ['store.html','admin.html'])assert.ok(read(name).includes('store-upcoming-offerings-v01490.js'));
assert.ok(store.includes('const futureLearning=()=>[];'),'Unstarted offerings remain hidden from public Store');
assert.ok(store.includes('const futureLearning=()=>[];'),'Unstarted roadmap placeholders must stay out of public Store');
assert.ok(store.includes('renderStoreCatalogPanels()'),'Current and upcoming public listings must use verified catalog, not unapproved roadmap placeholders');
assert.ok(store.includes('store-price-label'));
assert.ok(store.includes('Subscribe Now'),'Selling must have actionable checkout when verified live');
assert.ok(store.includes('checkout.html?type=tool'),'Only existing protected local checkout can sell tools');
assert.ok(store.includes('store-soon-label'),'Unreleased tools cannot have an active checkout CTA');
assert.ok(css.includes('.store-sell-price'),'Pricing must be prominent');
assert.ok(adminHtml.includes('data-panel="products"'),'Single admin Products category required');
for(const key of ['admin-products-memberships','admin-products-books','admin-products-tools'])assert.ok(adminHtml.includes(key));
assert.ok(admin.includes('upcomingAdmin()'));
assert.ok(admin.includes('Create Planned SKU'));
assert.ok(admin.includes('GroundUpAdminToolEditor?.add({tool_code:item.code'),'Prefilled planned SKU required');
assert.ok(editor.includes("status:'planned'"));
assert.ok(payment.includes("LIVE Stripe prices cannot be edited here"),'Do not desynchronize Stripe prices');
assert.ok(payment.includes("A new LIVE tool requires a separate verified release"));
assert.ok(payment.includes("changing LIVE tool entitlements")||payment.includes("Changing LIVE tool entitlements"));
assert.ok(store.includes("dollars(t.priceCents)+'/month'"));
assert.ok(read('assets/js/store-product-detail-v01484.js').includes('What you’ll learn in this book'));
console.log('PASS v90: all six established upcoming capabilities, explicit price states, protected sale CTA, one Admin Products category, planned prefill and Stripe price invariants.');
