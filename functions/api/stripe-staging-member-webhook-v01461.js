/* v0.14.0.61 | Independent TEST staging Stripe webhook candidate. Disabled by default.
 * Staging preview can grant staging-only memberships, never production access. Signed, provider-verified
 * events alone may invoke the service-only SQL entitlement ledger, after launch.
 * IMPORTANT: webhook processing continues for existing paid subscriptions even if
 * new TEST checkouts are later disabled by the Owner.
 */
const STAGING_PRODUCTION_REF='oxihglyfgzywsupnyicb';
function stagingBoundary(e,req){
 try{
  const host=new URL(req.url).hostname.toLowerCase();
  const expected=String(e.GU61_STAGING_HOSTNAME||'').trim().toLowerCase();
  const ref=String(e.GU61_STAGING_PROJECT_REF||'').trim();
  const base=String(e.SUPABASE_URL||'').trim().replace(/\/$/,'');
  return e.GU61_STAGING_ENABLED==='true' && e.GU61_STAGING_APPROVED==='true' &&
    /^[a-z0-9]{20}$/.test(ref) && ref!==STAGING_PRODUCTION_REF &&
    base==='https://'+ref+'.supabase.co' && host===expected &&
    /^[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/.test(host);
 }catch{return false}
}
const resp=(text,status=200)=>new Response(text,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const v=x=>String(x??'').trim();
function cfg(e,request){if(!stagingBoundary(e,request))return null;
 const base=v(e.SUPABASE_URL).replace(/\/$/,'');
 if(e.GU61_STAGING_WEBHOOK_ENABLED!=='true'||e.GU61_STAGING_FULFILLMENT_APPROVED!=='true'||
    e.GU61_STAGING_DB_CONTRACT_APPROVED!=='true'||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
    !v(e.SUPABASE_SECRET_KEY)||!/^sk_test_[A-Za-z0-9_]+$/.test(v(e.GU61_STRIPE_TEST_SECRET_KEY))||
    !/^whsec_[A-Za-z0-9_]+$/.test(v(e.GU61_STRIPE_TEST_WEBHOOK_SECRET))||
    !/^acct_[A-Za-z0-9_]{6,}$/.test(v(e.GU61_STRIPE_TEST_ACCOUNT_ID)))return null;
 return {base,key:v(e.SUPABASE_SECRET_KEY),stripe:v(e.GU61_STRIPE_TEST_SECRET_KEY),
   secret:v(e.GU61_STRIPE_TEST_WEBHOOK_SECRET),account:v(e.GU61_STRIPE_TEST_ACCOUNT_ID)};
}
async function checkHmac(raw,header,secret){const elements=String(header||'').split(',').map(x=>x.trim().split('='));const ts=elements.find(x=>x[0]==='t')?.[1],time=Number(ts);
 if(!Number.isSafeInteger(time)||Math.abs(Date.now()/1000-time)>300)return false;
 const sigs=elements.filter(x=>x[0]==='v1'&&/^[0-9a-f]{64}$/i.test(x[1]||'')).map(x=>x[1]);if(!sigs.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw)));
 let good=false;for(const s of sigs){let mismatch=0;for(let i=0;i<32;i++)mismatch|=digest[i]^parseInt(s.slice(i*2,i*2+2),16);good=good||(mismatch===0)}return good;}
async function getStripe(c,path){const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+c.stripe},cache:'no-store'});if(!r.ok)throw Error('stripe:'+r.status);
 const j=await r.json();if(!j||j.error)throw Error('stripe:invalid');return j;}
async function apply(c,x){const r=await fetch(c.base+'/rest/v1/rpc/gu61_staging_stripe_apply_event',{method:'POST',headers:{apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),'content-type':'application/json'},body:JSON.stringify(x),cache:'no-store'});
 if(!r.ok)throw Error('supabase:'+r.status+':'+(await r.text()).slice(0,140));return await r.json();}
