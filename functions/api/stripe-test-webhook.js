/* Unified Stripe TEST webhook entry point.
 * Signature verification happens before classifying a provider event.
 * Legacy book and GU39 processors retain their independent, fail-closed
 * reservation, provider, deduplication and fulfillment rules.
 * No LIVE credentials or LIVE entitlements are accepted here.
 */
import {onRequestPost as membershipWebhook} from './gu39-stripe-webhook.js';
import {onRequestPost as bookWebhook} from './book-stripe-test-webhook-v1.js';

const respond=(message,status)=>new Response(message,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const TEST_ACCOUNT='acct_1URGkDJY9FI7byHB';
const MAX_BYTES=262144;
const bookSessionTypes=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired']);
const chargeTypes=new Set(['charge.refunded','charge.dispute.created']);
const acceptedTypes=new Set([...bookSessionTypes,...chargeTypes,'invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted']);
const id=(value,prefix)=>new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,}$').test(String(value||''));

async function signed(payload,header,secret){
 const fields=String(header||'').split(',').map(v=>v.trim().split('='));
 const t=fields.find(v=>v[0]==='t')?.[1];
 const candidates=fields.filter(v=>v[0]==='v1'&&/^[0-9a-f]{64}$/i.test(v[1]||'')).map(v=>v[1]);
 if(!/^\d{9,13}$/.test(t||'')||Math.abs(Date.now()/1000-Number(t))>300||!candidates.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+payload)));
 return candidates.some(hex=>{let bad=0;for(let i=0;i<32;i++)bad|=digest[i]^parseInt(hex.slice(2*i,2*i+2),16);return bad===0});
}
async function provider(env,resource){
 const key=String(env.STRIPE_TEST_SECRET_KEY||env.GU39_STRIPE_TEST_SECRET_KEY||'');
 if(!key.startsWith('sk_test_'))throw Error('TEST_KEY_MISSING');
 const response=await fetch('https://api.stripe.com/v1/'+resource,{headers:{authorization:'Bearer '+key},cache:'no-store'});
 if(!response.ok)throw Error('PROVIDER_UNAVAILABLE');
 const data=await response.json();
 if(data?.livemode!==false||data?.error)throw Error('WRONG_PROVIDER_MODE');
 return data;
}
async function isBookEvent(event,env){
 if(bookSessionTypes.has(event.type)){
  const o=event.data?.object;
  if(!id(o?.id,'cs_test'))return false;
  // Stripe snapshot event payload already contains Checkout Session metadata.
  // Always use the canonical provider response to resolve the purchase class.
  const s=await provider(env,'checkout/sessions/'+encodeURIComponent(o.id));
  return !!s.metadata?.gu_book_test_intent;
 }
 if(chargeTypes.has(event.type)){
  let chargeId=event.type==='charge.refunded'?event.data?.object?.id:event.data?.object?.charge;
  if(!id(chargeId,'ch'))return false;
  const charge=await provider(env,'charges/'+encodeURIComponent(chargeId));
  if(!id(charge.payment_intent,'pi'))return false;
  const intent=await provider(env,'payment_intents/'+encodeURIComponent(charge.payment_intent));
  return !!intent.metadata?.gu_book_test_intent;
 }
 return false;
}
export async function onRequestPost({request,env,...context}){
 const secret=String(env.STRIPE_TEST_WEBHOOK_SECRET||'');
 if(!secret.startsWith('whsec_'))return respond('UNIFIED_TEST_WEBHOOK_NOT_CONFIGURED',503);
 if(Number(request.headers.get('content-length')||0)>MAX_BYTES)return respond('TOO_LARGE',413);
 let raw;try{raw=await request.text()}catch{return respond('INVALID_BODY',400)}
 if(new TextEncoder().encode(raw).length>MAX_BYTES)return respond('TOO_LARGE',413);
 if(!await signed(raw,request.headers.get('stripe-signature'),secret))return respond('BAD_SIGNATURE',401);
 let event;try{event=JSON.parse(raw)}catch{return respond('INVALID_JSON',400)}
 if(event?.livemode!==false||!id(event.id,'evt')||!Number.isSafeInteger(event.created)||
    event.account!==undefined&&event.account!==TEST_ACCOUNT)return respond('WRONG_TEST_EVENT',400);
 if(!acceptedTypes.has(event.type))return respond('IGNORED',200);
 try{
  const book=await isBookEvent(event,env);
  // Reconstruct the original request because the existing handlers consume its body.
  // Both handlers reverify the same unified endpoint signature before processing.
  const forwarded=new Request(request.url,{method:'POST',headers:request.headers,body:raw});
  const e={...env,STRIPE_BOOK_TEST_WEBHOOK_SECRET:secret,STRIPE_TEST_WEBHOOK_SECRET:secret};
  return await (book?bookWebhook:membershipWebhook)({request:forwarded,env:e,...context});
 }catch{return respond('TEST_PROVIDER_RETRY',503)}
}
export function onRequestGet(){return respond('POST_ONLY',405)}
