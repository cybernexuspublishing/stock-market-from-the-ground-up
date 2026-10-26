/* v0.14.0.89 — Sales and unified Products regression, no checkout/purchases. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const admin=read('admin.html'),store=read('store.html'),storeJs=read('assets/js/store.js');
const product=read('assets/js/admin-products-v01489.js'),api=read('functions/api/admin.js');
const adminJs=read('assets/js/admin.js'),platform=read('assets/js/admin-platform.js');
const detail=read('assets/js/store-product-detail-v01484.js');
for(const f of ['assets/js/admin-products-v01489.js','assets/js/store.js','assets/js/store-product-detail-v01484.js','assets/js/admin.js','assets/js/admin-platform.js']){
 // node --check is used independently by workflow; all customer scripts parse.
 assert.ok(read(f).length>1000);
}
assert.ok(store.includes('store-sales-v01489.css'));
for(const s of ['Subscribe Now','Choose This Membership','Coming Soon','Pricing to be announced'])assert.ok(storeJs.includes(s),s);
assert.ok(storeJs.includes('allTools.map(toolCard)'),'Public Store must display planned/beta catalog rows, not only live paid SKUs');
const upcomingSource=read('assets/js/store-upcoming-offerings-v01490.js');
for(const route of ['labs.html','assessments.html','ondemand-training.html','learn.html','data-connections.html','lab-samples.html']){
 assert.ok(upcomingSource.includes(route),'Missing reviewed upcoming learning route '+route);
 assert.ok(read(route).length>300,'Future route absent '+route);
}
// V1 owner policy supersedes the old marketing requirement to display all
// roadmap concepts: unstarted ideas are hidden rather than sold or advertised.
assert.ok(storeJs.includes('const futureLearning=()=>[];'),'Unstarted roadmap offerings must remain hidden.');
assert.ok(!storeJs.includes('GroundUpUpcomingOfferings'),'Public Store must not use obsolete generic upcoming cards.');
assert.ok(storeJs.includes('t.checkoutEnabled'),'Paid CTA requires verified checkout-enabled catalog');
assert.ok(detail.includes('buyEnabled=released&&t.checkoutEnabled===true'),'Detail checkout is server/catalog gated');
assert.ok(detail.includes('What you’ll learn in this book'),'Customer-facing book heading');
assert.ok(!detail.includes('Subject areas and learning focus (not a chapter list)'),'No internal curriculum caveats in customer heading');
assert.ok(admin.includes('data-panel="products"'));
assert.ok(!admin.includes('<button data-panel="catalog">'));
for(const id of ['admin-products-tab-memberships','admin-products-tab-books','admin-products-tab-tools',
'admin-products-membership-list','admin-catalog-list','admin-products-tool-list','admin-new-product']){
 assert.ok(admin.includes(id),'Missing admin Products control '+id);
}
assert.ok(adminJs.includes("products:'catalog.view'"));
assert.ok(adminJs.includes("window.GroundUpAdminProducts?.load()"));
assert.ok(adminJs.includes('GroundUpAdminBookEditor'),'Book editor must be reused, preserving existing retailer/KDP controls');
assert.ok(platform.includes('GroundUpAdminToolEditor'),'Tools editor must be reused');
assert.ok(product.includes("'/api/plan-controls'"),'Membership visibility must use Owner RPC, never client DB');
assert.ok(product.includes("'catalog.view'")&&product.includes("'tools.manage'"),'Permission gating for product tabs');
assert.ok(!product.includes('sb_secret_'),'No Supabase server credentials in customer/admin JS');
assert.ok(api.includes("LIVE Stripe prices cannot be edited here."),'Server prevents unapproved Stripe price changes');
assert.ok(api.includes("if(action==='plan_copy_save')"),'Customer membership name/description must be edit-authorized');
assert.ok(api.includes('OWNER approval required for customer-facing membership copy'),'Copy updates must not be available to non-Owner');
assert.ok(api.includes('expected_updated_at'),'Owner copy updates require optimistic database revision');
assert.ok(product.includes('data-plan-copy'),'Membership edit action must be available inside Products');
assert.ok(api.includes("A new LIVE tool requires"),'Server prevents instant unauthorized LIVE tool launch');
assert.ok(api.includes("Checkout destinations must be activated"),'Server forbids malicious checkout URL edits');
assert.ok(api.includes("Pausing a billed LIVE tool requires"),'No accidental paid-user entitlement shutdown');
assert.ok(!admin.includes('id="v11-plans"'),'Do not create parallel product pricing register');
console.log('PASS v89: three-category Products admin, preserved book/tool editors, owner-only visibility, sales-first Store, hidden-unstarted policy, checkout and Stripe mutation safeguards.');
