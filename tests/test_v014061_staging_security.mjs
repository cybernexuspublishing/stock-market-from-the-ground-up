/* v0.14.0.61 - fail-closed deployment isolation acceptance only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const load=async path=>import('data:text/javascript;base64,'+readFileSync(new URL('../'+path,import.meta.url)).toString('base64'));
const checkout=await load('functions/api/stripe-staging-member-checkout-v01461.js');
const webhook=await load('functions/api/stripe-staging-member-webhook-v01461.js');
const production='oxihglyfgzywsupnyicb',staging='aaaaaaaaaaaaaaaaaaaa';
const host='pr-61.stockmarket.pages.dev';
const env={GU61_STAGING_ENABLED:'true',GU61_STAGING_APPROVED:'true',GU61_STAGING_CHECKOUT_ENABLED:'true',
 GU61_STAGING_FULFILLMENT_APPROVED:'true',GU61_STAGING_DB_CONTRACT_APPROVED:'true',
 GU61_STAGING_WEBHOOK_ENABLED:'true',GU61_STAGING_PROJECT_REF:staging,GU61_STAGING_HOSTNAME:host,
 SUPABASE_URL:'https://'+staging+'.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 GU61_STRIPE_TEST_SECRET_KEY:'sk_test_mock',GU61_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',GU61_STRIPE_TEST_ACCOUNT_ID:'acct_test00000001'};
const prior=globalThis.fetch;let fetches=0;globalThis.fetch=async()=>{fetches++;throw Error('Provider should not be contacted on failed closed routes');};
const getReq=url=>new Request(url,{method:'GET'});
const postReq=url=>new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
const badCases=[
 {...env,GU61_STAGING_ENABLED:'false'},
 {...env,GU61_STAGING_APPROVED:'false'},
 {...env,GU61_STAGING_PROJECT_REF:production,SUPABASE_URL:'https://'+production+'.supabase.co'},
 {...env,SUPABASE_URL:'https://'+production+'.supabase.co'},
 {...env,GU61_STAGING_HOSTNAME:'site.example'},
 {...env,GU61_STRIPE_TEST_SECRET_KEY:'sk_live_mock'},
 {...env,GU61_STAGING_DB_CONTRACT_APPROVED:'false'},
];
try{
 for(const e of badCases){
  const g=await checkout.onRequestGet({env:e,request:getReq('https://'+host+'/api/stripe-staging-member-checkout-v01461')});
  assert.equal((await g.json()).stagingConfigured,false,'unsafe env must fail closed');
  const p=await checkout.onRequestPost({env:e,request:postReq('https://'+host+'/api/stripe-staging-member-checkout-v01461')});
  assert.notEqual(p.status,200,'unsafe env must not create sessions');
  const w=await webhook.onRequestPost({env:e,request:postReq('https://'+host+'/api/stripe-staging-member-webhook-v01461')});
  assert.equal(w.status,503,'unsafe env must deny webhooks');
 }
 const wrongHost=await checkout.onRequestPost({env,request:postReq('https://stockmarket.pages.dev/api/stripe-staging-member-checkout-v01461')});
 assert.notEqual(wrongHost.status,200,'production hostname must be rejected');
 const badWebhook=await webhook.onRequestPost({env,request:postReq('https://'+host+'/api/stripe-staging-member-webhook-v01461')});
 assert.equal(badWebhook.status,401,'unsigned webhooks must fail');
 assert.equal(fetches,0,'rejected traffic must not access Stripe or Supabase');
 const middleware=readFileSync(new URL('../functions/_middleware.js',import.meta.url),'utf8');
 assert.match(middleware,/LEGACY_TEST_CHECKOUT_ROUTES=new Set\\(\\[([^;]*stripe-staging-member-checkout-v01461)/);
 console.log('PASS: 61 STAGING isolation fail closed, LIVE key refused, preview host pinned, unsigned webhook refused, Owner TEST route enforced');
}finally{globalThis.fetch=prior}
