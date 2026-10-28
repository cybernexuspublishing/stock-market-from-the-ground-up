// v0.14.0.64 — real LIVE checkout eligibility handler, simulated provider/DB;
// never creates Checkout Sessions or tests with production credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async path=>import('data:text/javascript;base64,'+
 readFileSync(new URL('../'+path,import.meta.url)).toString('base64'));
const api=await load('functions/api/stripe-live-checkout-v01458.js');
const src=readFileSync(new URL('../assets/js/checkout-platform.js',import.meta.url),'utf8');
const middleware=readFileSync(new URL('../functions/_middleware.js',import.meta.url),'utf8');
assert(!src.includes("target:'/api/stripe-customer-checkout-v01438'"),'customer checkout must not require a new staging database');
assert(src.includes("target:'/api/stripe-live-checkout'"),'customer checkout uses guarded LIVE membership connector');
assert(src.includes('readiness.liveCheckoutAvailable===true')&&
 src.includes('readiness.readOnly===true')&&src.includes('readiness.livePayments===false')&&
 src.includes('priceText(readiness.offer)'),
 'button must require authoritative verified price/cadence, not just boolean availability');
assert(src.includes("if(books){"),'book rights remain separate from membership checkout');
assert(src.includes("STRIPE_MANAGED_LIVE"),'LIVE checkout must not be presented as TEST checkout');
assert(middleware.includes("'/api/stripe-live-checkout'"),'Owner-mode middleware must block a LIVE POST in TESTING mode');
const mapped={};
const sku=['plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY',
 'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR'];
for(let i=0;i<sku.length;i++)mapped[sku[i]]={price_id:'price_mock0000'+String(i).padStart(2,'0'),product_id:'prod_mock0000'+String(i).padStart(2,'0')};
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 GU_PAYMENT_LIVE_LAUNCH_APPROVED:'true',GU58_LIVE_CHECKOUT_ENABLED:'true',
 GU58_LIVE_WEBHOOK_ENABLED:'true',GU58_LIVE_FULFILLMENT_APPROVED:'true',
 GU58_LIVE_DB_CONTRACT_APPROVED:'true',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mock0000000',GU58_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_mock',
 GU58_STRIPE_LIVE_CATALOG_JSON:JSON.stringify(mapped)};
