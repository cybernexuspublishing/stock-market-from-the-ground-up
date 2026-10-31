import assert from 'node:assert/strict';
const base='https://stock-market-from-the-ground-up-d1r.pages.dev';
const books={FOUNDATION_BOOK_1:1099,FOUNDATION_BOOK_2:1099,FOUNDATION_BOOK_3:1199,DAY_TRADING_BOOK_1:1499,READING_THE_TAPE:1499};
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(45000)});return {status:r.status,json:await r.json()}}
let pass=0;
for(const [code,price] of Object.entries(books)){
 const r=await get('/api/book-stripe-live-checkout-v1?code='+code+'&format=epub');
 assert.equal(r.status,200,'API HTTP '+code);
 assert.equal(r.json.liveCheckoutAvailable,true,'Book LIVE gate: '+code+' '+String(r.json.reason||''));
 assert.equal(r.json.offer?.unitAmountCents,price,'Incorrect price: '+code);
 console.log('PASS live noncharging Stripe price, DB rights and EPUB asset: '+code);
 pass++;
}
const publicResult=await get('/api/storefront-public-catalog');
assert.equal(publicResult.status,200);
assert.equal(publicResult.json.ok,true);
for(const code of Object.keys(books)){
 const item=(publicResult.json.items||[]).find(x=>x.sku==='book:'+code);
 assert(item&&item.saleReady===true&&item.status==='for_sale','Storefront not showing book as sale ready: '+code);
}
console.log('PASS '+pass+' books in public Store catalog with matching live price and verified rights');
