import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={window:{}};runInNewContext(read('assets/js/store-catalog-visuals-v1.js'),scope);
const {resolve}=scope.window.GroundUpCatalogVisuals;
const samples=[
 ['book:FOUNDATION_BOOK_1','book','assets/images/books/foundation-book-1.webp'],
 ['book:READING_THE_TAPE','book','assets/images/books/reading-the-tape.webp'],
 ['tool:MARKET_TUTOR','tool','assets/img/store-tools/market-tutor.svg'],
 ['course:BC-30-CORE','course','assets/images/bootcamp-covers/foundations30.webp'],
 ['course:BC-05-TRUTH','course','assets/images/bootcamp-covers/truth5.webp'],
 ['course:BC-07-WATCH','course','assets/images/bootcamp-covers/watchlist7.webp'],
 ['course:BC-10-SCAN','course','assets/images/bootcamp-covers/scanners10.webp'],
 ['course:BC-45-CHART','course','assets/images/bootcamp-covers/charts45.webp'],
 ['course:BC-60-RISK','course','assets/images/bootcamp-covers/risk60.webp'],
 ['course:BC-90-PRACT','course','assets/images/bootcamp-covers/practicum90.webp'],
 ['course:SC-10-VWAP','course','assets/images/skill-illustrations/vwap-context.svg'],
 ['feature:GUIDED_HISTORICAL_LABS','feature','assets/images/skill-illustrations/candle-reading.svg'],
 ['addon:SPARKS_10','addon','assets/images/admin-illustrations/learning-system.svg']
];
for(const [sku,category,expected] of samples){
 const image=resolve({sku,category,name:'Public item'});
 assert.equal(image.src,expected,sku);
 assert.ok(existsSync(new URL('../'+image.src,import.meta.url)),sku+' image file absent');
 assert.ok(image.alt.includes(category==='book'?'Cover':'illustration'),sku+' accessible alt missing');
 if(sku.includes('BC-')){const bytes=readFileSync(new URL('../'+image.src,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}
}
const js=read('assets/js/store.js'),inventory=read('assets/js/store-inventory-ui-v014174.js'),api=read('functions/api/storefront-public-catalog.js');
const layout=read('assets/js/admin-store-categories-v014297.js');
assert.match(api,/['"]course['"]/,'Course/Boot Camp category must be public');
assert.match(api,/tool_rows:5/,'Public tool fallback must paginate 5 x 5');
assert.match(js,/tool_rows:5/,'Store tool fallback must paginate 25 per page');
assert.match(layout,/name="tool_rows"[^>]*value="5"/,'Admin must default to 5 rows');
assert.ok(js.includes('catalogImage(x)'), 'Current and Upcoming cards must show images');
assert.ok(inventory.includes('${image(x)}'), 'Full catalog cards must show images');
assert.ok(js.includes('gu-catalog-read-more')&&inventory.includes('gu-catalog-read-more'),'Truncated descriptions need full-detail links');
assert.ok(!js.includes('checkout.stripe.com'),'Catalog must not construct provider checkout links');
console.log('PASS verified first-party images, catalog categories, 5 x 5 layout, detail links and payment-boundary source.');
