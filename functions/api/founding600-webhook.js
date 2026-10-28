/* Founding 600 v0.14.0.199 dedicated, signed Stripe LIVE payment verifier.
 * Entire handler is disabled unless explicitly activated in Production.
 * Only provider-fetched PAID invoices produce seat/membership/Sparks grants.
 */
const text=(value,status=200)=>new Response(String(value),{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const foundingTerms={FOUNDING_14:{days:14,cents:2299},FOUNDING_30:{days:30,cents:4999},FOUNDING_60:{days:60,cents:5999}};
const pattern=(s,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(String(s||''));
function envConfig(e){
 const base=String(e.SUPABASE_URL||'').replace(/\/$/,'');
 const stripe=String(e.GU58_STRIPE_LIVE_SECRET_KEY||''),secret=String(e.GU_F600_LIVE_WEBHOOK_SECRET||''),key=String(e.SUPABASE_SECRET_KEY||'');
 if(e.GU_F600_LIVE_WEBHOOK_ENABLED!=='true'||e.GU_F600_LIVE_FULFILLMENT_APPROVED!=='true'
 ||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!stripe.startsWith('sk_live_')
 ||!secret.startsWith('whsec_')||!key||!pattern(e.GU58_STRIPE_LIVE_ACCOUNT_ID,'acct'))
 return null;
 let catalog;try{catalog=JSON.parse(e.GU_F600_LIVE_CATALOG_JSON||'')}catch{return null}
 if(!catalog||!catalog.FOUNDING_30?.priceId||!catalog.FOUNDING_60?.priceId)return null;
 return {base,stripe,secret,key,account:e.GU58_STRIPE_LIVE_ACCOUNT_ID,catalog};
}
async function raw(req){
 if(Number(req.headers.get('content-length')||0)>262144)throw Error('TOO_LARGE');
 const reader=req.body?.getReader();if(!reader)throw Error('INVALID_BODY');
 const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;if(size>262144){await reader.cancel().catch(()=>{});throw Error('TOO_LARGE')}parts.push(value)}
 const all=new Uint8Array(size);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length}
 return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
async function signature(raw,header,key){
 const parts=String(header||'').split(',').map(s=>s.trim().split('='));const ts=parts.find(x=>x[0]==='t')?.[1];
 const valid=parts.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/i.test(x[1]||'')).map(x=>x[1]);
 if(!/^\d{9,13}$/.test(ts||'')||Math.abs(Number(ts)-Date.now()/1000)>300||!valid.length)return false;
 const cryptokey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',cryptokey,new TextEncoder().encode(ts+'.'+raw)));
 let okay=false;for(const candidate of valid){let wrong=0;for(let i=0;i<32;i++)wrong|=digest[i]^Number.parseInt(candidate.slice(i*2,i*2+2),16);okay=okay||(wrong===0)}
 return okay;
}
async function stripe(c,path){
 const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+c.stripe},cache:'no-store'});
 if(!r.ok)throw Error('STRIPE_PROVIDER_UNAVAILABLE');
 const d=await r.json();if(d?.livemode===false)throw Error('NOT_LIVE_PROVIDER');
 return d;
}
function dbHeaders(c){return {apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),'content-type':'application/json'}}
async function db(c,path,body){
 const r=await fetch(c.base+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:dbHeaders(c),
 body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(!r.ok)throw Error('DATABASE_RETRY');
 return r.json();
}
const iso=x=>Number.isSafeInteger(x)&&x>0?new Date(x*1000).toISOString():null;
async function fulfill(c,event){
 const invoice=event.data?.object;if(!pattern(invoice?.id,'in'))return 'IGNORE';
 const verified=await stripe(c,'invoices/'+encodeURIComponent(invoice.id));
 if(verified.id!==invoice.id||verified.livemode!==true||verified.status!=='paid'||verified.currency!=='usd')
 return 'IGNORE';
 const sid=typeof verified.subscription==='string'?verified.subscription:
  verified.parent?.subscription_details?.subscription;
 if(!pattern(sid,'sub'))return 'IGNORE';
 const sub=await stripe(c,'subscriptions/'+encodeURIComponent(sid));
 if(sub.id!==sid||sub.livemode!==true||sub.status!=='active')return 'IGNORE';
 const reservationId=sub.metadata?.f600_reservation;
 if(!/^[0-9a-f-]{36}$/i.test(reservationId||''))return 'IGNORE';
 const rows=await db(c,'gu_founder_reservations_v014173?select=*&id=eq.'+encodeURIComponent(reservationId)+'&limit=1');
 if(!Array.isArray(rows)||rows.length!==1)throw Error('RESERVATION_NOT_FOUND');
 const reserved=rows[0],price=c.catalog[reserved.plan_code]?.priceId;
 if(!price||reserved.checkout_price_id!==price||!pattern(reserved.checkout_session_id,'cs_live'))throw Error('BINDING_FAILED');
 const original=await stripe(c,'checkout/sessions/'+encodeURIComponent(reserved.checkout_session_id));
 if(original.id!==reserved.checkout_session_id||original.livemode!==true
 ||original.client_reference_id!==reservationId||original.mode!=='subscription'
 ||original.subscription!==sid||original.metadata?.f600_user!==reserved.user_id)
 throw Error('CHECKOUT_SOURCE_MISMATCH');
 const item=sub.items?.data?.[0];
 if(sub.items?.data?.length!==1||item?.price?.id!==price
 ||item.price?.recurring?.interval!=='day'
 ||item.price.recurring.interval_count!==foundingTerms[reserved.plan_code]?.days)
 throw Error('STRIPE_CADENCE_MISMATCH');
 const line=verified.lines?.data?.find(l=>(l.price?.id||l.pricing?.price_details?.price)===price);
 if(verified.lines?.has_more===true||verified.lines?.data?.length!==1)
 throw Error('UNEXPECTED_INVOICE_LINES');
 const start=iso(line?.period?.start),end=iso(line?.period?.end);
 if(!start||!end||!pattern(verified.customer,'cus')||!pattern(event.id,'evt'))
 throw Error('INVALID_CYCLE');
 const expected=foundingTerms[reserved.plan_code]?.cents;
 if(!expected)throw Error('UNRECOGNIZED_FOUNDER_PLAN');
 if(!line||line.amount!==expected||verified.subtotal!==expected||verified.amount_paid<expected)
 throw Error('INVOICE_PRICE_MISMATCH');
 // Stripe invoice.paid also fires for out-of-band/manual marks. Grant access
 // only for a provider-confirmed succeeded PaymentIntent actually allocated.
 const pay=await stripe(c,'invoice_payments?invoice='+encodeURIComponent(verified.id)+'&limit=10');
 if(pay.has_more||!Array.isArray(pay.data)||pay.data.length!==1)throw Error('INVOICE_PAYMENT_COUNT_MISMATCH');
 const allocated=pay.data[0],intent=allocated.payment?.payment_intent;
 if(allocated.status!=='paid'||allocated.amount_paid!==expected||!pattern(intent,'pi'))
 throw Error('NO_VERIFIED_PAID_PAYMENT_INTENT');
 const payment=await stripe(c,'payment_intents/'+encodeURIComponent(intent));
 if(payment.id!==intent||payment.status!=='succeeded'||payment.currency!=='usd'||payment.amount<expected
 ||payment.customer!==verified.customer)throw Error('PAYMENT_INTENT_NOT_SETTLED');
 const result=await db(c,'rpc/gu_founder_record_paid_cycle_v014196',{
  p_reservation:reservationId,p_user:reserved.user_id,p_session:reserved.checkout_session_id,
  p_subscription:sid,p_invoice:verified.id,p_event:event.id,p_customer:verified.customer,
  p_price:price,p_plan_line_amount:expected,p_period_start:start,p_period_end:end,p_livemode:true
 });
 if(result?.ok!==true)throw Error('DATABASE_FULFILLMENT_RETRY');
 return result.replayed?'REPLAY':'PAID';
}
/* Verify payment failures, canceled subscriptions, refunds, and charge disputes
 * against provider state + the existing bound LIVE founding reservation.
 */
async function subscriptionContext(c,sid){
 if(!pattern(sid,'sub'))return null;
 const sub=await stripe(c,'subscriptions/'+encodeURIComponent(sid));
 if(sub.id!==sid||sub.livemode!==true)throw Error('FOREIGN_SUBSCRIPTION');
 const rid=sub.metadata?.f600_reservation;
 if(!rid)return null; // unrelated Stripe products on the same account
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(rid))throw Error('BAD_FOUNDER_REFERENCE');
 const rows=await db(c,'gu_founder_reservations_v014173?select=*&id=eq.'+encodeURIComponent(rid)+'&limit=1');
 if(!Array.isArray(rows)||rows.length!==1)throw Error('NO_BOUND_FOUNDER_RESERVATION');
 const r=rows[0],p=c.catalog[r.plan_code],item=sub.items?.data?.[0];
 if(!p||r.reservation_state!=='consumed'||r.checkout_subscription_id!==sid||
 r.checkout_price_id!==p.priceId||sub.items?.data?.length!==1||item?.price?.id!==p.priceId||
 item.price?.recurring?.interval!=='day'||
 item.price.recurring.interval_count!==foundingTerms[r.plan_code]?.days)
 throw Error('FOUNDER_SUBSCRIPTION_BINDING_FAILED');
 const sess=await stripe(c,'checkout/sessions/'+encodeURIComponent(r.checkout_session_id));
 if(sess.id!==r.checkout_session_id||sess.client_reference_id!==rid||sess.subscription!==sid||
 sess.metadata?.f600_user!==r.user_id||sess.customer!==sub.customer)
 throw Error('FOUNDER_CHECKOUT_OR_CUSTOMER_MISMATCH');
 return {sub,r,sid,periodEnd:iso(item.current_period_end||sub.current_period_end)};
}
async function lifecycle(c,e){
 const kind=e.type;let sid=null,invoice=null,charge=null;
 if(kind==='invoice.payment_failed'){
  const invoiceId=e.data?.object?.id;
  if(!pattern(invoiceId,'in'))return 'IGNORE';
  invoice=await stripe(c,'invoices/'+encodeURIComponent(invoiceId));
  sid=typeof invoice.subscription==='string'?invoice.subscription:invoice.parent?.subscription_details?.subscription;
 }else if(kind==='customer.subscription.updated'||kind==='customer.subscription.deleted'){
  sid=e.data?.object?.id;
 }else if(kind==='charge.refunded'||kind==='charge.dispute.created'){
  const chargeId=kind==='charge.refunded'?e.data?.object?.id:e.data?.object?.charge;
  if(!pattern(chargeId,'ch'))return 'IGNORE';
  charge=await stripe(c,'charges/'+encodeURIComponent(chargeId));
  let invoiceId=typeof charge.invoice==='string'?charge.invoice:charge.invoice?.id;
  // Current Stripe API versions omit Charge.invoice. Resolve the canonical
  // InvoicePayment association from the verified PaymentIntent instead.
  if(!pattern(invoiceId,'in')){
   const intent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
   if(!pattern(intent,'pi'))throw Error('CHARGE_HAS_NO_VERIFIED_PAYMENT_INTENT');
   const matches=await stripe(c,'invoice_payments?payment%5Btype%5D=payment_intent&payment%5Bpayment_intent%5D='+encodeURIComponent(intent)+'&limit=10');
   if(matches.has_more||!Array.isArray(matches.data)||matches.data.length!==1
    ||matches.data[0].status!=='paid'||!pattern(matches.data[0].invoice,'in'))
    throw Error('REFUND_INVOICE_PAYMENT_MAPPING_NOT_UNIQUE');
   invoiceId=matches.data[0].invoice;
  }
  invoice=await stripe(c,'invoices/'+encodeURIComponent(invoiceId));
  sid=typeof invoice.subscription==='string'?invoice.subscription:invoice.parent?.subscription_details?.subscription;
 }else return 'IGNORE';
 if(!pattern(sid,'sub'))return 'IGNORE';
 const ctx=await subscriptionContext(c,sid);
 if(!ctx)return 'IGNORE';
 if(invoice){
  const invoiceSid=typeof invoice.subscription==='string'?invoice.subscription:invoice.parent?.subscription_details?.subscription;
  if(invoiceSid!==sid||invoice.customer!==ctx.sub.customer||invoice.livemode!==true)
   throw Error('INVOICE_SUBSCRIPTION_BINDING_MISMATCH');
 }
 if(kind==='invoice.payment_failed'){
  if(invoice.status==='paid')return 'IGNORE';
  if(!ctx.periodEnd)throw Error('SUBSCRIPTION_PERIOD_REQUIRED');
  const result=await db(c,'rpc/gu_founder_update_provider_state_v014218',
   {p_subscription:sid,p_event:e.id,p_status:'past_due',
    p_cancel_at_period_end:!!ctx.sub.cancel_at_period_end,p_period_end:ctx.periodEnd});
  if(!result?.ok)throw Error('FAILED_PAYMENT_STATE_RETRY');
  return result.replayed?'REPLAY':'PAYMENT_FAILED';
 }
 if(kind==='customer.subscription.updated'||kind==='customer.subscription.deleted'){
  if(!ctx.periodEnd)throw Error('SUBSCRIPTION_PERIOD_REQUIRED');
  const st=ctx.sub.status==='active'?'active':
    ['past_due','unpaid','incomplete'].includes(ctx.sub.status)?'past_due':
    ctx.sub.status==='canceled'?'canceled':null;
  if(!st)throw Error('UNSUPPORTED_FOUNDER_SUBSCRIPTION_STATE');
  const result=await db(c,'rpc/gu_founder_update_provider_state_v014218',
   {p_subscription:sid,p_event:e.id,p_status:st,
    p_cancel_at_period_end:!!ctx.sub.cancel_at_period_end,p_period_end:ctx.periodEnd});
  if(!result?.ok)throw Error('SUBSCRIPTION_STATUS_RETRY');
  return result.replayed?'REPLAY':'SUBSCRIPTION_'+st.toUpperCase();
 }
 if(kind==='charge.refunded'&&
 (charge.amount_refunded!==charge.amount||charge.amount<=0))return 'PARTIAL_REFUND_MANUAL_REVIEW';
 if(kind==='charge.dispute.created'&&
 (e.data?.object?.status==='won'||e.data?.object?.status==='lost'))return 'DISPUTE_REVIEW_REQUIRED';
 if(invoice.status!=='paid')throw Error('REFUND_OR_DISPUTE_UNPAID_INVOICE');
 const invoicePayments=await stripe(c,'invoice_payments?invoice='+encodeURIComponent(invoice.id)+'&limit=10');
 const paymentId=charge.payment_intent;
 if(invoicePayments.has_more||!invoicePayments.data?.some(p=>
 p.status==='paid'&&p.payment?.payment_intent===paymentId&&p.amount_paid>=charge.amount))
 throw Error('CHARGE_INVOICE_PAYMENT_MISMATCH');
 const result=await db(c,'rpc/gu_founder_reverse_paid_invoice_v014200',
  {p_invoice:invoice.id,p_subscription:sid,p_event:e.id,
   p_reason:kind==='charge.refunded'?'full_refund':'payment_dispute'});
 if(!result?.ok)throw Error('REFUND_REVERSAL_RETRY');
 return result.replayed?'REPLAY':kind==='charge.refunded'?'FULL_REFUND_REVERSED':'DISPUTE_REVERSED';
}
export async function onRequestPost({request,env}){
 const c=envConfig(env);if(!c)return text('Founding webhook inactive',503);
 let body;try{body=await raw(request)}catch{return text('Invalid event request',400)}
 if(!await signature(body,request.headers.get('stripe-signature'),c.secret))return text('Invalid event signature',403);
 let event;try{event=JSON.parse(body)}catch{return text('Malformed event',400)}
 if(event.livemode!==true||!pattern(event.id,'evt')||event.account&&event.account!==c.account)return text('Foreign event',403);
 if(!['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted',
 'charge.refunded','charge.dispute.created'].includes(event.type))
 return text('Unrelated Stripe event ignored',200);

 try{
  const account=await stripe(c,'account');if(account.id!==c.account)throw Error('FOREIGN_ACCOUNT');
  const status=event.type==='invoice.paid'?await fulfill(c,event):await lifecycle(c,event);
  return text(status,200);
 }catch{return text('Provider or fulfillment confirmation unavailable',503)}
}
