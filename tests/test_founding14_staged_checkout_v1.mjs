/* Founder 14 LIVE readiness contract — no Stripe writes, no fake subscriptions. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost,foundingProductReadyForCheckout} from '../functions/api/founding600-checkout.js';
const reservation=readFileSync(new URL('../supabase/migrations/20261028_founder14_atomic_reservation_support.sql',import.meta.url),'utf8');
const ledger=readFileSync(new URL('../supabase/migrations/20261028_founder_14_cycle_sparks_and_lifecycle_gate.sql',import.meta.url),'utf8');
assert.match(reservation,/FOUNDING_14/,'Atomic reservation must recognize Starter');
for(const [plan,cents,sparks] of [['FOUNDING_14',2299,10],['FOUNDING_30',4999,15],['FOUNDING_60',5999,20]])
 assert(ledger.includes(`plan_code='${plan}' AND price_cents=${cents} AND granted_sparks=${sparks}`),'Paid-cycle ledger must match approved membership terms');
const origin='https://qa-f600.example';
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_mockowner123',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_mock',
 GU_F600_LIVE_CHECKOUT_ENABLED:'true',GU_F600_LIVE_FULFILLMENT_APPROVED:'true',
 GU_F600_LIVE_CATALOG_JSON:JSON.stringify({
  FOUNDING_14:{priceId:'price_mock14',productId:'prod_mock14'},
  FOUNDING_30:{priceId:'price_mock30',productId:'prod_mock30'},
  FOUNDING_60:{priceId:'price_mock60',productId:'prod_mock60'}
 })};
let starterOpen=false,founderPublished=false,providerCalls=0,dbWrites=0;
const original=globalThis.fetch;const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url));
 if(u.hostname==='api.stripe.com'){providerCalls++;throw Error('NO_REAL_STRIPE_CALL_PERMITTED')}
 assert.equal(u.hostname,'aaaaaaaaaaaaaaaaaaaa.supabase.co');
 if((options.method||'GET')!=='GET')dbWrites++;
 const p=u.pathname;
 if(p==='/rest/v1/gu_founder_release_v014173')return response([{public_launch_open:false,enrollment_enabled:true,billing_enabled:true,fulfillment_enabled:true}]);
 if(p==='/rest/v1/gu_founder_members_v014173'||p==='/rest/v1/gu_founder_reservations_v014173')return response([]);
 if(p==='/rest/v1/platform_plans')return response(['FOUNDING_14','FOUNDING_30','FOUNDING_60'].map(plan_code=>({plan_code,active:true,public_visible:founderPublished,checkout_enabled:founderPublished})));
 if(p==='/rest/v1/gu_storefront_items_v014174')return response(['FOUNDING_14','FOUNDING_30','FOUNDING_60'].map(code=>({sku:'founding:'+code,visible:founderPublished,sale_ready:founderPublished,status:founderPublished?'for_sale':'coming_soon'})));
 if(p==='/rest/v1/gu_founder_plans_v014173'){
  if(u.searchParams.has('plan_code'))return response([{plan_code:'FOUNDING_14',checkout_enabled:starterOpen,price_cents:2299,term_days:14}]);
  return response([
   {plan_code:'FOUNDING_14',checkout_enabled:starterOpen},
   {plan_code:'FOUNDING_30',checkout_enabled:true},
   {plan_code:'FOUNDING_60',checkout_enabled:true}
  ]);
 }
 if(p==='/auth/v1/user')return response({id:'11111111-1111-4111-8111-111111111111'});
 if(p==='/rest/v1/profiles')return response([{account_kind:'member',deleted_at:null}]);
 if(p==='/rest/v1/account_private_identity')return response([{age_eligible:true,date_of_birth:'1990-01-01'}]);
 if(p==='/rest/v1/admin_user_flags'||p==='/rest/v1/admin_user_roles')return response([]);
 throw Error('UNEXPECTED '+u.pathname);
};
const req=()=>new Request(origin+'/api/founding600-checkout',{method:'POST',headers:{
 origin,authorization:'Bearer qa_no_real_token','content-type':'application/json'
},body:JSON.stringify({plan:'FOUNDING_14',autoRenewConsent:true,founderTermsConsent:true})});
try{
 let r=await onRequestGet({env}),d=await r.json();
 assert.equal(r.status,200);assert.equal(d.checkoutEnabled,false,'Hidden founder listings must block checkout, even when payment gates are ready');
 assert.deepEqual(d.plans.map(x=>x.checkoutEnabled),[false,false,false]);
 r=await onRequestPost({request:req(),env});assert.equal(r.status,409,'Unreleased 14-Day checkout must be refused before contacting Stripe');
 assert.equal(providerCalls,0);assert.equal(dbWrites,0);
 starterOpen=true;
 r=await onRequestGet({env});d=await r.json();
 assert.equal(d.plans[0].checkoutEnabled,false,'Starter remains closed while hidden from the Store');
 founderPublished=true;
 r=await onRequestGet({env});d=await r.json();
 assert.equal(d.checkoutEnabled,true);
 assert.deepEqual(d.plans.map(x=>x.checkoutEnabled),[true,true,true],'Admin publishing plus all existing payment readiness gates is required');
 // Each tier can be published separately. An unavailable plan must stay hidden.
 founderPublished=false;
 r=await onRequestGet({env});d=await r.json();
 assert.deepEqual(d.plans.map(x=>x.checkoutEnabled),[false,false,false]);
 founderPublished=true;starterOpen=false;
 r=await onRequestGet({env});d=await r.json();
 assert.deepEqual(d.plans.map(x=>x.checkoutEnabled),[false,true,true],'14-day plan remains unavailable even if other terms are ready');
 assert.equal(d.checkoutEnabled,true,'Another eligible term can remain available without Starter');
 starterOpen=true;
 const bad={id:'prod_mock14',active:true,livemode:true,metadata:{site_sku:'FOUNDING_14',site_checkout_enabled:'false',fulfillment_verified:'false',payment_launch_approved:'false'}};
 assert.equal(foundingProductReadyForCheckout(bad,'FOUNDING_14','prod_mock14'),false);
 assert.equal(foundingProductReadyForCheckout({...bad,metadata:{site_sku:'FOUNDING_14',site_checkout_enabled:'true',fulfillment_verified:'true',payment_launch_approved:'true'}},'FOUNDING_14','prod_mock14'),true);
 console.log('PASS F600 Starter: 14-day staged gate false, authorized terms recognized, payment preflight still locked and zero Stripe writes');
}finally{globalThis.fetch=original}
