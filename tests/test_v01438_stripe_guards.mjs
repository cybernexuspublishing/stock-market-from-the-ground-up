import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {strict as assert} from 'node:assert';
const root=new URL('../',import.meta.url);
const mod=async path=>import('data:text/javascript;base64,'+readFileSync(new URL(path,root)).toString('base64'));
const checkout=await mod('functions/api/stripe-customer-checkout-v01438.js');
const webhook=await mod('functions/api/stripe-customer-webhook-v01438.js');
assert.deepEqual(await (await checkout.onRequestGet({env:{}})).json(),{ok:true,sandboxReady:false,livePayments:false});
let r=await checkout.onRequestPost({request:new Request('https://example.test/api/stripe-customer-checkout-v01438',{method:'POST',body:'{"type":"plan","code":"FULL_MONTHLY"}',headers:{origin:'https://example.test'}}),env:{}});
assert.equal(r.status,503);
r=await webhook.onRequestPost({request:new Request('https://example.test/api/stripe-customer-webhook-v01438',{method:'POST',body:'{}'}),env:{}});assert.equal(r.status,503);
const env={GU_STRIPE_V38_STAGING:'true',GU_STRIPE_V38_FULFILLMENT:'true',GU_STRIPE_V38_STAGING_PROJECT_REF:'oxihglyfgzywsupnyicb',SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub',SUPABASE_SECRET_KEY:'test',STRIPE_MANAGED_SECRET_KEY:'sk_test_fake',STRIPE_MANAGED_WEBHOOK_SECRET:'whsec_fake'};
assert.equal((await checkout.onRequestGet({env})).status,200);
assert.equal((await (await checkout.onRequestGet({env})).json()).sandboxReady,false,'production Supabase must never be accepted as staging');
r=await webhook.onRequestPost({request:new Request('https://example.test/api/stripe-customer-webhook-v01438',{method:'POST',body:'{}'}),env});assert.equal(r.status,503);
// Dedicated staging ref + signed event still required; unauthenticated request cannot initiate.
env.GU_STRIPE_V38_STAGING_PROJECT_REF='bbbbbbbbbbbbbbbbbbbb';env.SUPABASE_URL='https://bbbbbbbbbbbbbbbbbbbb.supabase.co';
r=await webhook.onRequestPost({request:new Request('https://example.test/api/stripe-customer-webhook-v01438',{method:'POST',body:'{}'}),env});assert.equal(r.status,401);
console.log('PASS v01438: staging-only Stripe, no live keys, signature required, production ref rejected');
