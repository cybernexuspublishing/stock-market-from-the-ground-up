import assert from 'node:assert/strict';
import {founderCatalogReadiness} from '../functions/_lib/founder-catalog-readiness-v014264.js';
const plans={
 FOUNDING_30:{test:'price_1UUCNbJY9FI7byHBCX2VWdLi',live:'price_1UUEgWJL0O4GGVBHWVsQfwvg',amount:4999,days:30,testProduct:'prod_VVCnll7D6GUMYR',liveProduct:'prod_VVF9poZ15hcsIm'},
 FOUNDING_60:{test:'price_1UUCNkJY9FI7byHBuh6pT4xd',live:'price_1UUEgYJL0O4GGVBHE7pmnWKz',amount:5999,days:60,testProduct:'prod_VVCna7iF60IFyK',liveProduct:'prod_VVF9SaeXxAv1QL'}
};
const env={GU39_STRIPE_TEST_SECRET_KEY:'sk_test_QAFixture123',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_QAFixture123',
 GU_F600_LIVE_CATALOG_JSON:JSON.stringify(Object.fromEntries(Object.entries(plans).map(([code,v])=>[code,{priceId:v.live,productId:v.liveProduct}])))};
let liveProductsActive=false,liveWebhookEnabled=false,wrongCadence=false,providerDown=false,dualTestDelivery=false;
const original=globalThis.fetch;let reads=0,writes=0;
const answer=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
try{
 globalThis.fetch=async(url,opt={})=>{
  const u=new URL(String(url)),key=opt.headers?.authorization;
  assert.equal(u.origin,'https://api.stripe.com');
  if(opt.method!=='GET'){writes++;throw Error('Stripe payment write is forbidden');}
  reads++;
  const live=key==='Bearer sk_live_QAFixture123';
  assert(key==='Bearer sk_live_QAFixture123'||key==='Bearer sk_test_QAFixture123');
  if(providerDown)return answer({error:'QA unavailable'},503);
  const code=Object.keys(plans).find(n=>u.pathname.endsWith('/'+(live?plans[n].live:plans[n].test))||
    u.pathname.endsWith('/'+(live?plans[n].liveProduct:plans[n].testProduct)));
  if(u.pathname.endsWith('/webhook_endpoints')){
   const required=['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
   const base={livemode:live,url:'https://stock-market-from-the-ground-up.pages.dev/api/'+(live?'founding600-webhook':'gu39-stripe-webhook'),
    enabled_events:required,status:live?(liveWebhookEnabled?'enabled':'disabled'):'enabled'};
   return answer({data:[base,...(!live&&dualTestDelivery?[{
    ...base,url:'https://stock-market-from-the-ground-up-d1r.pages.dev/api/gu39-stripe-webhook'
   }]:[])]});
  }
  assert(code,'Unknown catalog lookup '+u.pathname);
  const info=plans[code],productId=live?info.liveProduct:info.testProduct;
  if(u.pathname.includes('/prices/'))return answer({id:live?info.live:info.test,livemode:live,active:true,
    currency:'usd',unit_amount:info.amount,
    recurring:{interval:'day',interval_count:wrongCadence&&code==='FOUNDING_60'?30:info.days},product:productId});
  return answer({id:productId,livemode:live,active:live?liveProductsActive:true,metadata:{site_sku:code}});
 };
 let d=await founderCatalogReadiness(env);
 assert.equal(d.sandbox.state,'verified','One enabled TEST destination with matching products must pass');
 assert.equal(d.live.state,'pending','Inactive LIVE products and disabled webhook are pending, not ready');
 dualTestDelivery=true;
 d=await founderCatalogReadiness(env);
 assert.equal(d.sandbox.state,'action_required','Duplicated enabled original/master TEST routes must fail closed');
 assert.match(d.sandbox.detail,/not exclusive/);
 dualTestDelivery=false;
 d=await founderCatalogReadiness(env);
 assert.equal(d.sandbox.state,'verified','Readiness resumes after duplicate TEST destination is disabled');
 liveProductsActive=true;liveWebhookEnabled=true;
 d=await founderCatalogReadiness(env);
 assert.equal(d.live.state,'review','Even active LIVE catalog does not certify payment fulfillment');
 wrongCadence=true;d=await founderCatalogReadiness(env);
 assert.equal(d.sandbox.state,'action_required','Inconsistent renewal cadence must fail');
 assert.equal(d.live.state,'action_required','Inconsistent LIVE recurring term must fail');
 wrongCadence=false;providerDown=true;d=await founderCatalogReadiness(env);
 assert.equal(d.sandbox.state,'review','Stripe TEST API failure must not be falsely accepted');
 assert.equal(d.live.state,'review','Stripe LIVE API failure must not be falsely accepted');
 assert.equal(writes,0);
 assert(reads>15);
 console.log('PASS Founding 600 TEST exclusive webhook routing, both plan terms, mocked LIVE hold, outage and read-only enforcement');
}finally{globalThis.fetch=original;}
