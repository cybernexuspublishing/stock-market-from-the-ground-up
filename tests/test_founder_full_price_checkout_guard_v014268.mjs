import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFounderDiscountCheckoutSafe} from '../functions/api/stripe-live-checkout-v01458.js';

const userId='11111111-1111-4111-8111-111111110268';
const cfg={base:'https://example.supabase.co',secret:'sb_secret_only_for_local_tests'};
async function verify(policy,work){
 const saved=globalThis.fetch;let requests=0;
 globalThis.fetch=async(input,opts={})=>{
  requests++;
  const url=new URL(String(input));
  assert.equal(url.pathname,'/rest/v1/rpc/gu_founder_discount_eligibility_v014221');
  assert.equal(opts.method,'POST');
  assert.equal(JSON.parse(opts.body).p_user,userId);
  assert.equal(opts.headers.apikey,cfg.secret);
  assert.equal(opts.headers.authorization,undefined,'Modern service secrets must not be used as legacy bearer tokens');
  return new Response(JSON.stringify(policy),{status:200,headers:{'content-type':'application/json'}});
 };
 try{await work(()=>requests)}finally{globalThis.fetch=saved}
}
const eligible=[['plan','FULL_MONTHLY'],['plan','FULL_ANNUAL'],['plan','LIFETIME'],
 ['tool','INTERACTIVE_LEARNING'],['tool','JOURNAL_ANALYTICS'],['tool','MARKET_TUTOR']];
test('Founder Standard earned 10% cannot silently pay list price on six eligible products',async()=>{
 await verify({ok:true,eligible:true,discountBps:1000,founderSubscriptionExcluded:true},async count=>{
  for(const [kind,code] of eligible){
   await assert.rejects(assertFounderDiscountCheckoutSafe(cfg,userId,kind,code),
     e=>e.status===409&&e.message.includes('No payment has been initiated'));
  }
  assert.equal(count(),6);
 });
});
test('Founder Extended earned 15% cannot silently pay list price',async()=>{
 await verify({ok:true,eligible:true,discountBps:1500,founderSubscriptionExcluded:true},async count=>{
  for(const [kind,code] of eligible){
   await assert.rejects(assertFounderDiscountCheckoutSafe(cfg,userId,kind,code),
     e=>e.status===409);
  }
  assert.equal(count(),6);
 });
});
test('Non-founder account keeps its ordinary base-price checkout route',async()=>{
 await verify({ok:true,eligible:false,discountBps:0},async count=>{
  for(const [kind,code] of eligible)
   await assertFounderDiscountCheckoutSafe(cfg,userId,kind,code);
  assert.equal(count(),6);
 });
});
test('Malformed/mismatched discount policy fails closed with no checkout approval',async()=>{
 for(const policy of [null,[],{}, {ok:false,error:'AUTH_REQUIRED'},
  {ok:true,eligible:true,discountBps:0},
  {ok:true,eligible:false,discountBps:1000},
  {ok:true,eligible:true,discountBps:2000},
  {ok:true,eligible:true,discountBps:2000,founderSubscriptionExcluded:false}]){
  await verify(policy,async()=>{
   await assert.rejects(assertFounderDiscountCheckoutSafe(cfg,userId,'plan','LIFETIME'),
    e=>e.status===503);
  });
 }
});
test('Founder subscription renewals are never folded into first-party purchase discount',async()=>{
 await verify(null,async count=>{
  await assertFounderDiscountCheckoutSafe(cfg,userId,'plan','FOUNDING_30');
  await assertFounderDiscountCheckoutSafe(cfg,userId,'plan','FOUNDING_60');
  await assertFounderDiscountCheckoutSafe(cfg,userId,'plan','ONDEMAND_MONTHLY');
  await assertFounderDiscountCheckoutSafe(cfg,userId,'tool','MARKET_SIMULATOR');
  assert.equal(count(),0);
 });
});
