import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost as checkout} from '../functions/api/founding600-checkout.js';
import {onRequestPost as webhook} from '../functions/api/founding600-webhook.js';
test('founding GET reports a closed checkout without keys or account data',async()=>{
 const response=await onRequestGet({env:{}});
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.checkoutEnabled,false);
 assert.equal(body.capacity,600);
 assert.equal(body.plans[0].billingDays,30);
 assert.equal(body.plans[1].billingDays,60);
});
test('founding checkout fails closed before any Stripe or Supabase access',async()=>{
 const before=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('LIVE NETWORK MUST NOT BE CALLED')};
 try{
  const request=new Request('https://example.com/api/founding600-checkout',{
   method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},
   body:JSON.stringify({plan:'FOUNDING_60',autoRenewConsent:true,founderTermsConsent:true})
  });
  const response=await checkout({request,env:{}});
  assert.equal(response.status,503);assert.equal(calls,0);
 }finally{globalThis.fetch=before}
});
test('founding checkout rejects absent recurring consent or unknown SKU',async()=>{
 const request=new Request('https://example.com/api/founding600-checkout',{
  method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},
  body:JSON.stringify({plan:'FOUNDING_45',autoRenewConsent:true,founderTermsConsent:true})
 });
 const response=await checkout({request,env:{}});
 assert.equal(response.status,400);
});
test('founding checkout rejects cross-site charge requests',async()=>{
 const request=new Request('https://example.com/api/founding600-checkout',{
  method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},
  body:JSON.stringify({plan:'FOUNDING_30',autoRenewConsent:true,founderTermsConsent:true})
 });
 assert.equal((await checkout({request,env:{}})).status,403);
});
test('founding webhook fails closed without release environment',async()=>{
 const before=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('NO PROVIDER REQUEST')};
 try{
  const request=new Request('https://example.com/api/founding600-webhook',{
   method:'POST',body:'{}',headers:{'stripe-signature':'t=1000000000,v1='+('0'.repeat(64))}
  });
  const response=await webhook({request,env:{}});
  assert.equal(response.status,503);assert.equal(calls,0);
 }finally{globalThis.fetch=before}
});
