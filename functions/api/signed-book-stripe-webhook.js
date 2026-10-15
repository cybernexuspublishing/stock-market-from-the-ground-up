/* v0.14.0.31: verify Stripe raw-body HMAC, then atomically reconcile paid/refunded/disputed orders. */
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const enc=new TextEncoder();
const isId=(s,p)=>typeof s==='string'&&new RegExp('^'+p+'_[A-Za-z0-9_]+$').test(s);
async function validSignature(payload,header,secret,now=Math.floor(Date.now()/1000)){
 const parts={};for(const item of String(header||'').split(',')){const i=item.indexOf('=');if(i>0){const k=item.slice(0,i).trim(),v=item.slice(i+1).trim();(parts[k]??=[]).push(v)}}
 const ts=Number(parts.t?.[0]);if(!Number.isSafeInteger(ts)||Math.abs(now-ts)>300||!parts.v1?.length||!secret)return false;
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(ts+'.'+payload)));
 const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
 let valid=false;for(const candidate of parts.v1){if(candidate.length!==hex.length||!/^[0-9a-f]{64}$/i.test(candidate))continue;let diff=0;for(let i=0;i<64;i++)diff|=hex.charCodeAt(i)^candidate.toLowerCase().charCodeAt(i);valid=valid||(diff===0)}
 return valid;
}
async function apply(env,name,args){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url)||!key)throw Error('Database unavailable');
 const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(args),cache:'no-store'});
 const data=await r.json().catch(()=>({}));if(!r.ok||data?.ok!==true)throw Error('Reconciliation failed');return data;
}
export async function onRequestPost({request,env}){
 try{
  const secret=String(env.STRIPE_SIGNED_WEBHOOK_SECRET||'');
  if(!secret.startsWith('whsec_'))return json({error:'Stripe webhook not configured'},503);
  if(Number(request.headers.get('content-length')||'0')>1048576)return json({error:'Payload too large'},413);
  const raw=await request.text();if(raw.length>1048576)return json({error:'Payload too large'},413);
  if(!await validSignature(raw,request.headers.get('stripe-signature'),secret))return json({error:'Invalid signature'},400);
  const evt=JSON.parse(raw),obj=evt?.data?.object;
  if(!isId(evt?.id,'evt')||!obj||typeof obj!=='object')return json({error:'Invalid Stripe event'},400);
  const testMode=String(env.STRIPE_SIGNED_TEST_MODE||'true').toLowerCase()!=='false';
  if(typeof evt.livemode!=='boolean'||evt.livemode===testMode)return json({error:'Stripe environment mismatch'},400);
  if(evt.type==='checkout.session.completed'||evt.type==='checkout.session.async_payment_succeeded'){
   if(!obj.metadata?.gu_order_id)return json({ok:true,ignored:true});
   if(obj.payment_status!=='paid')return json({ok:true,skipped:'unpaid'});
   if(obj.mode!=='payment'||!isId(obj.id,'cs')||!isId(obj.payment_intent,'pi')||
      !/^[a-f0-9-]{36}$/i.test(obj.client_reference_id||'')||obj.metadata?.gu_order_id!==obj.client_reference_id ||
      obj.currency!=='usd')return json({error:'Invalid signed-book order event'},400);
   const data=await apply(env,'gu_signed_stripe_paid_v01431',{
    p_event:evt.id,p_order:obj.client_reference_id,p_session:obj.id,p_intent:obj.payment_intent,
    p_subtotal:obj.amount_subtotal,p_shipping:obj.shipping_cost?.amount_total,
    p_total:obj.amount_total,p_currency:obj.currency});
   return json({ok:true,duplicate:!!data.duplicate});
  }
  if(evt.type==='charge.refunded'||evt.type==='charge.dispute.created'){
   const pi=obj.payment_intent;if(!isId(pi,'pi'))return json({error:'Missing linked payment'},400);
   const stripeKey=String(env.STRIPE_SECRET_KEY||'');
   if(!stripeKey.startsWith('sk_'))return json({error:'Stripe reconciliation not configured'},503);
   const piResponse=await fetch('https://api.stripe.com/v1/payment_intents/'+encodeURIComponent(pi),{
      headers:{Authorization:'Bearer '+stripeKey},cache:'no-store'});
   if(!piResponse.ok)return json({error:'Could not verify refund ownership'},503);
   const paymentIntent=await piResponse.json();
   // Ignore unrelated payments from the same Stripe account; signed orders alone
   // are held for reconciliation. Never mistake a subscription refund for a book.
   if(paymentIntent?.metadata?.signed_book_v01431!=='true')return json({ok:true,ignored:true});
   if(!/^[a-f0-9-]{36}$/i.test(paymentIntent.metadata.gu_order_id||''))return json({error:'Incomplete signed-book refund association'},503);
   const kind=evt.type==='charge.refunded'?'refunded':'disputed';
   const data=await apply(env,'gu_signed_stripe_reversal_v01431',{p_event:evt.id,p_intent:pi,p_kind:kind});
   return json({ok:true,duplicate:!!data.duplicate});
  }
  return json({ok:true,ignored:true});
 }catch(e){return json({error:'Webhook reconciliation failed'},503)}
}
export async function onRequestGet(){return json({error:'POST required'},405)}
