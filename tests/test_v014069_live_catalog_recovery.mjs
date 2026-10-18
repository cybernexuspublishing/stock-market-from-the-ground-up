/* v0.14.0.69 — Owner-only existing LIVE Stripe catalog recovery. NO CHARGES. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../functions/api/stripe-live-merchant-readiness-v01467.js',import.meta.url),'utf8');
const endpoint=await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
const site='https://stock-market-from-the-ground-up.pages.dev';
const SKUS=[
 ['plan','FULL_MONTHLY','Full Platform Membership — Monthly',6999,'month'],
 ['plan','FULL_ANNUAL','Full Platform Membership — Annual',69900,'year'],
 ['plan','LIFETIME','Lifetime Platform Access',249900,'lifetime'],
 ['plan','ONDEMAND_MONTHLY','Historical Replay Learning',1999,'month'],
 ['tool','INTERACTIVE_LEARNING','Interactive Learning & Historical Labs',2999,'month'],
 ['tool','JOURNAL_ANALYTICS','Trading Journal & Performance Analytics',2999,'month'],
 ['tool','MARKET_SIMULATOR','Advanced Market Simulator & Replay',2999,'month'],
 ['tool','MARKET_TUTOR','Market Tutor',2999,'month']
];
const bad=Object.fromEntries(SKUS.map(([kind,code],i)=>[kind+':'+code,{
 product_id:'prod_staleMock'+(i+1),price_id:'price_staleMock'+(i+1)}]));
const live=Object.fromEntries(SKUS.map(([kind,code],i)=>[kind+':'+code,{
 product_id:'prod_correctLive'+(i+1),price_id:'price_correctLive'+(i+1)}]));
const prices=SKUS.map(([kind,code,name,amount,interval])=>{
 const ids=live[kind+':'+code];
 return {id:ids.price_id,livemode:true,active:true,product:{
  id:ids.product_id,name,active:true,livemode:true},
  currency:'usd',unit_amount:amount,billing_scheme:'per_unit',transform_quantity:null,
  type:interval==='lifetime'?'one_time':'recurring',
  recurring:interval==='lifetime'?null:{interval,interval_count:1,usage_type:'licensed'}};
});
const events=['checkout.session.completed','checkout.session.async_payment_succeeded',
 'invoice.paid','invoice.payment_failed','customer.subscription.updated',
 'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mocksecrettoken',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_liveMock12345',
 GU58_STRIPE_LIVE_CATALOG_JSON:JSON.stringify(bad),
 GU58_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_mock',PUBLIC_SITE_URL:site};
const state={owner:true,ambiguous:false,denied:false,mode:true,apiCalls:0,writes:0,dbWrites:0,priceObjectMismatch:false};
const j=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opt={})=>{
 const u=String(url),m=opt.method||'GET';
 if(u.includes('api.stripe.com')){state.apiCalls++;if(m!=='GET'){state.writes++;throw Error('NO_STRIPE_WRITE_ALLOWED')}}
 if(u.includes('/rest/v1/')&&m!=='GET'&&!u.includes('/rpc/gu_staff_')){state.dbWrites++;throw Error('NO_DB_WRITE_ALLOWED')}
 if(u.endsWith('/auth/v1/user'))return j({id:'11111111-1111-4111-8111-111111111111'});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return j({ok:true,role:state.owner?'OWNER':'MEMBER'});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return j(true);
 if(u.includes('/gu39_sandbox_settings?'))return j([{enabled:state.mode}]);
 for(const [kind,code,name,amount,interval] of SKUS){
  if(kind==='plan'&&u.includes('platform_plans?')&&u.includes('plan_code=eq.'+code))
   return j([{active:true,public_visible:true,billing_interval:interval,price_cents:amount,checkout_enabled:false}]);
  if(kind==='tool'&&u.includes('platform_tools?')&&u.includes('tool_code=eq.'+code))
   return j([{active:true,public_visible:true,status:'live',individual_price_cents:amount}]);
 }
 if(u.endsWith('/v1/account'))return j({id:'acct_liveMock12345',charges_enabled:true,
  payouts_enabled:true,details_submitted:true,requirements:{currently_due:[],past_due:[]},
  capabilities:{card_payments:'active'}});
 if(u.includes('/v1/prices?')){
  if(state.denied)return j({error:{code:'permission_error'}},403);
  return j({data:state.ambiguous?[...prices,{...prices[4],id:'price_anotherValid123'}]:prices,has_more:false});
 }
 if(u.includes('/v1/prices/')){
  if(state.priceObjectMismatch){return j({id:u.split('/').at(-1),product:'prod_correctLive1',livemode:true,active:true,
   currency:'usd',unit_amount:6999,billing_scheme:'per_unit',transform_quantity:null,
   type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}})}
  return j({error:{code:'resource_missing'}},404);
 }
 if(u.includes('/v1/webhook_endpoints?'))return j({data:[{url:site+'/api/stripe-live-webhook',
  livemode:true,status:'enabled',enabled_events:events}],has_more:false});
 if(u.includes('/v1/products/'))throw Error('Should discover from Price list first');
 throw Error('Unexpected '+m+' '+u);
};
const run=async(e=env)=>{
 const r=await endpoint.onRequestGet({env:e,request:new Request(site+'/api/stripe-live-merchant-readiness-v01467',
  {headers:{authorization:'Bearer mocktoken'}})});
 assert.equal(r.status,200,await r.clone().text());return r.json();
};
try{
 const res=await endpoint.onRequestGet({env,request:new Request(site+'/api/stripe-live-merchant-readiness-v01467')});
 assert.equal(res.status,401);assert.equal(state.apiCalls,0);
 state.owner=false;
 let denied=await endpoint.onRequestGet({env,request:new Request(site+'/api/stripe-live-merchant-readiness-v01467',
  {headers:{authorization:'Bearer mocktoken'}})});
 assert.equal(denied.status,403);assert.equal(state.apiCalls,0);
 state.owner=true;
 let report=await run();
 assert.equal(report.verifiedLivePrices,0,'Old TEST Price IDs stay not verified');
 assert.equal(report.discoveryStatus,'COMPLETE_CANDIDATES');
 assert.equal(report.liveCheckoutApproved,false);
 assert.equal(report.readyForLiveCheckout,false);
 assert.equal(report.mode,'TESTING_ACTIVE');
 assert.equal(report.rows.filter(r=>r.status==='NOT_FOUND_IN_LIVE_ACCOUNT').length,8);
 assert.equal(report.rows.filter(r=>r.status==='EXACT_LIVE_CANDIDATE').length,8);
 assert.deepEqual(JSON.parse(report.suggestedLiveCatalogJson),live);
 assert(!JSON.stringify(report).includes(env.GU58_STRIPE_LIVE_SECRET_KEY));
 assert.equal(state.dbWrites,0);assert.equal(state.writes,0);
 state.ambiguous=true;report=await run();
 assert.equal(report.suggestedLiveCatalogJson,null,'Ambiguous LIVE Price ID must not become copy-ready');
 assert.equal(report.discoveryStatus,'PARTIAL_CANDIDATES');
 assert(report.rows.some(r=>r.group==='RECOVERY'&&r.status==='AMBIGUOUS_MULTIPLE_PRICES'));
 state.ambiguous=false;state.denied=true;report=await run();
 assert.equal(report.discoveryStatus,'READ_PERMISSION_DENIED');
 assert.equal(report.suggestedLiveCatalogJson,null);
 state.denied=false;state.priceObjectMismatch=true;report=await run();
 assert(report.rows.some(r=>r.group==='SKU'&&r.status==='PRODUCT_ID_MISMATCH'));
 state.priceObjectMismatch=false;
 assert.equal(state.dbWrites,0);assert.equal(state.writes,0);
 console.log('PASS v69: report explains absent LIVE Price IDs, safely proposes only unique same-name LIVE prices, denies ambiguous mappings and missing Stripe permissions, preserves Owner and no-charge gates.');
}finally{globalThis.fetch=originalFetch}
