import {handleFounderSandbox} from '../_lib/founder-sandbox-lifecycle-v014216.js';
import {handleAdSandbox} from '../_lib/ad-sandbox-lifecycle-v014242.js';
import {handleLumenMixedTest} from '../_lib/lumen-mixed-test-webhook-v1.js';
/* v0.14.0.49 | Stripe TEST webhooks -> SHADOW TABLES ONLY.
 * Production subscriptions, purchases and actual entitlements are never touched.
 */
const respond=(body,status=200)=>new Response(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const id=(x,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(String(x||''));
function serviceHeaders(secret){
 if(String(secret).startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(secret)))return {apikey:secret,authorization:'Bearer '+secret};
 throw Error('SUPABASE_SECRET_FORMAT_UNSUPPORTED');
}
const rawval=x=>typeof x==='string'?x:x?.id||null;
const iso=x=>Number.isSafeInteger(x)?new Date(x*1000).toISOString():null;
const envValid=e=>e.GU39_SANDBOX_SHADOW_GATE==='true'&&String(e.GU39_STRIPE_TEST_SECRET_KEY||'').startsWith('sk_test_')&&String((e.STRIPE_TEST_WEBHOOK_SECRET || e.GU39_STRIPE_TEST_WEBHOOK_SECRET)||'').startsWith('whsec_')&&
 /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(String(e.SUPABASE_URL||''))&&!!e.SUPABASE_SECRET_KEY;
async function signature(raw,header,secret){const fields=String(header||'').split(',').map(s=>s.trim().split('='));const timestamp=fields.find(x=>x[0]==='t')?.[1];if(!/^\d{9,13}$/.test(timestamp||'')||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 const digests=fields.filter(x=>x[0]==='v1'&&/^[0-9a-f]{64}$/i.test(x[1]||'')).map(x=>x[1]);if(!digests.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)));
 let verified=false;for(const hex of digests){let diff=0;for(let i=0;i<32;i++)diff|=bytes[i]^parseInt(hex.slice(2*i,2*i+2),16);verified||=diff===0}return verified;
}
async function stripe(env,path){const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+env.GU39_STRIPE_TEST_SECRET_KEY},cache:'no-store'});if(!r.ok)throw Error('STRIPE_RETRY');const j=await r.json();if(j?.error||!j)throw Error('STRIPE_RETRY');return j;}
async function supa(env,path,method='GET',data){const base=String(env.SUPABASE_URL).replace(/\/$/,'');const r=await fetch(base+'/rest/v1/'+path,{method,cache:'no-store',headers:{...serviceHeaders(env.SUPABASE_SECRET_KEY),'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});if(!r.ok)throw Error('DB_RETRY');return r.json()}
// Enforce both the deployment-level test gate AND the Owner-controlled database
// test switch. This read runs only after signature and test-account validation.
async function ownerTestingEnabled(env){
 const rows=await supa(env,'gu39_sandbox_settings?select=enabled&id=eq.true&limit=1');
 return Array.isArray(rows)&&rows.length===1&&rows[0].enabled===true;
}
const EXPECTED_TEST_ACCOUNT='acct_1URGkDJY9FI7byHB';
async function checkout(env,filter,ident){const sessions=await stripe(env,'checkout/sessions?'+filter+'='+encodeURIComponent(ident)+'&limit=2');if(sessions.data?.length!==1)return null;return sessions.data[0]}
async function detail(env,sessionId){if(!id(sessionId,'cs_test'))return null;
 const s=await stripe(env,'checkout/sessions/'+encodeURIComponent(sessionId));if(s.livemode!==false||s.id!==sessionId)return null;
 const line=await stripe(env,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2');
 if(line.data?.length!==1||line.data[0].quantity!==1||!id(line.data[0].price?.id,'price'))return null;
 const intent=(await supa(env,'gu39_sandbox_intents?select=*&session_id=eq.'+encodeURIComponent(sessionId)+'&limit=2'))?.[0];if(!intent)return null;
 if(s.client_reference_id!==intent.id||s.metadata?.gu39_shadow_intent!==intent.id||intent.stripe_price_id!==line.data[0].price.id||
   intent.stripe_product_id!==rawval(line.data[0].price?.product)||s.currency!=='usd')throw Error('SESSION_BINDING_CONFLICT');
 return {session:s,intent,priceId:line.data[0].price.id};
}
async function subdata(env,sid){if(!id(sid,'sub'))return null;const sub=await stripe(env,'subscriptions/'+encodeURIComponent(sid));
 const item=sub.items?.data?.[0];if(sub.livemode!==false||sub.items?.data?.length!==1||!id(item?.price?.id,'price'))return null;
 const latest=rawval(sub.latest_invoice);const inv=id(latest,'in')?await stripe(env,'invoices/'+encodeURIComponent(latest)):null;
 return {sub,invoice:inv,priceId:item.price.id,periodEnd:iso(item.current_period_end||sub.current_period_end)};
}
async function translate(env,event){const obj=event.data?.object||{},type=event.type;let ss=null,sub=null,invoice=null,charge=null,action=null,amount=null,accessUntil=null,invId=null;
 if(type==='checkout.session.completed'||type==='checkout.session.async_payment_succeeded'){
  ss=await detail(env,obj.id);if(!ss)return null;
  if(ss.session.mode==='payment'){
   if(ss.session.payment_status!=='paid')return null;
   action='paid';amount=ss.session.amount_total;accessUntil=null;
  }else if(ss.session.mode==='subscription'){
   sub=await subdata(env,rawval(ss.session.subscription));if(!sub)return null;
   invoice=sub.invoice;invId=invoice?.id||null;accessUntil=sub.periodEnd;amount=invoice?.amount_paid??null;
   action=sub.sub.status==='active'&&invoice?.status==='paid'?'paid':'failed';
  }else return null;
 }else if(['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted'].includes(type)){
  let sid=null;
  if(type.startsWith('invoice.')){
   invoice=await stripe(env,'invoices/'+encodeURIComponent(obj.id));sid=rawval(invoice.subscription)||rawval(invoice.parent?.subscription_details?.subscription);
  }else sid=obj.id;
  sub=await subdata(env,sid);if(!sub)return null;
  const s=await checkout(env,'subscription',sid);if(!s)return null;
  ss=await detail(env,s.id);if(!ss)return null;
  if(rawval(ss.session.subscription)!==sid)return null;
  invId=invoice?.id||sub.invoice?.id||null;amount=invoice?.amount_paid??sub.invoice?.amount_paid??null;accessUntil=sub.periodEnd;
  if(type==='invoice.payment_failed')action='failed';
  else if(type==='customer.subscription.deleted'||sub.sub.status==='canceled')action='canceled';
  else if(sub.sub.cancel_at_period_end)action='cancel_scheduled';
  else action=(sub.sub.status==='active'&&(invoice?.status==='paid'||sub.invoice?.status==='paid'))?'renewed':'failed';
 }else if(type==='charge.refunded'||type==='charge.dispute.created'){
  const cid=type==='charge.refunded'?obj.id:rawval(obj.charge);if(!id(cid,'ch'))return null;
  charge=await stripe(env,'charges/'+encodeURIComponent(cid));if(charge.livemode!==false||!id(rawval(charge.payment_intent),'pi'))return null;
  if(type==='charge.refunded'&&charge.amount_refunded<charge.amount)return null; // partial refund manual review
  const invoiceRef=rawval(charge.invoice);
  if(id(invoiceRef,'in')){
   invoice=await stripe(env,'invoices/'+encodeURIComponent(invoiceRef));
   const sid=rawval(invoice.subscription)||rawval(invoice.parent?.subscription_details?.subscription);
   if(id(sid,'sub')){
    sub=await subdata(env,sid);if(!sub)return null;
    // Refunds against older paid periods must not revoke newer access; case review.
    if(sub.invoice?.id!==invoiceRef)return null;
    const found=await checkout(env,'subscription',sid);if(!found)return null;
    ss=await detail(env,found.id);accessUntil=sub.periodEnd;
   }
  }
  if(!ss){const found=await checkout(env,'payment_intent',rawval(charge.payment_intent));if(!found)return null;ss=await detail(env,found.id)}
  if(!ss)return null;
  action=type==='charge.refunded'?'refunded':'disputed';amount=charge.amount;invId=invoiceRef||null;
 }else return null;
 if(!ss||!action)return null;
 if(sub){if(ss.session.mode!=='subscription'||ss.priceId!==sub.priceId||rawval(ss.session.customer)!==rawval(sub.sub.customer))throw Error('SUBSCRIPTION_ID_MISMATCH');}
 if(charge&&!sub&&rawval(ss.session.payment_intent)!==rawval(charge.payment_intent))throw Error('PAYMENT_ID_MISMATCH');
 if(action==='paid'||action==='renewed'){
  if(!Number.isSafeInteger(amount)||amount<ss.intent.quoted_cents)throw Error('PAID_AMOUNT_CONFLICT');
  if(sub&&(!accessUntil||new Date(accessUntil).getTime()<=Date.now()))throw Error('PAID_PERIOD_INVALID');
 }
 return {p_event_id:event.id,p_intent_id:ss.intent.id,p_action:action,p_price_id:ss.priceId,p_amount_cents:amount,
  p_session_id:ss.session.id,p_subscription_id:sub?.sub.id||rawval(ss.session.subscription)||null,p_payment_intent_id:rawval(charge?.payment_intent)||rawval(ss.session.payment_intent)||null,
  p_customer_id:rawval(ss.session.customer),p_invoice_id:invId,p_access_until:accessUntil,p_event_created:iso(event.created)};
}
export async function onRequestPost({request,env}){
 if(!envValid(env))return respond('SHADOW_SANDBOX_DISABLED',503);
 if(Number(request.headers.get('content-length')||0)>262144)return respond('TOO_LARGE',413);
 const raw=await request.text();if(new TextEncoder().encode(raw).length>262144)return respond('TOO_LARGE',413);
 if(!await signature(raw,request.headers.get('stripe-signature'),(env.STRIPE_TEST_WEBHOOK_SECRET || env.GU39_STRIPE_TEST_WEBHOOK_SECRET)))return respond('BAD_SIGNATURE',401);
 let event;try{event=JSON.parse(raw)}catch{return respond('INVALID_JSON',400)}
 if(event.livemode!==false||!id(event.id,'evt')||!Number.isSafeInteger(event.created))return respond('NOT_A_TEST_EVENT',400);
 // Stripe Connect events that explicitly name another account must never be processed.
 if(event.account!==undefined&&event.account!==EXPECTED_TEST_ACCOUNT)return respond('WRONG_TEST_ACCOUNT',400);
 // A Cloudflare TEST gate alone does not authorize webhook processing when the
 // Owner has explicitly disabled the independent Supabase shadow-test switch.
 let enabled=false;
 try{enabled=await ownerTestingEnabled(env)}catch{return respond('SHADOW_SETTINGS_UNAVAILABLE',503)}
 if(!enabled)return respond('OWNER_TEST_MODE_DISABLED',503);
 try{
  // Signed TEST Stripe proof is required before isolated Lumen shadow settlement.
  // Classify ad-tagged TEST events before the mixed-payment adapter.
  // Both adapters still verify provider/payment intent bindings independently.
  const ad=await handleAdSandbox(event,env);
  if(ad)return respond(ad.body,ad.status);
  const mixed=await handleLumenMixedTest(event,env);
  if(mixed)return respond(mixed.body,mixed.status);
  const founder=await handleFounderSandbox(event,env);
  if(founder)return respond(founder.body,founder.status);
  const payload=await translate(env,event);if(!payload)return respond('IGNORED',200);
  const outcome=await supa(env,'rpc/gu39_shadow_apply','POST',payload);if(outcome.ok!==true||outcome.mode==='LIVE')throw Error('UNEXPECTED_FULFILLMENT');
  return respond('SHADOW_RECORDED',200);
 }catch{return respond('RETRY_SHADOW_EVENT',503)}
}
export function onRequestGet(){return respond('POST_ONLY',405)}
