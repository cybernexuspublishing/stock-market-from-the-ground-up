import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet as checkoutGet,onRequestPost as checkoutPost,TEST_OFFERS} from '../functions/api/lumen-bundle-test-checkout.js';
import {onRequestGet as webhookGet,onRequestPost as webhookPost} from '../functions/api/lumen-bundle-test-webhook.js';
import {onRequestPost as unified} from '../functions/api/stripe-test-webhook.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pack=JSON.parse(source('data/crownlight-sparks-store-v014167.json'));
assert.equal(pack.checkoutEnabled,false,'LIVE bundle storefront cannot be enabled during TEST QA');
assert.equal(pack.packages.length,5);
for(const x of pack.packages){
 const mapped=TEST_OFFERS[x.code];
 assert(mapped,'Missing TEST bundle '+x.code);
 assert.equal(mapped.qty,x.quantity);
 assert.equal(mapped.cents,x.priceCents);
 assert(/^prod_[A-Za-z0-9_]+$/.test(mapped.product));
 assert(/^price_[A-Za-z0-9_]+$/.test(mapped.price));
 assert.equal(x.checkoutEnabled,false,'LIVE package checkout opened');
}
for(const file of ['functions/api/lumen-bundle-test-checkout.js','functions/api/lumen-bundle-test-webhook.js']){
 const text=source(file);
 assert(!text.includes('sk_live_')&&!text.includes('whsec_live_'),'LIVE key use in QA route');
 assert(!text.includes('groundup_question_pass_buckets'),'TEST route must not mutate real wallet');
 assert(!text.includes('gu_lumen_mixed_intents_v1'),'TEST bundle cannot spend real Lumens');
}
const env={SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',
 SUPABASE_SECRET_KEY:'sb_secret_qa',
 GU39_STRIPE_TEST_SECRET_KEY:'sk_test_longqa00000000',
 STRIPE_TEST_WEBHOOK_SECRET:'whsec_longqa00000000',
 GU39_SANDBOX_SHADOW_GATE:'true'};
const get=await checkoutGet({env});
assert.equal(get.status,200);assert.equal((await get.json()).checkoutEnabled,false);
const req=new Request('https://example.com/api/lumen-bundle-test-checkout',{method:'POST',
 headers:{origin:'https://example.com','content-type':'application/json'},
 body:JSON.stringify({sku:'SPARKS_25',confirm:'STRIPE_TEST_ONLY',requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'})});
const off=await checkoutPost({request:req,env});assert.equal(off.status,423);
const getWebhook=await webhookGet();assert.equal(getWebhook.status,405);
const body=JSON.stringify({id:'evt_fake123456789',type:'checkout.session.completed',livemode:false,
 created:Math.floor(Date.now()/1000),data:{object:{id:'cs_test_fake123456789'}}});
for(const route of [webhookPost,unified]){
 const bad=await route({request:new Request('https://example.com/api/stripe-test-webhook',{method:'POST',
 headers:{'stripe-signature':'t=1793403000,v1='+'0'.repeat(64)},body}),env});
 assert.equal(bad.status,401,'Unsigned/fabricated TEST event must be rejected');
}
const router=source('functions/api/stripe-test-webhook.js');
assert(router.includes('isLumenBundleEvent')&&router.includes('lumenBundleWebhook'));
console.log('PASS five official TEST price mappings, disabled customer commerce, independent shadow-credit routes, unsigned rejection, and provider-based classification');
