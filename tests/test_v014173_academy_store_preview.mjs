import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('store-bootcamps.html');
const store=read('store.html');
const ids=['BC-05-TRUTH','BC-07-WATCH','BC-10-SCAN','BC-30-CORE','BC-45-CHART','BC-60-RISK','BC-90-PRACT','SC-07-CANDLE','SC-10-TAPE','SC-10-VWAP','SC-07-NEWS','SC-07-EDGAR','SC-10-SIZING','SC-07-BREAK','SC-07-JOURNAL'];
assert.equal(ids.length,15);
for(const id of ids){assert.ok(page.includes('data-code="'+id+'"'),'Missing canonical course '+id)}
assert.equal((page.match(/data-code="/g)||[]).length,15,'Do not duplicate listed courses');
assert.ok(store.includes('href="store-bootcamps.html"'),'Main Store must link Academy offerings');
for(const disallowed of ['checkout.html?type=','stripe.com/checkout','payment_link','/api/checkout','price_','prod_','secret_key'])assert.ok(!page.includes(disallowed),'Do not expose checkout/payment in preview: '+disallowed);
assert.ok(page.includes('Coming Soon')&&page.includes('Checkout unavailable'));
assert.ok(page.includes('Final pricing pending'));
console.log('PASS: 15 canonical Boot Camp previews, no paid CTA, no price injection or secret, main Store navigation.');
