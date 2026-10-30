/* v0.14.0.58 | Independent LIVE Stripe webhook candidate. Disabled by default.
 * No preview or shadow access can grant real memberships. Signed, provider-verified
 * events alone may invoke the service-only SQL entitlement ledger, after launch.
 * IMPORTANT: webhook processing continues for existing paid subscriptions even if
 * new LIVE checkouts are later disabled by the Owner.
 */
const resp=(text,status=200)=>new Response(text,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const v=x=>String(x??'').trim();
function cfg(e){
 const base=v(e.SUPABASE_URL).replace(/\/$/,'');
 if(e.GU58_LIVE_WEBHOOK_ENABLED!=='true'||e.GU58_LIVE_FULFILLMENT_APPROVED!=='true'||
    e.GU58_LIVE_DB_CONTRACT_APPROVED!=='true'||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
    !v(e.SUPABASE_SECRET_KEY)||!/^sk_live_[A-Za-z0-9_]+$/.test(v(e.GU58_STRIPE_LIVE_SECRET_KEY))||
    !/^whsec_[A-Za-z0-9_]+$/.test(v(e.GU58_STRIPE_LIVE_WEBHOOK_SECRET))||
    !/^acct_[A-Za-z0-9_]{6,}$/.test(v(e.GU58_STRIPE_LIVE_ACCOUNT_ID)))return null;
 return {base,key:v(e.SUPABASE_SECRET_KEY),stripe:v(e.GU58_STRIPE_LIVE_SECRET_KEY),
   secret:v(e.GU58_STRIPE_LIVE_WEBHOOK_SECRET),account:v(e.GU58_STRIPE_LIVE_ACCOUNT_ID)};
}
/* D15: bound actual Stripe webhook bytes BEFORE any zero-dollar QA or
 * paid event parser, HMAC check, provider request or database operation. */
async function boundedStripeBody(req){
 const limit=262144,claimed=req.headers.get('content-length');
 if(claimed!==null&&(!/^[0-9]+$/.test(claimed)||Number(claimed)>limit))
   throw Object.assign(new Error('Too large'),{status:413});
 if(!req.body||typeof req.body.getReader!=='function')
   throw Object.assign(new Error('Invalid event body'),{status:400});
 const reader=req.body.getReader(),parts=[];let size=0;
 while(true){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))
     throw Object.assign(new Error('Invalid event body'),{status:400});
   size+=value.byteLength;
   if(size>limit){
     await reader.cancel().catch(()=>{});
     throw Object.assign(new Error('Too large'),{status:413});
   }
   parts.push(value);
 }
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}
 catch{throw Object.assign(new Error('Invalid UTF-8'),{status:400})}
}
async function checkHmac(raw,header,secret){const elements=String(header||'').split(',').map(x=>x.trim().split('='));const ts=elements.find(x=>x[0]==='t')?.[1],time=Number(ts);
 if(!Number.isSafeInteger(time)||Math.abs(Date.now()/1000-time)>300)return false;
 const sigs=elements.filter(x=>x[0]==='v1'&&/^[0-9a-f]{64}$/i.test(x[1]||'')).map(x=>x[1]);if(!sigs.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw)));
 let good=false;for(const s of sigs){let mismatch=0;for(let i=0;i<32;i++)mismatch|=digest[i]^parseInt(s.slice(i*2,i*2+2),16);good=good||(mismatch===0)}return good;}
async function getStripe(c,path){const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+c.stripe},cache:'no-store'});if(!r.ok)throw Error('stripe:'+r.status);
 const j=await r.json();if(!j||j.error)throw Error('stripe:invalid');return j;}
async function apply(c,x){const r=await fetch(c.base+'/rest/v1/rpc/gu58_live_stripe_apply_event',{method:'POST',headers:{apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),'content-type':'application/json'},body:JSON.stringify(x),cache:'no-store'});
 if(!r.ok)throw Error('supabase:'+r.status+':'+(await r.text()).slice(0,140));return await r.json();}
