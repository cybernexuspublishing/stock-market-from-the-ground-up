/* Synthetic full-release preflight. No LIVE access, secrets, transactions or account writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../functions/api/live-commerce-readiness.js',import.meta.url),'utf8');
const {onRequestGet,onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const plan=['FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY'];
const tools=['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'];
const standard=[...plan.map(x=>'plan:'+x),...tools.map(x=>'tool:'+x)];
const founders=['FOUNDING_30','FOUNDING_60'];
const all=[...standard,...founders];
const products=all.map((x,i)=>({id:'prod_rehearsal'+String(i).padStart(8,'0'),active:true,livemode:true}));
const spec=Object.fromEntries([
 ['plan:FULL_MONTHLY',6999,'month',1],['plan:FULL_ANNUAL',69900,'year',1],
 ['plan:LIFETIME',249900,null,null],['plan:ONDEMAND_MONTHLY',1999,'month',1],
 ...tools.map(k=>['tool:'+k,2999,'month',1]),
 ['FOUNDING_30',4999,'day',30],['FOUNDING_60',5999,'day',60]
].map(([sku,amount,interval,count])=>[sku,{amount,interval,count}]));
const prices=all.map((x,i)=>({id:'price_rehearsal'+String(i).padStart(8,'0'),product:products[i].id,
 active:true,livemode:true,currency:'usd',unit_amount:spec[x].amount,
 type:spec[x].interval?'recurring':'one_time',
 recurring:spec[x].interval?{interval:spec[x].interval,interval_count:spec[x].count}:null}));
const map=(list,offset=0)=>Object.fromEntries(list.map((k,i)=>[k,{product_id:products[i+offset].id,price_id:prices[i+offset].id}]));
const flags=['GU_PAYMENT_LIVE_LAUNCH_APPROVED','GU58_LIVE_CHECKOUT_ENABLED',
 'GU58_LIVE_WEBHOOK_ENABLED','GU58_LIVE_FULFILLMENT_APPROVED','GU58_LIVE_DB_CONTRACT_APPROVED',
 'GU_F600_LIVE_CHECKOUT_ENABLED','GU_F600_LIVE_WEBHOOK_ENABLED','GU_F600_LIVE_FULFILLMENT_APPROVED',
 'GU_LIVE_FINAL_OWNER_PAYMENT_TEST_ACCEPTED'];
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mockaccount123',
 PUBLIC_SITE_URL:'https://stock-market-from-the-ground-up-d1r.pages.dev',
 GU58_STRIPE_LIVE_CATALOG_JSON:JSON.stringify(map(standard)),
 GU_F600_LIVE_CATALOG_JSON:JSON.stringify(Object.fromEntries(Object.entries(map(founders,standard.length)).map(([k,v])=>[k,{productId:v.product_id,priceId:v.price_id}])))};
for(const f of flags)env[f]='false';
const requiredStore=[...standard,...founders.map(k=>'founding:'+k),'founding:FOUNDING_14'];
const store=Array.from({length:61},(_,i)=>({sku:requiredStore[i]||'test:'+i,category:
 i<5?'membership':i<7?'founding':i<29?'tool':i<44?'bootcamp':i<51?'book':i<54?'addon':'feature',
 sale_ready:false,visible:true,status:'coming_soon'}));
const standEvents=['checkout.session.completed','checkout.session.async_payment_succeeded',
 'invoice.paid','invoice.payment_failed','customer.subscription.updated',
 'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const founderEvents=['invoice.paid','invoice.payment_failed','customer.subscription.updated',
 'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
let role='OWNER',failRemote=false,providerCalls=0,mutations=0,dbCalls=0,founderOn=false,allEvents=false,skuAuthorizations=false;
const old=globalThis.fetch,J=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';
 if(u.includes('/rpc/gu_owner_digital_payment_route_read_v01432r2')){
  assert.equal(method,'POST');dbCalls++;return J({ok:true,role});}
 if(method!=='GET')mutations++;
 if(u.startsWith('https://api.stripe.com/'))providerCalls++;
 if(failRemote&&u.includes('/v1/prices?'))return J({error:'unavailable'},503);
 if(u.includes('/gu_storefront_items_v014174?'))return J(store);
 if(u.includes('/gu_digital_books_v01430?'))return J([]);
 if(u.includes('/gu_founder_release_v014173?'))return J([{enrollment_enabled:founderOn,billing_enabled:founderOn,fulfillment_enabled:founderOn}]);
 if(u.includes('/platform_plans?'))return J(plan.map(k=>({plan_code:k,price_cents:spec['plan:'+k].amount,
   billing_interval:k==='LIFETIME'?'lifetime':spec['plan:'+k].interval,active:true,checkout_enabled:skuAuthorizations})));
 if(u.includes('/platform_tools?'))return J(tools.map(k=>({tool_code:k,individual_price_cents:2999,
   active:true,status:'live',checkout_enabled:skuAuthorizations})));
 if(u.includes('/gu_founder_plans_v014173?'))return J(founders.map(k=>({plan_code:k,
   price_cents:spec[k].amount,term_days:spec[k].count,checkout_enabled:skuAuthorizations})));
 if(u.endsWith('/v1/account'))return J({id:'acct_mockaccount123'});
 if(u.includes('/v1/prices?'))return J({data:prices,has_more:false});
 if(u.includes('/v1/products?'))return J({data:products,has_more:false});
 if(u.includes('/v1/webhook_endpoints?'))return J({has_more:false,data:[
  {url:env.PUBLIC_SITE_URL+'/api/stripe-live-webhook',status:'enabled',livemode:true,
    enabled_events:allEvents?standEvents:['checkout.session.completed']},
  {url:env.PUBLIC_SITE_URL+'/api/founding600-webhook',status:founderOn?'enabled':'disabled',
    livemode:true,enabled_events:founderEvents}]});
 throw Error('Unmocked '+u);
};
const req=auth=>new Request(env.PUBLIC_SITE_URL+'/api/live-commerce-readiness',{headers:auth?{authorization:'Bearer fake.owner.session'}:{}});
try{
 assert.equal((await onRequestGet({request:req(false),env})).status,401);
 assert.equal(providerCalls,0);
 role='ADMIN';assert.equal((await onRequestGet({request:req(true),env})).status,403);
 assert.equal(providerCalls,0,'Only Owner can trigger private Stripe readiness checks');
 role='OWNER';
 const first=await onRequestGet({request:req(true),env});assert.equal(first.status,200);
 let x=await first.json();
 assert.equal(x.ok,true);assert.equal(x.go,false);assert.equal(x.storeCount,61);
 assert.equal(x.mappedSKUs,10);assert.equal(x.activePriceCount,10);assert.equal(x.activeProductCount,10);
 assert.equal(x.verifiedAmountAndCadence,true);
 for(const key of ['ALL_OWNER_LIVE_APPROVALS','STANDARD_WEBHOOK_LIFECYCLE',
  'FOUNDING_WEBHOOK_LIFECYCLE','AT_LEAST_ONE_VERIFIED_SALE_READY_OFFER'])
  assert(x.blockers.includes(key),key);
 assert.equal(mutations,0,'Preflight may not create provider or database billing writes');
 assert(!JSON.stringify(x).includes('sk_live_'),'No provider key in response');
 assert.equal(onRequestPost().status,405);
 failRemote=true;assert.equal((await onRequestGet({request:req(true),env})).status,503,'Provider outage is closed');
 failRemote=false;for(const flag of flags)env[flag]='true';store[0].sale_ready=true;
 store[0].sku=standard[0];skuAuthorizations=true;
 allEvents=true;founderOn=true;
 const release=await onRequestGet({request:req(true),env});assert.equal(release.status,200);
 x=await release.json();assert.equal(x.go,true,'All synthetic gates demonstrate a green report only, never real payment acceptance');
 // A 14-Day offer marked sale-ready without its distinct LIVE map must fail closed.
 store[10].sale_ready=true;
 let unbound14=await (await onRequestGet({request:req(true),env})).json();
 assert(unbound14.blockers.includes('SALE_READY_OWNER_SKU_AUTHORIZATION'),'An approved but unmapped Founding 14 SKU cannot silently go on sale');
 store[10].sale_ready=false;
 products[0].active=false;const inactive=await onRequestGet({request:req(true),env});
 assert.equal((await inactive.json()).blockers.includes('MAPPED_PRICE_PROVIDER_PARITY'),true);
 products[0].active=true;
 prices[0].unit_amount+=100;
 let drift=await (await onRequestGet({request:req(true),env})).json();
 assert(drift.blockers.includes('MAPPED_PRICE_AMOUNT_AND_CADENCE'),'Incorrect $ amount must fail release');
 prices[0].unit_amount-=100;
 prices[9].recurring.interval_count=31;
 drift=await (await onRequestGet({request:req(true),env})).json();
 assert(drift.blockers.includes('MAPPED_PRICE_AMOUNT_AND_CADENCE'),'Founding interval not 30 days must fail release');
 prices[9].recurring.interval_count=60;
 skuAuthorizations=false;
 drift=await (await onRequestGet({request:req(true),env})).json();
 assert(drift.blockers.includes('SALE_READY_OWNER_SKU_AUTHORIZATION'),'Store sale-ready cannot bypass individual checkout disabled');
 skuAuthorizations=true;store[0].sku='addon:UNRELEASED';
 drift=await (await onRequestGet({request:req(true),env})).json();
 assert(drift.blockers.includes('SALE_READY_OWNER_SKU_AUTHORIZATION'),'Unimplemented Sparks purchases cannot pass as a mapped live SKU');
 store[0].sku=standard[0];store[0].sale_ready=false;
 assert.equal(mutations,0,'All negative tests remain provider read-only');
 console.log('PASS v2: Owner-only no-charge preflight, mapped exact cents and recurrence, Founding 30/60 days, per-SKU Owner authorization, outage and drift fail-closed');
}finally{globalThis.fetch=old}
