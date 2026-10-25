/* Owner-only Pre-LIVE status endpoint — no paid operations and no synthetic account access. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/admin-prelive-v014247.js';
import {readFileSync} from 'node:fs';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub_mock',
 SUPABASE_SECRET_KEY:'srv_mock',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock'};
const guest=await onRequest({request:new Request('https://example.test/api/admin-prelive-v014247'),env});
assert.equal(guest.status,401);
const post=await onRequest({request:new Request('https://example.test/api/admin-prelive-v014247',{method:'POST'}),env});
assert.equal(post.status,405);
const oldFetch=globalThis.fetch;
const user='7e3c301b-8fb9-4293-bb71-8dfafbc25bab';
let mockRoles=[{role_code:'OWNER',expires_at:null}];
try{
 globalThis.fetch=async(url,options)=>{
  const path=String(url);
  const wrap=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}});
  if(path.includes('/auth/v1/user'))return wrap({id:user});
  if(path.includes('admin_user_roles?'))return wrap(mockRoles);
  if(path.includes('profiles?select=account_kind'))return wrap([{account_kind:'member'}]);
  if(path.includes('gu_ad_sales_settings'))return wrap([{accepting_payments:false,ad_delivery_enabled:false}]);
  if(path.includes('gu_ad_sandbox_settings'))return wrap([{testing_enabled:false}]);
  if(path.includes('gu39_sandbox_settings'))return wrap([{enabled:false}]);
  if(path.includes('gu_ad_sandbox_prices'))return wrap([
   {package_code:'SITE_SPONSOR',test_price_id:'price_alpha123',test_amount_cents:100},
   {package_code:'SECTION_SPONSOR',test_price_id:'price_beta123',test_amount_cents:100},
   {package_code:'RESOURCE_SPONSOR',test_price_id:'price_gamma123',test_amount_cents:100}
  ]);
  if(path.includes('select=id&limit=1'))return wrap([{id:1}],200,{'content-range':'0-0/3'});
  throw Error('Unrecognized data request '+path);
 };
 const req=new Request('https://example.test/api/admin-prelive-v014247',{headers:{authorization:'Bearer fake-valid-test'}});
 const allowed=await onRequest({request:req,env});
 assert.equal(allowed.status,200);
 const body=await allowed.json();
 assert.equal(body.ok,true);assert.equal(body.ownerVerified,true);assert.equal(body.synthetic,false);
 assert.equal(body.livePaymentActionsAvailable,false);
 assert(body.checks.some(x=>x.code==='advertising'&&x.state==='verified'));
 assert(body.checks.some(x=>x.code==='sandbox_catalog'&&x.state==='verified'));
 assert(body.checks.some(x=>x.code==='live_authorization'&&x.state==='pending'));
 assert.equal(body.counts.members,3);
 assert(!JSON.stringify(body).includes(env.SUPABASE_SECRET_KEY),'Never send backend secret to frontend');
 mockRoles=[{role_code:'SHOWCASE_VIEWER',expires_at:null},{role_code:'OWNER',expires_at:null}];
 const showcase=await onRequest({request:req,env});
 assert.equal(showcase.status,403,'Showcase must not use Owner diagnostics');
 mockRoles=[{role_code:'OWNER',expires_at:'2025-01-01T00:00:00Z'}];
 const expired=await onRequest({request:req,env});
 assert.equal(expired.status,403,'Expired Owner role must not authorize');
 const ui=readFileSync('assets/js/admin-prelive-v014247.js','utf8');
 assert(ui.includes("!context.roles?.includes('OWNER')"),'Owner-only UI visibility');
 assert(!/method:'POST'|method:"POST"/.test(ui),'Release QA UI never posts payment or privileged mutations');
 console.log('PASS Owner-only read-only Pre-LIVE diagnostics, paid actions excluded, showcase denied');
}finally{globalThis.fetch=oldFetch}