const ident=(x,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{4,150}$').test(v(x));
const iso=unix=>new Date(unix*1000).toISOString();
// This Stripe account can also accept independently fulfilled signed physical
// books. A signed event is not automatically a GU58 membership transaction.
// The creator of GU58 checkout persists intent metadata on the Session and
// Subscription. Ignore entirely unrelated objects; reject partial markers.
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||''));
function tagged(meta,session=false){
 const m=meta&&typeof meta==='object'?meta:{};
 const i=Object.prototype.hasOwnProperty.call(m,'gu58_intent');
 const u=Object.prototype.hasOwnProperty.call(m,'gu58_member');
 if(!i&&!u)return false;
 if(!i||!uuid(m.gu58_intent)||(session&&(!u||!uuid(m.gu58_member)))||
    (u&&!uuid(m.gu58_member)))throw Error('gu58:invalid_provider_metadata');
 return true;
}
const actionBase=e=>({p_cancel_at_period_end:false,p_event_id:e.id,p_session_id:null,p_subscription_id:null,p_payment_intent_id:null,p_price_id:null,p_amount_cents:null,p_currency:'usd',p_period_end:null,p_stripe_created:iso(e.created),p_invoice_id:null});
async function invoice(c,sub){const id=typeof sub.latest_invoice==='string'?sub.latest_invoice:sub.latest_invoice?.id;if(!ident(id,'in'))return null;
 return getStripe(c,'invoices/'+encodeURIComponent(id));}
