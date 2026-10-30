import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {onRequestGet,onRequestPost} from '../functions/api/book-stripe-live-checkout-v1.js';
import {applyVerifiedBookEvent,BOOK_CODE,BOOK_PRICE,BOOK_AMOUNT} from '../functions/_lib/book-stripe-live-v1.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const p of ['functions/api/book-stripe-live-checkout-v1.js','functions/_lib/book-stripe-live-v1.js',
 'assets/js/checkout-platform.js','functions/api/stripe-live-webhook-v01458.js','functions/_middleware.js'])
 execFileSync(process.execPath,['--check',new URL('../'+p,import.meta.url).pathname]);
const db=source('supabase/migrations/20261029_book_stripe_live_fulfillment_v1.sql');
for(const phrase of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','SERVICE_ONLY','gu_book_live_apply_v1',
 'gu_book_live_reserve_v1','gu_book_live_paid_owned_v1','gu_digital_paid_owned_v01430',
 'BOOK_RIGHTS_OR_EDITION_NOT_READY','paid_at IS NOT NULL','p_pi IS DISTINCT FROM r.stripe_payment_intent_id'])
 assert(db.includes(phrase),'Missing SQL safety requirement '+phrase);
const ui=source('assets/js/checkout-platform.js');
assert(ui.includes("provider:'STRIPE_BOOK_LIVE'"));
assert(ui.includes("format:current.format"));
assert(ui.includes("if(current.provider==='STRIPE_BOOK_LIVE')"));
assert(!ui.includes("Book purchases follow the separate publishing-rights and approved retailer checkout rules."));
const middleware=source('functions/_middleware.js');
assert(middleware.includes("'/api/book-stripe-live-checkout-v1'"));
const webhook=source('functions/api/stripe-live-webhook-v01458.js');
assert(webhook.includes('bookVerifiedEvent(c,event)'));
assert(!webhook.startsWith('import '),'Legacy GU58 tests require a self-contained webhook module');
assert.equal(BOOK_CODE,'FOUNDATION_BOOK_1');
assert.equal(BOOK_AMOUNT,1099);
assert.equal(BOOK_PRICE,'price_1UVBsDJL0O4GGVBHdqAaP15z');
const url='https://example.org/api/book-stripe-live-checkout-v1?code=FOUNDATION_BOOK_1&format=epub';
const disabled=await onRequestGet({request:new Request(url),env:{}});
const d=await disabled.json();
assert.equal(d.liveCheckoutAvailable,false);
assert.equal(d.livePayments,false);
const denied=await onRequestPost({request:new Request(url,{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),env:{}});
assert.equal(denied.status,403);
assert.equal(await applyVerifiedBookEvent({}, {type:'customer.created',data:{object:{}}}),null);
assert.equal(await applyVerifiedBookEvent({}, {type:'checkout.session.completed',
 data:{object:{metadata:{gu58_intent:'11111111-1111-4111-8111-111111111111'}}}}),null);
console.log('PASS Stripe LIVE book contract: off by default, one-time 1099 verified SKU, protected entitlement, signed-webhook integration and no automatic payments.');
