import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestPost} from '../functions/api/stripe-billing-portal-v014122.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('functions/api/stripe-billing-portal-v014122.js');
const client=read('assets/js/my-purchases.js');
assert(api.includes("rec.metadata?.source!=='gu58_live_signed_stripe'"));
assert(api.includes("user_id=eq.")&&api.includes("billing_portal/sessions"));
assert(!api.includes("env.GU58_LIVE_CHECKOUT_ENABLED")&&!api.includes("env.GU_PAYMENT_LIVE_LAUNCH_APPROVED"),
 'Do not prevent paying customers from canceling when new checkouts are disabled');
assert(client.includes("Manage Billing / Cancel"));
assert(!client.includes("cfg.billingPortalUrl"));
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_private',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_MockedDoNotCharge',GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_TESTMERCHANT',
 GU58_LIVE_CHECKOUT_ENABLED:'false'};
const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,
 headers:{'content-type':'application/json'}});
let member=true,record=true,ownerGood=true,sourceGood=true,liveGood=true,
 merchantGood=true,domainGood=true,stripeRequests=0,portalCreates=0,clientCustomer=false;
const old=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const s=String(url);
 if(s.endsWith('/auth/v1/user'))return respond({id:uid});
 if(s.includes('/profiles?'))return respond([{account_kind:member?'member':'showcase'}]);
 if(s.includes('/site_subscriptions?')){
  assert(s.includes('user_id=eq.'+uid)&&s.includes('id=eq.4'),'DB query must be member-owned');
  return respond(record?[{id:4,provider:'STRIPE_MANAGED',metadata:{source:sourceGood?'gu58_live_signed_stripe':'staging'},
   provider_subscription_id:ownerGood?'sub_VERIFIEDLIVE':'sub_NOTOWNED'}]:[]);
 }
 if(s==='https://api.stripe.com/v1/account'){
  stripeRequests++;
  return respond({id:merchantGood?'acct_TESTMERCHANT':'acct_OTHERACCOUNT'});
 }
 if(s.includes('/v1/subscriptions/')){
  stripeRequests++;
  return respond({id:'sub_VERIFIEDLIVE',livemode:liveGood,customer:'cus_REAL_CUSTOMER'});
 }
 if(s.includes('/v1/billing_portal/sessions')){
  stripeRequests++;portalCreates++;assert.equal(opts.method,'POST');
  const params=new URLSearchParams(opts.body);
  assert.equal(params.get('customer'),'cus_REAL_CUSTOMER');
  clientCustomer ||=params.get('customer')==='cus_REAL_CUSTOMER';
  assert.equal(params.get('return_url'),'https://course.example/my-purchases.html#subscriptions');
  return respond({url:domainGood?'https://billing.stripe.com/p/session/verified123':'https://evil.example/attack'});
 }
 throw Error('Unexpected fetch '+s);
};
const attempt=(data={kind:'plan',recordId:4},options={})=>onRequestPost({env,
 request:new Request('https://course.example/api/stripe-billing-portal-v014122',{
  method:'POST',headers:{authorization:'Bearer member.token',
  origin:options.origin||'https://course.example','content-type':'application/json'},
  body:JSON.stringify(data)})
});
try{
 let r=await attempt({kind:'plan',recordId:4,customerId:'cus_attack'});
 assert.equal(r.status,400);assert.equal(portalCreates,0);
 r=await attempt({kind:'plan',recordId:4},{origin:'https://attacker.example'});
 assert.equal(r.status,403);assert.equal(portalCreates,0);
 member=false;r=await attempt();assert.equal(r.status,403);member=true;
 record=false;r=await attempt();assert.equal(r.status,404);record=true;
 sourceGood=false;r=await attempt();assert.equal(r.status,404);sourceGood=true;
 ownerGood=false;r=await attempt();assert.equal(r.status,503);ownerGood=true;
 merchantGood=false;r=await attempt();assert.equal(r.status,503);merchantGood=true;
 liveGood=false;r=await attempt();assert.equal(r.status,503);liveGood=true;
 domainGood=false;r=await attempt();assert.equal(r.status,503);domainGood=true;
 r=await attempt();assert.equal(r.status,200);let body=await r.json();
 assert.equal(body.ok,true);assert(body.url.startsWith('https://billing.stripe.com/'));
 assert.equal(clientCustomer,true);assert.equal(portalCreates,2);
 assert(!JSON.stringify(body).includes('cus_REAL_CUSTOMER'),'No Stripe customer ID returned to browser');
 console.log('PASS v122: no checkout-flag cancellation lockout; member-owned signed Stripe portal, merchant/livemode/URL validations, malicious customer suppression.');
}finally{globalThis.fetch=old}