async function subscription(c,id){const sub=await getStripe(c,'subscriptions/'+encodeURIComponent(id));
 if(sub.id!==id||sub.livemode!==true)throw Error('subscription:environment');
 if(!tagged(sub.metadata))return null; // foreign subscription, not a GU58 fulfillment
 const item=sub.items?.data?.[0];if(sub.items?.data?.length!==1||!ident(item?.price?.id,'price'))throw Error('subscription:price');
 const end=item.current_period_end||sub.current_period_end;
 if(!Number.isSafeInteger(end))throw Error('subscription:period');
 return {sub,price:item.price.id,end:iso(end),latest:await invoice(c,sub)};
}
async function verifyBoundSession(c,s,line){
 if(s.livemode!==true||!ident(s.id,'cs_live')||s.currency!=='usd'||
    !/^\d{1,6}$/.test(String(line?.quantity||''))||line.quantity!==1||
    !ident(line?.price?.id,'price'))throw Error('session:provider_mismatch');
 const reference=s.client_reference_id,meta=s.metadata||{};
 if(!/^[0-9a-f-]{36}$/i.test(reference||'')||meta.gu58_intent!==reference)
  throw Error('session:intent_mismatch');
 const r=await fetch(c.base+'/rest/v1/gu58_live_checkout_intents?select=id,user_id,price_id,quoted_amount_cents,stripe_session_id,status'+
  '&id=eq.'+encodeURIComponent(reference)+'&limit=2',{headers:{
   apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key})
  },cache:'no-store'});
 if(!r.ok)throw Error('session:intent_db_unavailable');
 const matches=await r.json();
 if(!Array.isArray(matches)||matches.length!==1||
   matches[0].price_id!==line.price.id||
   meta.gu58_member!==matches[0].user_id||
   !Number.isSafeInteger(matches[0].quoted_amount_cents)||
   s.amount_subtotal!==matches[0].quoted_amount_cents)
    throw Error('session:intent_binding_failed');
 const record=matches[0];
 if(record.stripe_session_id===null&&record.status==='prepared'){
  // An earlier successful Stripe CREATE may have suffered a network/DB PATCH
  // failure. Recover only the exact provider-verified original intent,
  // never create another transaction or grant access from this binding RPC.
  const binding=await fetch(c.base+'/rest/v1/rpc/gu58_live_bind_verified_checkout',{
   method:'POST',headers:{
    apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),
    'content-type':'application/json'
   },body:JSON.stringify({
    p_intent_id:reference,p_user_id:meta.gu58_member,p_session_id:s.id,
    p_price_id:line.price.id,p_expected_cents:s.amount_subtotal
   }),cache:'no-store'
  });
  if(!binding.ok)throw Error('session:intent_recovery_failed');
  const applied=await binding.json().catch(()=>null);
  if(applied?.ok!==true)throw Error('session:intent_recovery_unverified');
  record.stripe_session_id=s.id;record.status='checkout_created';
 }
 if(record.stripe_session_id!==s.id||record.status==='prepared')
   throw Error('session:intent_binding_failed');
 return matches[0];
}
async function processEvent(c,event){const e=event,obj=e.data?.object||{},x=actionBase(e);
 if(e.type==='checkout.session.completed'||e.type==='checkout.session.async_payment_succeeded'){
  if(!ident(obj.id,'cs_live'))throw Error('invalid session');
  const s=await getStripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
  if(s.id!==obj.id||s.livemode!==true)throw Error('session:environment');
  if(!tagged(s.metadata,true))return null; // signed physical book or unrelated checkout
  const lines=await getStripe(c,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2');
  if(lines.data?.length!==1)throw Error('session:line_count');
  const line=lines.data[0];if(!ident(line.price?.id,'price')||line.quantity!==1)throw Error('session:line');await verifyBoundSession(c,s,line);
  x.p_session_id=s.id;x.p_price_id=line.price.id;x.p_currency=s.currency;
  if(s.mode==='payment'){
    if(s.payment_status!=='paid')return null;
    if(!ident(s.payment_intent,'pi'))throw Error('session:payment_intent');
    x.p_payment_intent_id=s.payment_intent;x.p_amount_cents=Number(s.amount_subtotal||s.amount_total);
    x.p_action='lifetime_paid';return x;
  }
  if(s.mode==='subscription'&&ident(s.subscription,'sub')){
    const ss=await subscription(c,s.subscription);
    if(!ss)throw Error('gu58:session_subscription_missing_marker');
    x.p_subscription_id=s.subscription;x.p_period_end=ss.end;x.p_price_id=ss.price;
    x.p_amount_cents=ss.latest?.amount_paid??null;x.p_invoice_id=ss.latest?.id||null;
    x.p_cancel_at_period_end=ss.sub.cancel_at_period_end===true; x.p_action=ss.sub.status==='active'&&ss.latest?.status==='paid'?'subscription_active':'subscription_past_due';
    return x;
  }
  return null;
 }
 if(['invoice.paid','invoice.payment_failed','invoice.payment_action_required','customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','customer.subscription.resumed'].includes(e.type)){
  let id;if(e.type.startsWith('invoice.')){
    if(!ident(obj.id,'in'))throw Error('invoice:id');
    const iv=await getStripe(c,'invoices/'+encodeURIComponent(obj.id));
    id=typeof iv.subscription==='string'?iv.subscription:iv.parent?.subscription_details?.subscription;
  }else id=obj.id;
  if(!ident(id,'sub'))return null;
  const ss=await subscription(c,id);if(!ss)return null;
  x.p_subscription_id=id;x.p_price_id=ss.price;x.p_period_end=ss.end;
  x.p_amount_cents=ss.latest?.amount_paid??null;x.p_invoice_id=ss.latest?.id||null;
  x.p_cancel_at_period_end=ss.sub.cancel_at_period_end===true;
  // Event-type semantics are authoritative for invoice failures. Never turn a
  // failed-payment notification into a grant because a later invoice is paid.
  // Ignore stale/non-latest invoices rather than revoking a newer paid period.
  if(['invoice.paid','invoice.payment_failed','invoice.payment_action_required'].includes(e.type)){
   if(!ss.latest||ss.latest.id!==obj.id)return null;
   if(e.type==='invoice.payment_failed'||e.type==='invoice.payment_action_required'){
    if(ss.latest.status==='paid')return null;
    x.p_action='subscription_past_due';return x;
   }
   if(ss.latest.status!=='paid')return null;
  }
  if(e.type==='customer.subscription.deleted'){
   if(ss.sub.status!=='canceled')return null;
   x.p_action='subscription_canceled';return x;
  }
  x.p_action=['canceled','unpaid','incomplete_expired'].includes(ss.sub.status)?'subscription_canceled':
    ss.sub.status==='active'&&ss.latest?.status==='paid'?'subscription_active':'subscription_past_due';
  return x;
 }
 if(e.type==='charge.refunded'||e.type==='charge.dispute.created'){
  let id=e.type==='charge.refunded'?obj.id:obj.charge;
  if(!ident(id,'ch'))return null;
  const charge=await getStripe(c,'charges/'+encodeURIComponent(id));
  if(!ident(charge.payment_intent,'pi')||charge.livemode!==true)return null;
  if(e.type==='charge.refunded'&&charge.amount_refunded<charge.amount)return null; // partial refund requires manual review
  x.p_payment_intent_id=charge.payment_intent;
  const pi=await getStripe(c,'payment_intents/'+encodeURIComponent(charge.payment_intent));
  if(!ident(pi.id,'pi')||pi.livemode!==true)return null;
  // A full refund of the latest subscription invoice suspends only THAT subscription.
  // Never revoke a newer paid period due to a late refund for an older invoice.
  const invoiceId=typeof charge.invoice==='string'?charge.invoice:(typeof pi.invoice==='string'?pi.invoice:pi.invoice?.id);
  if(ident(invoiceId,'in')){
    const iv=await getStripe(c,'invoices/'+encodeURIComponent(invoiceId));
    const sid=typeof iv.subscription==='string'?iv.subscription:iv.parent?.subscription_details?.subscription;
    if(ident(sid,'sub')){
      const ss=await subscription(c,sid);
      if(!ss||ss.latest?.id!==invoiceId)return null;
      x.p_session_id=null;x.p_subscription_id=sid;x.p_price_id=ss.price;
      x.p_invoice_id=invoiceId;x.p_period_end=ss.end;x.p_currency=charge.currency;
      x.p_action=e.type==='charge.refunded'?'subscription_refunded':'subscription_disputed';return x;
    }
  }
  const sessions=await getStripe(c,'checkout/sessions?payment_intent='+encodeURIComponent(pi.id)+'&limit=2');
  const session=sessions.data?.[0];if(!session||sessions.data?.length!==1||!ident(session.id,'cs_live'))return null;
  if(!tagged(session.metadata,true))return null;
  const lines=await getStripe(c,'checkout/sessions/'+encodeURIComponent(session.id)+'/line_items?limit=2');
  if(lines.data?.length!==1)return null;
  x.p_session_id=session.id;x.p_price_id=lines.data[0].price?.id;x.p_currency=charge.currency;
  x.p_action=e.type==='charge.refunded'?'payment_refunded':'payment_disputed';return x;
 }
 return null;
}
// Independent, deliberately non-entitling signed QA event, accepted while the
// GU58 customer fulfillment switches remain OFF. It uses the same LIVE signing
// secret and production destination, but never calls any Supabase grant RPC.
async function verifyOwnerZeroQA(request,e,raw){
 if(e.GU71_ZERO_LIVE_QA_ENABLED!=='true')return null;
 const secret=v(e.GU58_STRIPE_LIVE_WEBHOOK_SECRET),key=v(e.GU58_STRIPE_LIVE_SECRET_KEY),
  accountId=v(e.GU58_STRIPE_LIVE_ACCOUNT_ID),priceId=v(e.GU71_ZERO_LIVE_PRICE_ID);
 if(!/^whsec_[A-Za-z0-9_]+$/.test(secret)||!/^sk_live_[A-Za-z0-9_]+$/.test(key)||
    !ident(accountId,'acct')||!ident(priceId,'price'))return null;
 if(!await checkHmac(raw,request.headers.get('stripe-signature'),secret))return null;
 let event;try{event=JSON.parse(raw)}catch{return null}
 if(!event||typeof event!=='object'||Array.isArray(event))return null;
 if(event.type!=='checkout.session.completed'||event.data?.object?.metadata?.gu71_zero_qa!=='true')return null;
 const obj=event.data.object;
 if(event.livemode!==true||!ident(event.id,'evt')||!Number.isSafeInteger(event.created)||
    (event.account!==undefined&&event.account!==accountId)||!ident(obj.id,'cs_live'))
  return resp('Invalid Owner zero QA event',503);
 try{
  const c={stripe:key},acct=await getStripe(c,'account');
  if(acct.id!==accountId)throw Error('wrong_account');
  const session=await getStripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
  const meta=session.metadata||{},uid=meta.gu71_owner;
  if(session.id!==obj.id||session.livemode!==true||session.mode!=='payment'||
     session.status!=='complete'||session.amount_total!==0||session.amount_subtotal!==0||
     session.payment_intent!=null||session.subscription!=null||session.currency!=='usd'||
     meta.gu71_zero_qa!=='true'||meta.gu71_price_id!==priceId||
     !uuid(uid)||session.client_reference_id!==uid||
     'gu58_intent' in meta||'gu58_member' in meta)throw Error('unexpected_session');
  const lines=await getStripe(c,'checkout/sessions/'+encodeURIComponent(session.id)+'/line_items?limit=2');
  if(lines.data?.length!==1||lines.data[0].price?.id!==priceId||
     lines.data[0].quantity!==1||lines.data[0].amount_total!==0)throw Error('unexpected_line_items');
  // A completed 0-cent Checkout still requires a provider-delivered signed
  // event before recording the batch as verified. Do not grant any entitlement.
  if(meta.gu71_batch_id){
   const batch=meta.gu71_batch_id,base=v(e.SUPABASE_URL).replace(/\/$/,''),
     key=v(e.SUPABASE_SECRET_KEY);
   if(!uuid(batch)||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!key)
    throw Error('qa_batch_invalid_config');
   const h={apikey:key,...(key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+key}),
    'content-type':'application/json',prefer:'return=representation'};
   const url=base+'/rest/v1/gu_owner_zero_live_batches_v1?id=eq.'+encodeURIComponent(batch)+
    '&owner_id=eq.'+encodeURIComponent(uid)+'&stripe_session_id=eq.'+encodeURIComponent(session.id);
   const response=await fetch(url,{method:'PATCH',headers:h,cache:'no-store',
    body:JSON.stringify({signed_webhook_event_id:event.id,signed_webhook_verified_at:new Date().toISOString()})});
   const records=response.ok?await response.json().catch(()=>null):null;
   if(!Array.isArray(records)||records.length!==1||records[0].stripe_session_id!==session.id)
    throw Error('qa_batch_signature_evidence_not_stored');
  }
  return resp('qa-zero-signed-verified-no-grant',200);
 }catch{return resp('Zero QA webhook verification unavailable; retry',503)}
}
// For an exact $0.00 LIVE payment-mode Checkout, Stripe may report either
// payment_status='no_payment_required' or 'paid' (confirmed from the Owner's
// real $0 Checkout). The signed event, fetched Stripe session, price, totals,
// payment_intent=null and subscription=null remain mandatory; reject unpaid.
// GU72: A real FREE member can validate LIVE Checkout + a signed membership
// change, but only through this separate $0 QA Price and a service-only expiring
// grant RPC. It is NOT a GU58 paid payment, Subscription or Managed Payments event.
async function storeZeroMonthlyQA(request,e,raw){
 let event;try{event=JSON.parse(raw)}catch{return null}
 if(!event||typeof event!=='object'||Array.isArray(event))return null;
 if(event.type!=='checkout.session.completed'||
    event.data?.object?.metadata?.gu72_zero_monthly_qa!=='true')return null;
 if(e.GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED!=='true')
   return resp('Zero monthly QA fulfillment not enabled; retry',503);
 const secret=v(e.GU58_STRIPE_LIVE_WEBHOOK_SECRET),key=v(e.GU58_STRIPE_LIVE_SECRET_KEY),
       account=v(e.GU58_STRIPE_LIVE_ACCOUNT_ID),priceId=v(e.GU71_ZERO_LIVE_PRICE_ID),
       productId=v(e.GU71_ZERO_LIVE_PRODUCT_ID),allowed=v(e.GU72_QA_ALLOWED_USER_ID),
       base=v(e.SUPABASE_URL).replace(/\/$/,''),
       service=v(e.SUPABASE_SECRET_KEY);
 if(!/^whsec_[A-Za-z0-9_]+$/.test(secret)||!/^sk_live_[A-Za-z0-9_]+$/.test(key)||
    !ident(account,'acct')||!ident(priceId,'price')||!ident(productId,'prod')||
    !uuid(allowed)||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!service)
   return resp('Zero QA configuration incomplete; retry',503);
 if(!await checkHmac(raw,request.headers.get('stripe-signature'),secret))
   return resp('Invalid signature',401);
 const obj=event.data.object;
 if(event.livemode!==true||!ident(event.id,'evt')||!Number.isSafeInteger(event.created)||
   (event.account!==undefined&&event.account!==account)||!ident(obj.id,'cs_live'))
   return resp('Invalid LIVE QA event',503);
 try{
  const c={stripe:key};
  const [a,s,p]=await Promise.all([
   getStripe(c,'account'),
   getStripe(c,'checkout/sessions/'+encodeURIComponent(obj.id)),
   getStripe(c,'prices/'+encodeURIComponent(priceId))
  ]);
  const uid=s.metadata?.gu72_member_id;
  if(a.id!==account||s.id!==obj.id||s.livemode!==true||s.mode!=='payment'||
     s.status!=='complete'||!['no_payment_required','paid'].includes(s.payment_status)||
     s.amount_total!==0||s.amount_subtotal!==0||s.currency!=='usd'||
     s.payment_intent!=null||s.subscription!=null||
     s.metadata?.gu72_zero_monthly_qa!=='true'||
     s.metadata?.gu72_price_id!==priceId||uid!==allowed||
     s.client_reference_id!==uid||
     'gu58_intent' in s.metadata||'gu58_member' in s.metadata||
     p.id!==priceId||p.product!==productId||p.livemode!==true||
     p.active!==true||p.unit_amount!==0||p.currency!=='usd'||p.type!=='one_time')
    throw Error('ZERO_QA_PROVIDER_MISMATCH');
  const lines=await getStripe(c,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2');
  if(lines.data?.length!==1||lines.data[0].price?.id!==priceId||
    lines.data[0].quantity!==1||lines.data[0].amount_total!==0)
    throw Error('ZERO_QA_PRICE_MISMATCH');
  const headers={apikey:service,...(service.startsWith('sb_secret_')?{}:{authorization:'Bearer '+service}),
    'content-type':'application/json'};
  const r=await fetch(base+'/rest/v1/rpc/gu72_signed_zero_monthly_grant',{
    method:'POST',headers,body:JSON.stringify({p_user_id:uid,p_session_id:s.id,
      p_event_id:event.id,p_price_id:priceId}),cache:'no-store'});
  if(!r.ok)throw Error('GU72_GRANT_RPC_UNAVAILABLE');
  const result=await r.json();
  if(result?.ok!==true)throw Error('GU72_GRANT_NOT_CONFIRMED');
  return resp('qa-monthly-signed-grant-verified',200);
 }catch{return resp('Zero QA grant processing unavailable; retry',503)}
}

// Independent book event subprocessor: included inline to preserve the verified
// standalone GU58 webhook's data-URL test harness. Only signed GU58 events reach here.
const BOOK_LIVE_PRICE='price_1UVBsDJL0O4GGVBHdqAaP15z';
const BOOK_LIVE_CODE='FOUNDATION_BOOK_1';
const BOOK_LIVE_AMOUNT=1099;
const BOOK_LIVE_OFFERS=Object.freeze({
 'FOUNDATION_BOOK_1':Object.freeze({price:'price_1UVBsDJL0O4GGVBHdqAaP15z',amount:1099}),
 'FOUNDATION_BOOK_2':Object.freeze({price:'price_1UVBsFJL0O4GGVBHP75QJV4N',amount:1099}),
 'FOUNDATION_BOOK_3':Object.freeze({price:'price_1UVBsLJL0O4GGVBH37PPBw4s',amount:1199}),
 'DAY_TRADING_BOOK_1':Object.freeze({price:'price_1UVBsPJL0O4GGVBH1cdsLBT3',amount:1499}),
 'READING_THE_TAPE':Object.freeze({price:'price_1UVBsSJL0O4GGVBHjElhhG8W',amount:1499})
});

function bookTag(s){
 const m=s?.metadata||{},has=Object.keys(m).some(k=>k.startsWith('gu_book_live_'));
 if(!has)return null;
 const offer=BOOK_LIVE_OFFERS[m.gu_book_live_code];
 if(!offer||!uuid(m.gu_book_live_intent)||!uuid(m.gu_book_live_member)||
  s.client_reference_id!==m.gu_book_live_intent)
  throw Error('Book intent metadata invalid');
 return {id:m.gu_book_live_intent,user:m.gu_book_live_member,offer,code:m.gu_book_live_code};
}
async function bookApply(c,data){
 const req=await fetch(c.base+'/rest/v1/rpc/gu_book_live_apply_v1',{
  method:'POST',cache:'no-store',
  headers:{apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),
   'content-type':'application/json'},
  body:JSON.stringify(data)});
 if(!req.ok)throw Error('Book payment ledger rejected event: '+req.status);
 const output=await req.json();
 if(output?.ok!==true)throw Error('Book payment not confirmed in database');
}
async function bookVerifiedEvent(c,e){
 const obj=e.data?.object;
 if(!obj)return false;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed','checkout.session.expired'].includes(e.type)){
  const meta=obj.metadata||{};
  if(!Object.keys(meta).some(k=>k.startsWith('gu_book_live_')))return false;
  if(!ident(obj.id,'cs_live'))throw Error('Invalid book LIVE session');
  const s=await getStripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
  if(s.id!==obj.id||s.livemode!==true)throw Error('Book session not LIVE');
  const m=bookTag(s);
  if(!m)throw Error('Unbound book metadata');
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(e.type)){
   if(s.payment_status!=='paid')return true;
   if(s.mode!=='payment'||s.status!=='complete'||s.currency!=='usd'||
    s.amount_subtotal!==m.offer.amount||!ident(s.payment_intent,'pi'))
    throw Error('Unverified paid Book Session');
   const [lines,pi]=await Promise.all([
    getStripe(c,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2'),
    getStripe(c,'payment_intents/'+encodeURIComponent(s.payment_intent))
   ]);
   if(lines.data?.length!==1||lines.has_more===true||
    lines.data[0].price?.id!==m.offer.price||lines.data[0].quantity!==1||
    lines.data[0].amount_subtotal!==m.offer.amount||
    pi.id!==s.payment_intent||pi.livemode!==true||pi.status!=='succeeded'||
    pi.currency!=='usd'||Number(pi.amount_received)<m.offer.amount||
    pi.metadata?.gu_book_live_intent!==m.id||pi.metadata?.gu_book_live_member!==m.user||
    pi.metadata?.gu_book_live_code!==m.code)
    throw Error('Unverified book price or PaymentIntent');
   await bookApply(c,{p_event:e.id,p_id:m.id,p_kind:'paid',p_session:s.id,
    p_pi:pi.id,p_price:m.offer.price,p_amount:m.offer.amount});
   return true;
  }
  if(e.type==='checkout.session.expired'&&s.status!=='expired')return true;
  await bookApply(c,{p_event:e.id,p_id:m.id,
   p_kind:e.type==='checkout.session.expired'?'expired':'failed'});
  return true;
 }
 if(!['charge.refunded','charge.dispute.created'].includes(e.type))return false;
 const cid=e.type==='charge.refunded'?obj.id:obj.charge;
 if(!ident(cid,'ch'))return false;
 const charge=await getStripe(c,'charges/'+encodeURIComponent(cid));
 if(charge.id!==cid||charge.livemode!==true||!ident(charge.payment_intent,'pi'))return false;
 const pi=await getStripe(c,'payment_intents/'+encodeURIComponent(charge.payment_intent));
 const intent=pi.metadata?.gu_book_live_intent,member=pi.metadata?.gu_book_live_member;
 if(!intent&&!member)return false;
 if(!uuid(intent)||!uuid(member)||pi.livemode!==true||
    !BOOK_LIVE_OFFERS[pi.metadata?.gu_book_live_code])throw Error('Book refund metadata invalid');
 if(e.type==='charge.refunded'&&Number(charge.amount_refunded)<Number(charge.amount))
  return true; // A partial refund does not automatically revoke full-book access.
 await bookApply(c,{p_event:e.id,p_id:intent,
  p_kind:e.type==='charge.refunded'?'refunded':'disputed',p_pi:pi.id});
 return true;
}

