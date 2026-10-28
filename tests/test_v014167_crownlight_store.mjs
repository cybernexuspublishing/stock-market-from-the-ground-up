import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=path=>readFileSync(path,'utf8');
const catalog=JSON.parse(text('data/crownlight-sparks-store-v014167.json'));
const store=text('store.html');
const css=text('assets/css/store-sparks-v014167.css');
const svg=text('assets/img/crownlight-spark.svg');
const ownerApi=text('functions/api/admin-lantern-sparks.js');
assert.equal(catalog.brand,'Crownlight Sparks');
assert.equal(catalog.checkoutEnabled,false,'External payment activation is deferred');
assert.equal(catalog.packages.length,5);
for(const p of catalog.packages){
 assert.equal(p.checkoutEnabled,false);
 assert(Number.isSafeInteger(p.quantity)&&p.quantity>0);
 assert(Number.isSafeInteger(p.priceCents)&&p.priceCents>=0);
 assert(store.includes('data-package="'+p.code+'"'),'Missing store placement '+p.code);
 assert(store.includes((p.priceCents/100).toFixed(2)),'Visible prices differ from source registry '+p.code);
 assert(store.includes(p.quantity+' Crownlight Sparks'),'Visible package quantity differs '+p.code);
}
assert(store.includes('id="store-crownlight"'));
assert(store.includes('assets/img/crownlight-spark.svg'));
assert(svg.includes('<title id="title">Crownlight Spark</title>'));
assert(css.includes('.store-crownlight-packages'));
assert(!store.includes('checkout.html?type=pass'),'Sparks must not accidentally activate checkout');
assert(!store.includes('checkout.html?type=spark'),'Sparks must not accidentally activate checkout');
assert(ownerApi.includes('groundup_question_pass_adjust'),
 'Administrative adjustments must use authenticated server-owned ledger');
assert(catalog.supportPolicy.includes('Core instruction and ordinary practice retries remain included'),
 'Always-free instruction must not be paywalled');
console.log('PASS Crownlight Sparks logo, 5 source-matched package previews, disabled checkout, server-owned Admin ledger');
