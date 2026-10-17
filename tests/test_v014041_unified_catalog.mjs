import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet as canonical} from '../functions/api/gu39-sandbox.js';
import {onRequestGet as legacy} from '../functions/api/stripe-product-readiness-v01437.js';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test',
 GU39_STRIPE_TEST_SECRET_KEY:'sk_test_fake',GU39_SANDBOX_SHADOW_GATE:'false',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_testMonthly1234'})};
const req=(path='/api/gu39-sandbox?view=catalog')=>new Request('https://example.com'+path,{headers:{authorization:'Bearer owner-test'}});
const original=globalThis.fetch;let calls=[],acct='acct_1URGkDJY9FI7byHB',mismatch=false;
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s});
try{
 globalThis.fetch=async(url,o={})=>{const u=String(url);calls.push([u,o.method||'GET']);
  if(u.endsWith('/auth/v1/user'))return json({id:'8da97526-b906-4927-a002-6195f69112ee'});
  if(u.endsWith('/rpc/gu_staff_identity_v01431r1'))return json('OWNER');
  if(u.endsWith('/v1/account'))return json({id:acct});
  if(u.includes('/v1/products/'))return json({id:u.split('/').at(-1),active:true,livemode:false,name:'Test Product'});
  if(u.includes('/v1/prices/'))return json({id:'price_testMonthly1234',active:true,livemode:false,
   product:'prod_VRvuGwLKI16MXU',currency:'usd',unit_amount:mismatch?10:6999,type:'recurring',recurring:{interval:'month'}});
  throw Error('Unexpected call '+u);
 };
 let res=await canonical({request:req(),env}),data=await res.json();
 assert.equal(res.status,200);assert.equal(data.productsVerified,8);assert.equal(data.pricesVerified,1);
 assert.equal(data.priceIdsConfigured,1);assert.equal(data.allVerified,false);
 assert.equal(data.rows.filter(x=>x.status==='PRICE_MAP_MISSING').length,7);
 res=await legacy({request:req('/api/stripe-product-readiness-v01437'),env});data=await res.json();
 assert.equal(res.status,200);assert.equal(data.verifiedProductCount,8);assert.equal(data.verifiedPriceCount,1);
 mismatch=true;res=await canonical({request:req(),env});data=await res.json();
 assert.equal(data.pricesVerified,0);assert.equal(data.rows.find(r=>r.sku==='plan:FULL_MONTHLY').status,'PRICE_MISMATCH');
 mismatch=false;acct='acct_BAD';res=await canonical({request:req(),env});assert.equal(res.status,503);
 assert.equal((await res.json()).error,'SANDBOX_ACCOUNT_MISMATCH');
 res=await canonical({request:req(),env:{...env,GU39_STRIPE_TEST_SECRET_KEY:''}});
 assert.equal(res.status,503);assert.equal((await res.json()).error,'SANDBOX_TEST_KEY_MISSING');
 assert(calls.filter(([u])=>u.includes('api.stripe.com')).every(([,m])=>m==='GET'));
 assert(!calls.some(([u])=>/site_orders|site_subscriptions|user_plan_grants|user_tool_passes/.test(u)));
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert(!read('assets/js/site.js').includes("loadOnce('/assets/js/admin-stripe-catalog-v01437.js'"));
 assert(read('assets/js/admin-stripe-shadow-v01439.js').includes('Verify All 8 Sandbox Products'));
 assert(read('assets/js/admin-stripe-shadow-v01439.js').includes('!catalogReady'));
 const manifest=JSON.parse(read('release-manifest.json'));
 assert.match(manifest.version,/^0\.14\.0\.\d+$/);assert.equal(manifest.customerCheckoutApproved,false);
 console.log('PASS v41: one verified Stripe account, separate product/price counters, authoritative legacy delegation, mismatch fail-closed, no live checkout.');
}finally{globalThis.fetch=original}
