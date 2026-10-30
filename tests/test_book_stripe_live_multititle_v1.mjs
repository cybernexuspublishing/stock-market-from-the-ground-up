import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOOK_OFFERS,getBookOffer,BOOK_CODE,BOOK_PRICE,BOOK_AMOUNT} from '../functions/_lib/book-stripe-live-v1.js';
import {onRequestGet} from '../functions/api/book-stripe-live-checkout-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const expected=[{"code":"FOUNDATION_BOOK_1","product":"prod_VVF91RJdGeiACx","price":"price_1UVBsDJL0O4GGVBHdqAaP15z","amount":1099,"name":"Stock Market Foundations — Book I"},{"code":"FOUNDATION_BOOK_2","product":"prod_VVF9wc6b7YQs2g","price":"price_1UVBsFJL0O4GGVBHP75QJV4N","amount":1099,"name":"Stock Market Foundations — Book II"},{"code":"FOUNDATION_BOOK_3","product":"prod_VVF9qOuhSENuNW","price":"price_1UVBsLJL0O4GGVBH37PPBw4s","amount":1199,"name":"Stock Market Foundations — Book III WITH RCT"},{"code":"DAY_TRADING_BOOK_1","product":"prod_VVF98mZY1vlf3n","price":"price_1UVBsPJL0O4GGVBH1cdsLBT3","amount":1499,"name":"Day Trading"},{"code":"READING_THE_TAPE","product":"prod_VVF92FwnEje0ow","price":"price_1UVBsSJL0O4GGVBHjElhhG8W","amount":1499,"name":"Reading the Tape"}];
assert.equal(Object.keys(BOOK_OFFERS).length,5);
for(const x of expected){
 const o=getBookOffer(x.code);
 assert.equal(o?.product,x.product);assert.equal(o.price,x.price);assert.equal(o.amount,x.amount);
 const result=await onRequestGet({request:new Request('https://example.org/api/book-stripe-live-checkout-v1?code='+x.code+'&format=epub'),env:{}});
 const b=await result.json();
 assert.equal(b.liveCheckoutAvailable,false,'Unapproved edition must not create checkout');
}
assert.equal(getBookOffer('INVALID_BOOK'),null);
assert.equal(BOOK_CODE,'FOUNDATION_BOOK_1');assert.equal(BOOK_AMOUNT,1099);
assert.equal(BOOK_PRICE,'price_1UVBsDJL0O4GGVBHdqAaP15z');
const sql=read('supabase/migrations/20261030_book_stripe_live_multititle_v1.sql');
for(const x of expected)assert(sql.includes(x.code)&&sql.includes(x.price),'Missing whitelisted SQL title');
const webhook=read('functions/api/stripe-live-webhook-v01458.js');
for(const x of expected)assert(webhook.includes(x.price),'Missing signed webhook price');
assert(webhook.includes('BOOK_LIVE_OFFERS'));
assert(!sql.includes('INSERT INTO public.gu_book_live_intents_v1'));
console.log('PASS five-title Stripe LIVE book whitelist, exact approved prices and default-off checkout.');
