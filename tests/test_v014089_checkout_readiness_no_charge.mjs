/* v89 — read-only Stripe offer verification, no POST and no test charge. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../assets/js/commerce-common.js',import.meta.url),'utf8');
const catalog={
 plans:[{planCode:'FREE',priceCents:0,checkoutEnabled:true},{planCode:'FULL_MONTHLY',priceCents:6999,checkoutEnabled:false},
        {planCode:'FULL_ANNUAL',priceCents:69900,checkoutEnabled:true}],
 tools:[{toolCode:'MARKET_TUTOR',status:'live',priceCents:2999,checkoutEnabled:false},
        {toolCode:'MARKET_SIMULATOR',status:'planned',priceCents:2999,checkoutEnabled:true}]
};
let disabled=false,events=[];
const fetch=async(url,opts={})=>{
 events.push({url,method:opts.method||'GET'});
 if(url.includes('digital-payment-route-v01432r2'))return {ok:true,json:async()=>({ok:true,provider:'STRIPE_MANAGED',enabled:!disabled})};
 const code=new URL(url,'https://example.test').searchParams.get('code');
 return {ok:true,json:async()=>({ok:true,liveCheckoutAvailable:['FULL_MONTHLY','MARKET_TUTOR'].includes(code)})};
};
const context={window:{},fetch,AbortSignal,console,Number,Promise};
vm.runInNewContext(code,context);
const run=async()=>context.window.CommerceTools.verifiedCheckout(catalog);
let result=await run();
assert.equal(result.plans[0].checkoutEnabled,false,'Free account is not a Stripe paid checkout');
assert.equal(result.plans[1].checkoutEnabled,true,'LIVE available monthly checkout may be sold even if outdated DB catalog says false');
assert.equal(result.plans[2].checkoutEnabled,false,'Unavailable annual plan must NOT expose a paid checkout CTA');
assert.equal(result.tools[0].checkoutEnabled,true,'Current tool offer availability must follow verified LIVE route');
assert.equal(result.tools[1].checkoutEnabled,false,'Planned tools must never expose Stripe checkout');
assert.ok(events.length>=4);
assert.ok(events.every(x=>x.method==='GET'),'Readiness MUST NOT create a Stripe Checkout Session');
disabled=true;events=[];result=await run();
assert.equal(result.plans[1].checkoutEnabled,false);
assert.equal(result.tools[0].checkoutEnabled,false);
assert.equal(events.length,1,'No per-product checks when master provider is disabled');
console.log('PASS v89: independent LIVE Stripe tool/plan readiness controls conversion CTA, planned/free products locked, provider disabled fails closed, GET only.');
