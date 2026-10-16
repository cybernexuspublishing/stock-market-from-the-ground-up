import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/stripe-product-readiness-v01437.js';
const original=globalThis.fetch;
const req=(auth='Bearer staff')=>new Request('https://stock-market-from-the-ground-up.pages.dev/api/stripe-product-readiness-v01437',{headers:{authorization:auth}});
const env={SUPABASE_URL:'https://app.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public_key',STRIPE_MANAGED_SECRET_KEY:'sk_test_fake',STRIPE_MANAGED_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_testMonthly1234'})};
const listed=[];
try {
 globalThis.fetch=async(u,o={})=>{const url=String(u);listed.push([url,o.method||'GET']);
  if(url.includes('/rest/v1/rpc/gu_owner_digital_payment_route_read_v01432r2'))return Response.json({ok:true,role:'OWNER',provider:'STRIPE_MANAGED',enabled:false});
  if(url.includes('/v1/products/'))return Response.json({id:url.split('/').at(-1),livemode:false,active:true,tax_code:'txcd_10000000',name:'Stripe Test Product'});
  if(url.includes('/v1/prices/'))return Response.json({id:'price_testMonthly1234',livemode:false,active:true,currency:'usd',unit_amount:6999,product:'prod_VRvuGwLKI16MXU',type:'recurring',recurring:{interval:'month'}});
  throw Error('unexpected request '+url);
 };
 const unauth=await onRequestGet({request:req(''),env});assert.equal(unauth.status,403);assert.equal(listed.length,0);
 const res=await onRequestGet({request:req(),env});assert.equal(res.status,200);
 const j=await res.json();assert.equal(j.ok,true);assert.equal(j.ownerReportedProductCount,8);assert.equal(j.verifiedProductCount,8);assert.equal(j.verifiedPriceCount,1);assert.equal(j.priceMappedCount,1);assert.equal(j.customerCheckoutEnabledByThisRelease,false);
 assert(j.taxClassificationReviewRequired);assert(listed.every(([u,m])=>m!=='PATCH'&&m!=='DELETE'&&(!u.includes('/api.stripe.com/v1')||m==='GET')));
 listed.length=0; const off={...env,STRIPE_MANAGED_SECRET_KEY:''};const offRes=await (await onRequestGet({request:req(),env:off})).json();
 assert.equal(offRes.verifiedProductCount,0);assert.equal(offRes.verifiedPriceCount,0);
 assert.equal(listed.length,1);assert.equal((await onRequestPost()).status,405);
 console.log('PASS: Stripe readiness authorized, read-only, distinct product vs price, fail-closed no API key, eight owner-observed products.');
}finally{globalThis.fetch=original}
