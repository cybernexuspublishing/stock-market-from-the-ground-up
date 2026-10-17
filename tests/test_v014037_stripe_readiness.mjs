import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/stripe-product-readiness-v01437.js';
const original=globalThis.fetch,seen=[];
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test',
 GU39_STRIPE_TEST_SECRET_KEY:'sk_test_example',GU39_SANDBOX_SHADOW_GATE:'false',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_testMonthly1234'})};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status});
try{
 globalThis.fetch=async(url,o={})=>{const u=String(url);seen.push([u,o.method||'GET']);
  if(u.endsWith('/auth/v1/user'))return json({id:'8da97526-b906-4927-a002-6195f69112ee'});
  if(u.endsWith('/rpc/gu_staff_identity_v01431r1'))return json('OWNER');
  if(u.endsWith('/v1/account'))return json({id:'acct_1URGkDJY9FI7byHB'});
  if(u.includes('/v1/products/'))return json({id:u.split('/').at(-1),active:true,livemode:false,tax_code:'txcd_10000000',name:'Test Product'});
  if(u.includes('/v1/prices/'))return json({id:'price_testMonthly1234',active:true,livemode:false,
   product:'prod_VRvuGwLKI16MXU',currency:'usd',unit_amount:6999,type:'recurring',recurring:{interval:'month'}});
  throw Error('Unexpected URL '+u);
 };
 const request=ok=>new Request('https://example.com/api/stripe-product-readiness-v01437',{headers:ok?{authorization:'Bearer mock-jwt'}:{}});
 let res=await onRequestGet({request:request(false),env});
 assert.equal(res.status,403);assert.equal(seen.some(([u])=>u.includes('api.stripe.com')),false);
 seen.length=0;res=await onRequestGet({request:request(true),env});assert.equal(res.status,200);
 const data=await res.json();assert.equal(data.ok,true);assert.equal(data.verifiedProductCount,8);
 assert.equal(data.verifiedPriceCount,1);assert.equal(data.priceMappedCount,1);
 assert.equal(data.customerCheckoutEnabledByThisRelease,false);
 assert(seen.filter(([u])=>u.includes('api.stripe.com')).every(([,method])=>method==='GET'));
 assert(!seen.some(([u])=>/site_orders|site_subscriptions|user_plan_grants|user_tool_passes/.test(u)));
 assert.equal((await onRequestPost()).status,405);
 console.log('PASS v41: legacy Stripe readiness delegates to only GU39 authority, rejects anonymous callers, no write access.');
}finally{globalThis.fetch=original}
