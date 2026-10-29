import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequest} from '../functions/api/member-lumen-checkout-quote.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',
 SUPABASE_SECRET_KEY:'sb_secret_test'};
let balance=80,allowed=true,isOwner=false,priceCents=1999,queries=[];
const original=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url);queries.push({path:u.pathname,method:opts.method||'GET'});
 const res=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
 if(u.pathname==='/auth/v1/user')return res({id:user});
 if(u.pathname==='/rest/v1/profiles')return res([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return res(allowed?[]:[{status:'suspended'}]);
 if(u.pathname==='/rest/v1/admin_user_roles')return res(isOwner?[{role_code:'OWNER',expires_at:null}]:[]);
 if(u.pathname==='/rest/v1/gu_storefront_items_v014174')return res([{
  sku:'addon:TRADE_PLAN_BUILDER',display_name:'Advanced Trade-Plan Builder',
  status:'for_sale',visible:true,sale_ready:true
 }]);
 if(u.pathname==='/rest/v1/gu_owner_stripe_registry_v1')return res([{sku:'addon:TRADE_PLAN_BUILDER',
  amount_cents:priceCents,currency:'usd',billing_interval:'one_time'}]);
 if(u.pathname==='/rest/v1/rpc/groundup_question_pass_summary')return res({available:balance});
 if(u.pathname==='/rest/v1/gu_lumen_value_settings_v1')return res([{active_cents:7,mixed_checkout_enabled:false}]);
 throw Error('Unexpected endpoint '+u.pathname);
};
const req=(lumens)=>new Request('https://site.example/api/member-lumen-checkout-quote?'+
 'sku=addon%3ATRADE_PLAN_BUILDER&lumens='+lumens,{headers:{authorization:'Bearer valid'}});
try{
 let r=await onRequestGet({env,request:req(80)}),d=await r.json();
 assert.equal(r.status,200);assert.equal(d.priceCents,1999);
 assert.equal(d.lumensApplied,80);assert.equal(d.discountCents,560);
 assert.equal(d.cashDueCents,1439);assert.equal(d.remainingLumens,0);
 assert.equal(d.checkoutDiscountActive,false);
 r=await onRequestGet({env,request:req(40)});d=await r.json();
 assert.equal(d.lumensApplied,40);assert.equal(d.discountCents,280);
 assert.equal(d.cashDueCents,1719);assert.equal(d.remainingLumens,40);
 r=await onRequestGet({env,request:req(0)});d=await r.json();
 assert.equal(d.discountCents,0);assert.equal(d.cashDueCents,1999);
 balance=286;r=await onRequestGet({env,request:req(286)});d=await r.json();
 assert.equal(d.lumensApplied,286);assert.equal(d.discountCents,1999);
 assert.equal(d.cashDueCents,0);assert.equal(d.fullyCovered,true);
 assert.equal(d.cashPaymentSupported,true);
 r=await onRequestGet({env,request:req(285)});d=await r.json();
 assert.equal(d.cashDueCents,4);assert.equal(d.cashPaymentSupported,false);
 isOwner=true;r=await onRequestGet({env,request:req(40)});d=await r.json();
 assert.equal(d.alreadyIncluded,true);assert.equal(d.lumensApplied,0);
 isOwner=false;allowed=false;
 r=await onRequestGet({env,request:req(40)});assert.equal(r.status,403);
 r=await onRequest({env,request:new Request('https://site.example/api/member-lumen-checkout-quote',
 {method:'POST'})});assert.equal(r.status,405);
 assert(!queries.some(q=>q.path.includes('/stripe')||q.path.includes('gu_lumen_mixed_')),
  'Quote must never mutate wallet, reserve, or initiate payment');
 assert.match(read('assets/js/checkout-platform.js'),/getSelection\?\.\(\)>0/);
 assert.match(read('checkout.html'),/checkout-lumen-selector-v1.js/);
 const sql=read('supabase/migrations/20261029_lumen_mixed_checkout_reservations_v1.sql');
 assert.match(sql,/pg_advisory_xact_lock\(hashtextextended\(p_user::text,489301\)\)/);
 assert.match(sql,/INSUFFICIENT_LUMENS/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gu_lumen_mixed_reserve_v1/);
 assert.match(sql,/NEEDS_PAYMENT_RECONCILIATION/);
 assert.match(sql,/status='cash_verified'/);
 console.log('PASS all-member-priced Lumen quotes 80/40/286, Owner inclusion, suspended member, no accidental full-price cash charge or wallet spend');
}finally{globalThis.fetch=original}
