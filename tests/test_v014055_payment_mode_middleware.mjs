import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
// Load actual route policy then the Cloudflare middleware without a paid provider.
vm.runInThisContext(readFileSync(new URL('../assets/js/route-policy.js',import.meta.url),'utf8'));
const original=readFileSync(new URL('../functions/_middleware.js',import.meta.url),'utf8');
const transformed=original.replace("import '../assets/js/route-policy.js';",'');
assert.notEqual(transformed,original,'Expected original policy import must be replaced');
const middleware=await import('data:text/javascript;base64,'+Buffer.from(transformed).toString('base64'));
let testing=true,dbOnline=true,rowValid=true,dbReads=0,nextCalls=0;
const previous=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url);
 if(u.includes('/rest/v1/gu39_sandbox_settings?select=enabled&id=eq.true&limit=1')){
  dbReads++;
  if(!dbOnline)return new Response(JSON.stringify({message:'unavailable'}),{status:503});
  return new Response(JSON.stringify(rowValid?[{enabled:testing}]:[]),{status:200,headers:{'content-type':'application/json'}});
 }
 throw Error('Unapproved outbound call '+u);
};
const env={
 SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 GU_PAYMENT_LIVE_LAUNCH_APPROVED:'false'
};
const call=async(path,method='POST',environment=env)=>{
 const req=new Request('https://example.com'+path,{
  method,headers:{'content-type':'application/json'},
  ...(method==='POST'?{body:'{}'}:{})
 });
 return middleware.onRequest({request:req,env:environment,next:async()=>{
  nextCalls++;return new Response(JSON.stringify({ok:true,from:'downstream'}),{status:200,headers:{'content-type':'application/json'}})
 }});
};
const paths=['/api/checkout?action=create','/api/checkout-v0135?action=create',
 '/api/stripe-customer-checkout-v01438','/api/signed-book-checkout?action=create'];
try{
 // TESTING mode: block all four independently-configurable LIVE Checkout routes.
 for(const p of paths){
  let resp=await call(p);
  assert.equal(resp.status,423,p);
  assert.equal((await resp.json()).error,'PAYMENT_MODE_TESTING_LIVE_DISABLED');
 }
 let quote=await call('/api/checkout?action=quote','GET');
 assert.equal(quote.status,423);
 assert.equal((await quote.json()).error,'PAYMENT_MODE_TESTING_LIVE_DISABLED');
 const beforeAllowed=nextCalls;
 assert.equal(beforeAllowed,0,'Every live payment route must be stopped BEFORE downstream writes');
 // Legacy TEST route is permitted only when TESTING selected; its own test-only
 // account and provider gates remain mandatory downstream.
 let resp=await call('/api/stripe-managed-sandbox-v01432r2');
 assert.equal(resp.status,200);
 // Live mode selected with no launch approval: still no real payment.
 testing=false;
 for(const p of paths){
  resp=await call(p);assert.equal(resp.status,503);
  assert.equal((await resp.json()).error,'LIVE_CHECKOUT_NOT_APPROVED');
 }
 resp=await call('/api/stripe-managed-sandbox-v01432r2');
 assert.equal(resp.status,423);
 assert.equal((await resp.json()).error,'PAYMENT_MODE_LIVE_TESTING_DISABLED');
 // Only an *independently approved* live launch can restore old provider
 // routes, which also retain their own approval/configuration gates.
 for(const p of paths){
  resp=await call(p,'POST',{...env,GU_PAYMENT_LIVE_LAUNCH_APPROVED:'true'});
  assert.equal(resp.status,200,p);
 }
 // Switching back to TESTING overrides even that independent LIVE approval.
 testing=true;
 resp=await call(paths[0],'POST',{...env,GU_PAYMENT_LIVE_LAUNCH_APPROVED:'true'});
 assert.equal(resp.status,423);
 // Fail closed for DB outage/missing setting, whether TESTING or LIVE.
 dbOnline=false;
 resp=await call(paths[0]);assert.equal(resp.status,503);
 assert.equal((await resp.json()).error,'PAYMENT_MODE_UNAVAILABLE');
 dbOnline=true;rowValid=false;
 resp=await call(paths[0]);assert.equal(resp.status,503);
 rowValid=true;
 // Provider webhooks are NOT blocked by mode switch: Stripe may need to
 // deliver legitimate earlier events, even if new checkout is paused.
 const previousReads=dbReads;
 resp=await call('/api/stripe-customer-webhook-v01438');
 assert.equal(resp.status,200);
 assert.equal(dbReads,previousReads);
 // Owner Stripe GU39 toggle remains handled by OWNER-authenticated API.
 resp=await call('/api/gu39-sandbox');
 assert.equal(resp.status,200);
 assert.equal(dbReads,previousReads);
 console.log('PASS v55: exclusive server-side LIVE/TEST modes, no unauthorized live charges, legacy TEST isolation, DB outage fails closed, webhooks not blocked.');
}finally{globalThis.fetch=previous}
