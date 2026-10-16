/* Stripe Managed Payments TEST receipt, v0.14.0.32-R2.
 * Validates Stripe-Signature on raw bytes (tolerance 300 sec), never provisions
 * subscriptions/books, never changes paid orders, never accepts live events.
 */
const plain=(body,status)=>new Response(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const str=x=>String(x??'').trim();
async function signatureOK(raw,header,secret,nowSeconds=Math.floor(Date.now()/1000)){
 const pieces=String(header||'').split(',').map(x=>x.trim().split('='));
 const time=pieces.find(x=>x[0]==='t')?.[1],t=Number(time);
 if(!Number.isSafeInteger(t)||Math.abs(nowSeconds-t)>300)return false;
 const signatures=pieces.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/i.test(x[1]||'')).map(x=>x[1]);
 if(!signatures.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(time+'.'+raw)));
 let ok=false;
 for(const sig of signatures){let equal=0;for(let i=0;i<bytes.length;i++)equal|=bytes[i]^parseInt(sig.slice(2*i,2*i+2),16);ok=ok||(equal===0)}
 return ok;
}
export async function onRequestPost({request,env}){
 const signing=str(env.STRIPE_MANAGED_WEBHOOK_SECRET);
 if(env.STRIPE_MANAGED_TEST_CHECKOUT_ENABLED!=='true'||!signing.startsWith('whsec_')||!str(env.STRIPE_MANAGED_SECRET_KEY).startsWith('sk_test_'))
  return plain('Managed webhook sandbox is not configured',503);
 const size=Number(request.headers.get('content-length')||0);if(size>262144)return plain('Too large',413);
 const raw=await request.text();if(raw.length>262144)return plain('Too large',413);
 if(!await signatureOK(raw,request.headers.get('stripe-signature'),signing))return plain('Invalid signature',401);
 let event;try{event=JSON.parse(raw)}catch{return plain('Invalid JSON',400)}
 if(event.livemode!==false)return plain('Live Managed Payments events not supported in this staging release',503);
 if(!/^evt_[A-Za-z0-9_]{4,150}$/.test(str(event.id)))return plain('Invalid event',400);
 const allow=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed',
  'checkout.session.expired','invoice.paid','invoice.payment_failed','customer.subscription.updated',
  'customer.subscription.deleted','charge.refunded','charge.dispute.created']);
 if(!allow.has(str(event.type)))return plain('Ignored test event',200);
 const base=str(env.SUPABASE_URL).replace(/\/$/,''),key=str(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!key)return plain('Storage unavailable',503);
 const headers={apikey:key,authorization:'Bearer '+key,'content-type':'application/json',prefer:'resolution=ignore-duplicates,return=representation'};
 try{
  const ins=await fetch(base+'/rest/v1/gu_stripe_managed_test_events_v01432r2?on_conflict=event_id',{
   method:'POST',headers,body:JSON.stringify({event_id:event.id,event_type:event.type,livemode:false}),cache:'no-store'});
  if(!ins.ok)return plain('Event receipt unavailable',503);
  // For recognized checkout sessions, update ONLY the sandbox receipt/status;
  // do not issue any entitlements. Stripe metadata is never a membership grant.
  if(event.type==='checkout.session.completed'||event.type.startsWith('checkout.session.async_payment_')){
   const session=event.data?.object,id=str(session?.client_reference_id);
   const stripeId=str(session?.id);const paid=event.type==='checkout.session.async_payment_succeeded'||
     (event.type==='checkout.session.completed' && session.payment_status==='paid');
   const state=paid?'test_paid':event.type==='checkout.session.async_payment_failed'?'test_failed':null;
   if(state&&/^[a-f0-9-]{36}$/i.test(id)&&/^cs_test_[A-Za-z0-9_]+$/.test(stripeId)){
    const patch=await fetch(base+'/rest/v1/gu_stripe_managed_test_sessions_v01432r2?id=eq.'+encodeURIComponent(id)+
      '&stripe_session_id=eq.'+encodeURIComponent(stripeId)+'&status=eq.checkout_created',{
       method:'PATCH',headers:{...headers,prefer:'return=minimal'},body:JSON.stringify({status:state}),cache:'no-store'});
    if(!patch.ok)return plain('Test session reconciliation unavailable',503);
   }
  }
  return plain('accepted test event',200);
 }catch{return plain('Test event not recorded',503)}
}
export function onRequestGet(){return plain('POST required',405)}
