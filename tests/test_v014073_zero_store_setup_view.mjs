/* v80 retirement: Zero-dollar LIVE QA product no longer belongs in the public Store.
 * The original JS and signed event handler remain in source for historical
 * transaction reconciliation but MUST NOT be reachable from public Store. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const store=read('store.html');
const renderer=read('assets/js/store.js');
const historical=read('assets/js/store-zero-live-qa.js');
const api=read('functions/api/store-zero-monthly-qa.js');
const signed=read('functions/api/stripe-live-webhook-v01458.js');
const catalog=JSON.parse(read('data/store-products.json'));
assert.doesNotMatch(store,/id="store-zero-monthly-qa"|Monthly Membership Test|store-zero-monthly-begin|store-zero-live-qa\.js/i);
assert.doesNotMatch(renderer,/monthly\.after\(qa\)|planRoot\.append\(qa\)|store-zero-monthly-qa/);
assert.ok(store.includes('id="store-products"'),'Existing book catalog remains in the Store');
assert.ok(store.includes('Current and upcoming books'),'Existing book section unchanged');
assert.ok(renderer.includes('Buy Kindle on Amazon'),'Amazon purchase links are preserved');
assert.ok(renderer.includes('Buy Paperback on Amazon'),'Amazon print links preserved');
assert.ok(renderer.includes('Buy Hardcover on Amazon'),'Amazon hardcover links preserved');
assert.equal(catalog.length,5,'Book catalog is untouched, including all future books');
assert.equal(catalog.filter(x=>x.productCode.startsWith('FOUNDATION_BOOK_')).length,3);
assert.equal(catalog.filter(x=>x.kdpSelect===true).length,5,'KDP data is never edited by retiring the test checkout');
assert.ok(historical.includes('RESET_MY_ZERO_MONTHLY_QA_ACCESS'),'Historical QA support source is kept');
assert.ok(signed.includes('gu72_signed_zero_monthly_grant'),'Existing signed event delivery stays available');
assert.ok(api.includes('QA_OFFER_CLOSED'),'Backend stops new zero-dollar Store checkouts');
console.log('PASS v80: no $0 Store card/script or injected plan, KDP/book data and Amazon channels preserved, history-safe QA webhook remains.');