const ident=(x,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{4,150}$').test(v(x));
const iso=unix=>new Date(unix*1000).toISOString();
const actionBase=e=>({p_cancel_at_period_end:false,p_event_id:e.id,p_session_id:null,p_subscription_id:null,p_payment_intent_id:null,p_price_id:null,p_amount_cents:null,p_currency:'usd',p_period_end:null,p_stripe_created:iso(e.created),p_invoice_id:null});
async function invoice(c,sub){const id=typeof sub.latest_invoice==='string'?sub.latest_invoice:sub.latest_invoice?.id;if(!ident(id,'in'))return null;
 return getStripe(c,'invoices/'+encodeURIComponent(id));}
async function subscription(c,id){const sub=await getStripe(c,'subscriptions/'+encodeURIComponent(id));
 if(sub.id!==id||sub.livemode!==false)throw Error('subscription:environment');
 const item=sub.items?.data?.[0];if(sub.items?.data?.length!==1||!ident(item?.price?.id,'price'))throw Error('subscription:price');
 const end=item.current_period_end||sub.current_period_end;
 if(!Number.isSafeInteger(end))throw Error('subscription:period');
 return {sub,price:item.price.id,end:iso(end),latest:await invoice(c,sub)};
}
async function verifyBoundSession(c,s,line){
 if(s.livemode!==false||!ident(s.id,'cs_live')||s.currency!=='usd'||
    !/^\d{1,6}$/.test(String(line?.quantity||''))||line.quantity!==1||
    !ident(line?.price?.id,'price'))throw Error('session:provider_mismatch');
 const reference=s.client_reference_id,meta=s.metadata||{};
 if(!/^[0-9a-f-]{36}$/i.test(reference||'')||meta.gu61_intent!==reference)
  throw Error('session:intent_mismatch');
 const r=await fetch(c.base+'/rest/v1/gu61_staging_checkout_intents?select=id,user_id,price_id,quoted_amount_cents,stripe_session_id,status'+
  '&id=eq.'+encodeURIComponent(reference)+'&limit=2',{headers:{
   apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key})
  },cache:'no-store'});
 if(!r.ok)throw Error('session:intent_db_unavailable');
 const matches=await r.json();
 if(!Array.isArray(matches)||matches.length!==1||
   matches[0].price_id!==line.price.id||
   meta.gu61_member!==matches[0].user_id||
   !Number.isSafeInteger(matches[0].quoted_amount_cents)||
   s.amount_subtotal!==matches[0].quoted_amount_cents)
    throw Error('session:intent_binding_failed');
 const record=matches[0];
 if(record.stripe_session_id===null&&record.status==='prepared'){
  // An earlier successful Stripe CREATE may have suffered a network/DB PATCH
  // failure. Recover only the exact provider-verified original intent,
  // never create another transaction or grant access from this binding RPC.
  const binding=await fetch(c.base+'/rest/v1/rpc/gu61_staging_bind_verified_checkout',{
   method:'POST',headers:{
    apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),
    'content-type':'application/json'
   },body:JSON.stringify({
    p_intent_id:reference,p_user_id:meta.gu61_member,p_session_id:s.id,
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
  if(s.id!==obj.id||s.livemode!==false)throw Error('session:environment');
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
    const ss=await subscription(c,s.subscription);x.p_subscription_id=s.subscription;x.p_period_end=ss.end;x.p_price_id=ss.price;
    x.p_amount_cents=ss.latest?.amount_paid??null;x.p_invoice_id=ss.latest?.id||null;
    x.p_cancel_at_period_end=ss.sub.cancel_at_period_end===true; x.p_action=ss.sub.status==='active'&&ss.latest?.status==='paid'?'subscription_active':'subscription_past_due';
    return x;
  }
  return null;
 }
 if(['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted'].includes(e.type)){
  let id;if(e.type.startsWith('invoice.')){
    if(!ident(obj.id,'in'))throw Error('invoice:id');
    const iv=await getStripe(c,'invoices/'+encodeURIComponent(obj.id));
    id=typeof iv.subscription==='string'?iv.subscription:iv.parent?.subscription_details?.subscription;
  }else id=obj.id;
  if(!ident(id,'sub'))return null;
  const ss=await subscription(c,id);x.p_subscription_id=id;x.p_price_id=ss.price;x.p_period_end=ss.end;
  x.p_amount_cents=ss.latest?.amount_paid??null;x.p_invoice_id=ss.latest?.id||null;
  x.p_cancel_at_period_end=ss.sub.cancel_at_period_end===true;
  // Event-type semantics are authoritative for invoice failures. Never turn a
  // failed-payment notification into a grant because a later invoice is paid.
  // Ignore stale/non-latest invoices rather than revoking a newer paid period.
  if(e.type==='invoice.paid'||e.type==='invoice.payment_failed'){
   if(!ss.latest||ss.latest.id!==obj.id)return null;
   if(e.type==='invoice.payment_failed'){
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
  if(!ident(charge.payment_intent,'pi')||charge.livemode!==false)return null;
  if(e.type==='charge.refunded'&&charge.amount_refunded<charge.amount)return null; // partial refund requires manual review
  x.p_payment_intent_id=charge.payment_intent;
  const pi=await getStripe(c,'payment_intents/'+encodeURIComponent(charge.payment_intent));
  if(!ident(pi.id,'pi')||pi.livemode!==false)return null;
  // A full refund of the latest subscription invoice suspends only THAT subscription.
  // Never revoke a newer paid period due to a late refund for an older invoice.
  const invoiceId=typeof charge.invoice==='string'?charge.invoice:(typeof pi.invoice==='string'?pi.invoice:pi.invoice?.id);
  if(ident(invoiceId,'in')){
    const iv=await getStripe(c,'invoices/'+encodeURIComponent(invoiceId));
    const sid=typeof iv.subscription==='string'?iv.subscription:iv.parent?.subscription_details?.subscription;
    if(ident(sid,'sub')){
      const ss=await subscription(c,sid);
      if(ss.latest?.id!==invoiceId)return null;
      x.p_session_id=null;x.p_subscription_id=sid;x.p_price_id=ss.price;
      x.p_invoice_id=invoiceId;x.p_period_end=ss.end;x.p_currency=charge.currency;
      x.p_action=e.type==='charge.refunded'?'subscription_refunded':'subscription_disputed';return x;
    }
  }
  const sessions=await getStripe(c,'checkout/sessions?payment_intent='+encodeURIComponent(pi.id)+'&limit=2');
  const session=sessions.data?.[0];if(!session||sessions.data?.length!==1||!ident(session.id,'cs_live'))return null;
  const lines=await getStripe(c,'checkout/sessions/'+encodeURIComponent(session.id)+'/line_items?limit=2');
  if(lines.data?.length!==1)return null;
  x.p_session_id=session.id;x.p_price_id=lines.data[0].price?.id;x.p_currency=charge.currency;
  x.p_action=e.type==='charge.refunded'?'payment_refunded':'payment_disputed';return x;
 }
 return null;
}
export async function onRequestPost({request,env}){
 const c=cfg(env,request);if(!c)return resp('TEST staging Stripe fulfillment has not been approved',503);
 if(Number(request.headers.get('content-length')||0)>262144)return resp('Too large',413);
 const raw=await request.text();if(new TextEncoder().encode(raw).length>262144)return resp('Too large',413);
 if(!await checkHmac(raw,request.headers.get('stripe-signature'),c.secret))return resp('Invalid signature',401);
 let event;try{event=JSON.parse(raw)}catch{return resp('Invalid JSON',400)}
 if(event.livemode!==false||!ident(event.id,'evt')||!Number.isSafeInteger(event.created)||
    (event.account!==undefined&&event.account!==c.account))return resp('Invalid LIVE account event',400);
 try{
  const account=await getStripe(c,'account');
  if(account.id!==c.account)throw Error('Unexpected TEST staging Stripe merchant account.');
  const action=await processEvent(c,event);if(!action)return resp('ignored',200);
  const result=await apply(c,action);if(!result?.ok)throw Error('No verified result');return resp('verified',200);
 }catch{ // Retry on out-of-order events; no silent acknowledgement of failed fulfillment.
  return resp('Fulfillment temporarily unavailable; retry',503);
 }
}
export function onRequestGet(){return resp('POST required',405)}
