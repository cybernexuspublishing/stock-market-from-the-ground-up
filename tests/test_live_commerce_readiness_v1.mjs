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
const prices=all.map((x,i)=>({id:'price_rehearsal'+String(i).padStart(8,'0'),product:products[i].id,
 active:true,livemode:true,currency:'usd',unit_amount:4999+i}));
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
const store=Array.from({length:60},(_,i)=>({sku:'test:'+i,category:
 i<5?'membership':i<7?'founding':i<29?'tool':i<44?'bootcamp':i<51?'book':i<54?'addon':'feature',
 sale_ready:false,visible:true,status:'coming_soon'}));
const standEvents=['checkout.session.completed','checkout.session.async_payment_succeeded',
 'invoice.paid','invoice.payment_failed','customer.subscription.updated',
 'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const founderEvents=['invoice.paid','invoice.payment_failed','customer.subscription.updated',
 'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
let role='OWNER',failRemote=false,providerCalls=0,mutations=0,dbCalls=0,founderOn=false,allEvents=false;
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
 assert.equal(x.ok,true);assert.equal(x.go,false);assert.equal(x.storeCount,60);
 assert.equal(x.mappedSKUs,10);assert.equal(x.activePriceCount,10);assert.equal(x.activeProductCount,10);
 for(const key of ['ALL_OWNER_LIVE_APPROVALS','STANDARD_WEBHOOK_LIFECYCLE',
  'FOUNDING_WEBHOOK_LIFECYCLE','AT_LEAST_ONE_VERIFIED_SALE_READY_OFFER'])
  assert(x.blockers.includes(key),key);
 assert.equal(mutations,0,'Preflight may not create provider or database billing writes');
 assert(!JSON.stringify(x).includes('sk_live_'),'No provider key in response');
 assert.equal(onRequestPost().status,405);
 failRemote=true;assert.equal((await onRequestGet({request:req(true),env})).status,503,'Provider outage is closed');
 failRemote=false;for(const flag of flags)env[flag]='true';store[0].sale_ready=true;
 allEvents=true;founderOn=true;
 const release=await onRequestGet({request:req(true),env});assert.equal(release.status,200);
 x=await release.json();assert.equal(x.go,true,'All synthetic gates demonstrate a green report only, never real payment acceptance');
 products[0].active=false;const inactive=await onRequestGet({request:req(true),env});
 assert.equal((await inactive.json()).blockers.includes('MAPPED_PRICE_PROVIDER_PARITY'),true);
 console.log('PASS v1: Owner-only, 60-category preflight; separate NO-GO reasons; complete webhook event checks; active Stripe Prices and Products; final Owner gate; no transaction writes');
}finally{globalThis.fetch=old}