export async function onRequestPost({request,env}){
 let raw;
 try{raw=await boundedStripeBody(request)}
 catch(e){return e?.status===413?resp('Too large',413):resp('Invalid event body',400)}
 const free=await storeZeroMonthlyQA(request,env,raw);
 if(free)return free;
 const qa=await verifyOwnerZeroQA(request,env,raw);
 if(qa)return qa;
 const c=cfg(env);if(!c)return resp('LIVE Stripe fulfillment has not been approved',503);
 if(!await checkHmac(raw,request.headers.get('stripe-signature'),c.secret))return resp('Invalid signature',401);
 let event;try{event=JSON.parse(raw)}catch{return resp('Invalid JSON',400)}
 if(!event||typeof event!=='object'||Array.isArray(event))return resp('Invalid JSON event',400);
 if(event.livemode!==true||!ident(event.id,'evt')||!Number.isSafeInteger(event.created)||
    (event.account!==undefined&&event.account!==c.account))return resp('Invalid LIVE account event',400);
 try{
  const account=await getStripe(c,'account');
  if(account.id!==c.account)throw Error('Unexpected LIVE Stripe merchant account.');
  const bookApplied=await bookVerifiedEvent(c,event);
  if(bookApplied===true)return resp('book-live-verified',200);
    const action=await processEvent(c,event);if(!action)return resp('ignored',200);
  const result=await apply(c,action);if(!result?.ok)throw Error('No verified result');return resp('verified',200);
 }catch{ // Retry on out-of-order events; no silent acknowledgement of failed fulfillment.
  return resp('Fulfillment temporarily unavailable; retry',503);
 }
}
export function onRequestGet(){return resp('POST required',405)}