const state={testing:false,db:true,offer:true,visible:true,listed:true,saleReady:true,route:true,site:true,price:true,intervalCount:1,usageType:'licensed',billingScheme:'per_unit',transformQuantity:null,merchant:true,tool:true,posts:0,remote:0};
const original=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url);state.remote++;
 if(!state.db)throw Error('Database offline');
 if(u.includes('/gu39_sandbox_settings?'))return json([{enabled:state.testing}]);
 if(u.includes('/gu_storefront_items_v014174?'))return json([{visible:state.listed,sale_ready:state.saleReady,status:'for_sale'}]);
 if(u.includes('/platform_plans?'))return json([{active:true,public_visible:state.visible,
  checkout_enabled:state.offer,name:'Full Platform Monthly',billing_interval:'month',price_cents:6999}]);
 if(u.includes('/platform_tools?'))return json([{active:true,public_visible:state.visible,
  checkout_enabled:state.offer,status:state.tool?'live':'preview',name:'Interactive Learning',individual_price_cents:2999}]);
 if(u.includes('/rpc/gu_digital_payment_route_get_v01432r2'))return json({provider:'STRIPE_MANAGED',enabled:state.route});
 if(u.includes('/site_settings?'))return json([{value:state.site}]);
 if(u.endsWith('/v1/account'))return json({id:state.merchant?'acct_mock0000000':'acct_other0000'});
 if(u.endsWith('/v1/prices/'+mapped['plan:FULL_MONTHLY'].price_id))
  return json({id:mapped['plan:FULL_MONTHLY'].price_id,product:state.price?mapped['plan:FULL_MONTHLY'].product_id:'prod_other',
    livemode:true,active:true,currency:'usd',unit_amount:6999,billing_scheme:state.billingScheme,transform_quantity:state.transformQuantity,type:'recurring',recurring:{interval:'month',interval_count:state.intervalCount,usage_type:state.usageType}});
 if(u.endsWith('/v1/prices/'+mapped['tool:INTERACTIVE_LEARNING'].price_id))
  return json({id:mapped['tool:INTERACTIVE_LEARNING'].price_id,
    product:mapped['tool:INTERACTIVE_LEARNING'].product_id,
    livemode:true,active:true,currency:'usd',unit_amount:2999,billing_scheme:state.billingScheme,transform_quantity:state.transformQuantity,type:'recurring',recurring:{interval:'month',interval_count:state.intervalCount,usage_type:state.usageType}});
 if(u.endsWith('/v1/checkout/sessions')){state.posts++;throw Error('GET MUST NEVER CREATE A CHECKOUT SESSION')}
 throw Error('Unexpected outbound '+u);
};
const url='https://example.com/api/stripe-live-checkout';
async function get(options={},query='?type=plan&code=FULL_MONTHLY'){
 const r=await api.onRequestGet({env:{...env,...options},request:new Request(url+query)});
 assert.equal(r.status,200);return r.json();
}
try{
 let r=await get();assert.equal(r.liveCheckoutAvailable,true,'fully approved SKU should appear');
 assert.deepEqual(r.offer,{type:'plan',code:'FULL_MONTHLY',name:'Full Platform Monthly',
  unitAmountCents:6999,currency:'USD',billingInterval:'month',intervalCount:1},
  'The no-charge public quote must match the independent verified LIVE Price.');
 assert.equal(r.readOnly,true);
 assert.equal(r.livePayments,false);
 assert.equal(r.url,undefined,'Readiness never reveals a Checkout Session or payment URL.');
 const bad=[
  [{GU58_LIVE_WEBHOOK_ENABLED:'false'},'webhook switch OFF'],
  [{GU_PAYMENT_LIVE_LAUNCH_APPROVED:'false'},'Owner LIVE approval OFF'],
  [{GU58_LIVE_CHECKOUT_ENABLED:'false'},'checkout OFF'],
  [{GU58_STRIPE_LIVE_SECRET_KEY:'sk_test_invalid'},'reject TEST key'],
  [{GU58_STRIPE_LIVE_CATALOG_JSON:'{}'},'reject incomplete eight-product map']
 ];
 for(const [e,label] of bad){r=await get(e);assert.equal(r.liveCheckoutAvailable,false,label)}
 state.testing=true;r=await get();assert.equal(r.liveCheckoutAvailable,false,'Owner TESTING blocks LIVE');state.testing=false;
 state.offer=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'plan checkout lock');state.offer=true;
 state.visible=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'hidden plan must never be sold');state.visible=true;
 state.listed=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'hidden Store listing must block direct checkout');state.listed=true;
 state.saleReady=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'unreleased Store listing must block checkout');state.saleReady=true;
 state.route=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'digital provider route');state.route=true;
 state.site=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'Owner global checkout lock');state.site=true;
 state.merchant=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'wrong Stripe merchant');state.merchant=true;
 state.price=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'unapproved Stripe Price');state.price=true;
 for(const [field,bad,label] of [
  ['intervalCount',12,'price renews every twelve months, not one month'],
  ['usageType','metered','usage-based metered price'],
  ['billingScheme','tiered','tiered price instead of fixed-price offer'],
  ['transformQuantity',{divide_by:3,round:'up'},'transformed line-item quantity']
 ]){
  const previous=state[field];state[field]=bad;
  r=await get();assert.equal(r.liveCheckoutAvailable,false,label);
  state[field]=previous;
 }
 state.db=false;r=await get();assert.equal(r.liveCheckoutAvailable,false,'DB outage');state.db=true;
 r=await get({},'?type=book&code=FOUNDATION_BOOK_1');assert.equal(r.liveCheckoutAvailable,false,'KDP books not member checkout');
 r=await get({},'?type=plan&code=BOGUS');assert.equal(r.liveCheckoutAvailable,false,'unknown SKU');
 r=await get({},'?type=tool&code=INTERACTIVE_LEARNING');assert.equal(r.liveCheckoutAvailable,true,'tool with canonical live status');
 state.offer=false;r=await get({},'?type=tool&code=INTERACTIVE_LEARNING');assert.equal(r.liveCheckoutAvailable,false,'hidden or visible tool requires explicit checkout_enabled');state.offer=true;
 state.visible=false;r=await get({},'?type=tool&code=INTERACTIVE_LEARNING');assert.equal(r.liveCheckoutAvailable,false,'hidden tool cannot sell');state.visible=true;
 r=await get({},'?type=tool&code=INTERACTIVE_LEARNING');assert.equal(r.liveCheckoutAvailable,true,'published and eligible tool can sell');
 assert.equal(r.offer.name,'Interactive Learning');assert.equal(r.offer.unitAmountCents,2999);
 assert.equal(r.offer.billingInterval,'month');
 state.tool=false;r=await get({},'?type=tool&code=INTERACTIVE_LEARNING');assert.equal(r.liveCheckoutAvailable,false,'tool in preview');
 assert.equal(state.posts,0,'Availability probe must not create sessions, subscriptions or charges');
 console.log('PASS v64: current database only, all LIVE frontend/handler gates fail closed, product/merchant tested, zero checkout writes.');
}finally{globalThis.fetch=original}
