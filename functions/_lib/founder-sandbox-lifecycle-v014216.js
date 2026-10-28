/* Founder 600 Stripe Sandbox adapter for the existing verified GU39 webhook.
 * CRITICAL: NEVER writes to LIVE founder member, subscriptions or Sparks tables.
 * Caller already checked Stripe TEST signature, exact TEST account and owner test gate.
 */
const ref=x=>typeof x==='string'?x:x?.id||null;
const valid=(s,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(String(s||''));
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x||'');
const date=n=>Number.isSafeInteger(n)&&n>0?new Date(n*1000).toISOString():null;
const PRICE={FOUNDING_14:{id:'price_1UVDQoJY9FI7byHBuiYDnHrX',amount:2299,days:14,sparks:10},FOUNDING_30:{id:'price_1UUCNbJY9FI7byHBCX2VWdLi',amount:4999,days:30,sparks:15},FOUNDING_60:{id:'price_1UUCNkJY9FI7byHBuh6pT4xd',amount:5999,days:60,sparks:20}};
async function stripe(env,path){
 const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+env.GU39_STRIPE_TEST_SECRET_KEY},cache:'no-store'});
 if(!r.ok)throw Error('SANDBOX_PROVIDER_RETRY');
 const x=await r.json();
 if(!x||x.error||x.livemode!==false)throw Error('SANDBOX_PROVIDER_MODE_MISMATCH');
 return x;
}
function headers(key){
 if(String(key).startsWith('sb_secret_'))return {apikey:key,'content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key||''))
 return {apikey:key,authorization:'Bearer '+key,'content-type':'application/json'};
 throw Error('SANDBOX_DB_SERVICE_KEY_INVALID');
}
async function db(env,path,body){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'')+'/rest/v1/'+path;
 const r=await fetch(url,{method:body?'POST':'GET',headers:headers(env.SUPABASE_SECRET_KEY),body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(!r.ok)throw Error('SANDBOX_LEDGER_RETRY');
 return r.json();
}
async function subFor(env,id){
 if(!valid(id,'sub'))return null;
 const sub=await stripe(env,'subscriptions/'+encodeURIComponent(id));
 const intent=sub.metadata?.f600_qa_intent,tag=sub.metadata?.f600_qa_program;
 if(!intent&&tag!=='FOUNDING600_TEST')return null; // unrelated GU39 sandbox object
 if(!uuid(intent)||tag!=='FOUNDING600_TEST')throw Error('SANDBOX_FOUNDER_METADATA_INCOMPLETE');
 if(!valid(ref(sub.customer),'cus'))throw Error('SANDBOX_FOUNDER_CUSTOMER_INVALID');
 const qa=await db(env,'gu_f600_sandbox_intents_v014215?select=id,plan_code,stripe_subscription_id,stripe_customer_id&id=eq.'+encodeURIComponent(intent)+'&limit=2');
 if(!Array.isArray(qa)||qa.length!==1)throw Error('SANDBOX_FOUNDER_INTENT_NOT_FOUND');
 const plan=PRICE[qa[0].plan_code],item=sub.items?.data?.[0];
 if(!plan||sub.items?.data?.length!==1||ref(item?.price)!==plan.id
 ||item.price?.recurring?.interval!=='day'||item.price?.recurring?.interval_count!==plan.days
 ||item.price?.unit_amount!==plan.amount||item.price?.currency!=='usd'||item.price?.active!==true
 ||(qa[0].stripe_subscription_id&&qa[0].stripe_subscription_id!==sub.id)
 ||(qa[0].stripe_customer_id&&qa[0].stripe_customer_id!==ref(sub.customer)))
 throw Error('SANDBOX_FOUNDER_PRICE_BINDING_INVALID');
 return {sub,intent,plan,qa:qa[0]};
}
async function apply(env,e,ctx,invoice=null,charge=null){
 const p={p_intent:ctx.intent,p_event:e.id,p_kind:e.type,p_subscription:ctx.sub.id,
  p_customer:ref(ctx.sub.customer),p_invoice:invoice?.id||null,p_amount:invoice?.amount_paid??null,
  p_start:null,p_end:null};
 if(e.type==='invoice.paid'){
  if(invoice?.status!=='paid'||invoice.currency!=='usd'||invoice.amount_paid!==ctx.plan.amount
   ||invoice.subtotal!==ctx.plan.amount||invoice.lines?.has_more||invoice.lines?.data?.length!==1)
  throw Error('SANDBOX_FOUNDER_INVOICE_NOT_PAID_EXACTLY');
  const line=invoice.lines.data[0],price=ref(line?.price)||line?.pricing?.price_details?.price;
  if(price!==ctx.plan.id||line.amount!==ctx.plan.amount
    ||!date(line.period?.start)||!date(line.period?.end))
   throw Error('SANDBOX_FOUNDER_INVOICE_LINE_INVALID');
  p.p_start=date(line.period.start);p.p_end=date(line.period.end);
 }
 if(e.type==='charge.refunded'||e.type==='charge.dispute.created'){
  if(!charge||(ref(charge.invoice)&&ref(charge.invoice)!==invoice?.id)||ref(charge.customer)!==ref(ctx.sub.customer)
   ||(e.type==='charge.refunded'&&charge.amount_refunded!==charge.amount))
   throw Error('SANDBOX_FOUNDER_REFUND_SOURCE_INVALID');
 }
 const outcome=await db(env,'rpc/gu_f600_sandbox_apply_v014215',p);
 if(outcome?.ok!==true||outcome.mode!=='SANDBOX')throw Error('SANDBOX_FOUNDER_LEDGER_RETRY');
 return {status:200,body:outcome.replayed?'F600_TEST_REPLAY':'F600_TEST_'+e.type.replaceAll('.','_').toUpperCase()};
}
/* null = another GU39 transaction, response = exclusively Founding sandbox. */
export async function handleFounderSandbox(event,env){
 const type=event?.type;
 if(!['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'].includes(type))return null;
 let inv=null,subId=null,charge=null;
 if(type.startsWith('invoice.')){
  const id=event.data?.object?.id;
  if(!valid(id,'in'))return null;
  inv=await stripe(env,'invoices/'+encodeURIComponent(id));
  subId=ref(inv.subscription)||ref(inv.parent?.subscription_details?.subscription);
  if(!valid(subId,'sub'))return null;
 }else if(type.startsWith('customer.subscription.')){
  subId=event.data?.object?.id;
  if(!valid(subId,'sub'))return null;
 }else{
  const id=type==='charge.refunded'?event.data?.object?.id:ref(event.data?.object?.charge);
  if(!valid(id,'ch'))return null;
  charge=await stripe(env,'charges/'+encodeURIComponent(id));
  let invoiceId=ref(charge.invoice);
  if(!valid(invoiceId,'in')){
    const paymentId=ref(charge.payment_intent);
    if(!valid(paymentId,'pi'))throw Error('SANDBOX_REFUND_PAYMENT_INTENT_REQUIRED');
    // Stripe 2026 Charge.invoice is often omitted; use the authoritative
    // InvoicePayment association instead of silently ignoring a full refund.
    const url='https://api.stripe.com/v1/invoice_payments?payment%5Btype%5D=payment_intent'
      +'&payment%5Bpayment_intent%5D='+encodeURIComponent(paymentId)+'&limit=10';
    const res=await fetch(url,{headers:{authorization:'Bearer '+env.GU39_STRIPE_TEST_SECRET_KEY},cache:'no-store'});
    if(!res.ok)throw Error('SANDBOX_REFUND_INVOICE_LOOKUP_RETRY');
    const list=await res.json();
    if(list.has_more||!Array.isArray(list.data)||list.data.length!==1||
      list.data[0].status!=='paid'||!valid(list.data[0].invoice,'in')||
      list.data[0].payment?.payment_intent!==paymentId)
      throw Error('SANDBOX_REFUND_INVOICE_MAPPING_MISMATCH');
    invoiceId=list.data[0].invoice;
  }
  inv=await stripe(env,'invoices/'+encodeURIComponent(invoiceId));
  subId=ref(inv.subscription)||ref(inv.parent?.subscription_details?.subscription);
  if(!valid(subId,'sub'))return null;
 }
 const context=await subFor(env,subId);
 if(!context)return null;
 // Stripe emits subscription.updated for ordinary renewal/payment metadata too.
 // Only a genuine cancel-at-period-end update may mark the QA seat cancel_scheduled.
 // invoice.paid already advances the active term and Sparks balance.
 if(type==='customer.subscription.updated'&&context.sub.cancel_at_period_end!==true)
  return {status:200,body:'F600_TEST_UPDATE_NO_CANCEL'};
 if(inv&&(ref(inv.subscription)||ref(inv.parent?.subscription_details?.subscription))!==subId)
 throw Error('SANDBOX_FOUNDER_INVOICE_SUBSCRIPTION_MISMATCH');
 return apply(env,event,context,inv,charge);
}
