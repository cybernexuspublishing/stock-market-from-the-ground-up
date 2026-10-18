/* v0.14.0.67: owner-only LIVE merchant and prices no-charge acceptance contract. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/api/stripe-live-merchant-readiness-v01467.js',import.meta.url),'utf8');
const audit=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://stock-market-from-the-ground-up.pages.dev',api=origin+'/api/stripe-live-merchant-readiness-v01467';
const user='11111111-1111-4111-8111-111111111111';
const sku=[
 ['plan','FULL_MONTHLY',6999,'month'],['plan','FULL_ANNUAL',69900,'year'],
 ['plan','LIFETIME',249900,'lifetime'],['plan','ONDEMAND_MONTHLY',1999,'month'],
 ['tool','INTERACTIVE_LEARNING',2999,'month'],['tool','JOURNAL_ANALYTICS',2999,'month'],
 ['tool','MARKET_SIMULATOR',2999,'month'],['tool','MARKET_TUTOR',2999,'month']
];
const mapped=Object.fromEntries(sku.map(([type,code],i)=>[type+':'+code,{
 product_id:'prod_liveFake0'+(i+1),price_id:'price_liveFake0'+(i+1)}]));
const eventTypes=[
 'checkout.session.completed','checkout.session.async_payment_succeeded',
 'invoice.paid','invoice.payment_failed','customer.subscription.updated',
 'customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_testmock',GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_expectedmock',
 GU58_STRIPE_LIVE_CATALOG_JSON:JSON.stringify(mapped),
 GU58_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_mock',PUBLIC_SITE_URL:origin,
 GU_PAYMENT_LIVE_LAUNCH_APPROVED:'false',GU58_LIVE_CHECKOUT_ENABLED:'false',
 GU58_LIVE_WEBHOOK_ENABLED:'false',GU58_LIVE_DB_CONTRACT_APPROVED:'false'};
const state={role:'OWNER',step:true,mode:true,accountId:'acct_expectedmock',
 payout:true,charges:true,required:0,wrongPrice:false,wrongProduct:false,
 wrongCadence:false,missingWebhook:false,wildcard:false,more:false,
 missingPrice:false,providerReads:0,providerWrites:0,dbWrites:0,dbReads:0};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET';
 if(u.startsWith('https://api.stripe.com/')&&method!=='GET'){state.providerWrites++;throw Error('Stripe mutation forbidden');}
 if(u.includes('/rest/v1/')&&method==='POST'&&!u.includes('/rpc/gu_staff_')){state.dbWrites++;throw Error('DB write forbidden');}
 if(u.endsWith('/auth/v1/user'))return json({id:user});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return json({ok:true,role:state.role});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return json(state.step);
 if(u.includes('/gu39_sandbox_settings?'))return json([{enabled:state.mode}]);
 if(u.includes('/platform_plans?')){
  state.dbReads++;const code=decodeURIComponent(u.match(/plan_code=eq\.([^&]+)/)?.[1]||'');
  const row=sku.find(x=>x[0]==='plan'&&x[1]===code);
  return json(row?[{active:true,public_visible:true,checkout_enabled:false,
   billing_interval:row[3],price_cents:row[2]}]:[]);
 }
 if(u.includes('/platform_tools?')){
  state.dbReads++;const code=decodeURIComponent(u.match(/tool_code=eq\.([^&]+)/)?.[1]||'');
  const row=sku.find(x=>x[0]==='tool'&&x[1]===code);
  return json(row?[{active:true,public_visible:true,status:'live',
   individual_price_cents:row[2]}]:[]);
 }
 if(u.startsWith('https://api.stripe.com/')){
  state.providerReads++;
  if(u.endsWith('/v1/account'))return json({id:state.accountId,
   charges_enabled:state.charges,payouts_enabled:state.payout,details_submitted:true,
   requirements:{currently_due:Array.from({length:state.required},(_,i)=>'field_'+i),
    past_due:[]},capabilities:{card_payments:'active'}});
  if(u.includes('/v1/products/')){
   const id=u.split('/').at(-1);return json({id:state.wrongProduct?'prod_WRONG':id,active:true,livemode:true});}
  if(u.includes('/v1/prices/')){
   const id=u.split('/').at(-1);const row=sku.find(([kind,code])=>mapped[kind+':'+code].price_id===id);
   if(!row||state.missingPrice)return json({error:{type:'invalid_request_error'}},404);
   const [kind,code,amount,interval]=row;
   return json({id,product:mapped[kind+':'+code].product_id,active:true,livemode:true,
    currency:'usd',unit_amount:state.wrongPrice?amount+1:amount,
    billing_scheme:'per_unit',transform_quantity:null,
    type:interval==='lifetime'?'one_time':'recurring',
    recurring:interval==='lifetime'?null:{interval,interval_count:state.wrongCadence?12:1,usage_type:'licensed'}});
  }
  if(u.includes('/v1/webhook_endpoints?'))return json({has_more:state.more,
   data:state.missingWebhook?[]:[{url:origin+'/api/stripe-live-webhook',
    livemode:true,status:'enabled',enabled_events:state.wildcard?['*']:eventTypes}]});
 }
 throw Error('Unexpected '+method+' '+u);
};
const get=(environment=env)=>audit.onRequestGet({env:environment,request:new Request(api,{headers:{authorization:'Bearer test-owner'}})});
async function review(environment=env){const r=await get(environment);assert.equal(r.status,200,await r.clone().text());return r.json()}
const find=(x,name)=>x.rows.find(r=>r.check===name)?.status;
try{
 const rejected=await audit.onRequestGet({env,request:new Request(api)});
 assert.equal(rejected.status,401);
 assert.equal(state.providerReads,0,'Anonymous cannot access live Stripe');
 state.role='ADMIN';let r=await get();assert.equal(r.status,403);assert.equal(state.providerReads,0);
 state.role='OWNER';state.step=false;r=await get();
 assert.equal(r.status,403);assert.equal((await r.json()).error,'PASSWORD_RECONFIRM_REQUIRED');
 assert.equal(state.providerReads,0);
 state.step=true;
 let result=await review();
 assert.equal(result.noCharge,true);assert.equal(result.readOnly,true);
 assert.equal(result.liveCheckoutApproved,false);assert.equal(result.readyForLiveCheckout,false);
 assert.equal(result.mode,'TESTING_ACTIVE','Owner TEST mode stays ON and never blocks read-only report');
 assert.equal(result.verifiedLivePrices,8);assert.equal(result.verifiedLiveProducts,8);
 assert.equal(find(result,'LIVE production webhook destination'),'PASS');
 assert.equal(find(result,'LIVE charges enabled'),'PASS');
 assert.equal(result.webhookConfigurationChecked,true);
 assert.equal(state.dbWrites,0);assert.equal(state.providerWrites,0);
 assert(!JSON.stringify(result).includes(env.GU58_STRIPE_LIVE_SECRET_KEY));
 assert(!JSON.stringify(result).includes(user));
 state.wrongPrice=true;result=await review();assert.equal(result.verifiedLivePrices,0);
 state.wrongPrice=false;state.wrongCadence=true;result=await review();assert.equal(result.verifiedLivePrices,1);
 state.wrongCadence=false;state.wrongProduct=true;result=await review();assert.equal(result.verifiedLivePrices,0);
 state.wrongProduct=false;state.accountId='acct_wrongmock';
 result=await review();assert.equal(result.verifiedLivePrices,0);
 assert.equal(find(result,'Stripe LIVE account identity'),'BLOCKED');
 state.accountId='acct_expectedmock';
 state.charges=false;result=await review();assert.equal(find(result,'LIVE charges enabled'),'ACTION_REQUIRED');
 assert.equal(result.readyForLiveCheckout,false);state.charges=true;
 state.required=1;result=await review();assert.equal(find(result,'Required onboarding information'),'ACTION_REQUIRED');
 state.required=0;
 state.missingWebhook=true;result=await review();assert.equal(find(result,'LIVE production webhook destination'),'REVIEW');
 state.missingWebhook=false;state.wildcard=true;result=await review();
 assert.equal(find(result,'Eight exact lifecycle event subscriptions'),'REVIEW');
 state.wildcard=false;state.more=true;result=await review();
 assert.equal(find(result,'LIVE production webhook destination'),'REVIEW');
 state.more=false;
 result=await review({...env,GU58_STRIPE_LIVE_SECRET_KEY:'sk_test_notallowed'});
 assert.equal(result.verifiedLivePrices,0);
 assert.equal(find(result,'LIVE Stripe API credential'),'ACTION_REQUIRED');
 r=audit.onRequestPost();assert.equal(r.status,405);
 assert.equal(state.dbWrites,0);assert.equal(state.providerWrites,0);
 console.log('PASS v67: Owner step-up, LIVE account & 8 mapped prices, merchant requirements, webhook events, negative cases, locked billing, zero Stripe/DB writes.');
}finally{globalThis.fetch=oldFetch}
