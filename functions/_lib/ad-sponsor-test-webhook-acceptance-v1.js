/* Isolated genuine Stripe TEST sponsorship webhook audit.
 * Call only AFTER unified endpoint verifies the raw Stripe HMAC and TEST account.
 * No production entitlements, sponsorship campaigns, billing state or ad delivery.
 */
const tag=(value,prefix)=>new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,}$').test(String(value||''));
const str=x=>typeof x==='string'?x:x?.id||null;
async function stripe(env,path){
 const key=String(env.STRIPE_TEST_SECRET_KEY||env.GU39_STRIPE_TEST_SECRET_KEY||'');
 if(!key.startsWith('sk_test_'))throw Error('SPONSOR_TEST_STRIPE_KEY_UNAVAILABLE');
 const r=await fetch('https://api.stripe.com/v1/'+path,{
  headers:{authorization:'Bearer '+key},cache:'no-store'});
 if(!r.ok)throw Error('SPONSOR_TEST_PROVIDER_UNAVAILABLE');
 return r.json();
}
async function save(env,data){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
    !(secret.startsWith('sb_secret_')||secret.startsWith('eyJ')))
  throw Error('SPONSOR_TEST_DB_UNAVAILABLE');
 const headers={apikey:secret,'content-type':'application/json',
  prefer:'resolution=ignore-duplicates,return=representation'};
 if(secret.startsWith('eyJ'))headers.authorization='Bearer '+secret;
 const r=await fetch(base+'/rest/v1/gu_ad_sponsor_test_webhook_acceptance_v1?on_conflict=event_id',{
  method:'POST',headers,body:JSON.stringify(data),cache:'no-store'});
 if(!r.ok)throw Error('SPONSOR_TEST_EVENT_PERSIST_FAILED');
 return true;
}
export async function acceptSignedSponsorTestEvent(event,env){
 if(!['invoice.paid','charge.refunded','charge.dispute.created'].includes(event?.type))
  return false;
 if(event.livemode!==false||!tag(event.id,'evt'))return false;
 // The actual production TEST endpoint already checked raw-body HMAC, not
 // an event payload supplied by the browser. Reverify provider evidence.
 let invoiceId=null,chargeId=null,piId=null,charge=null,pi=null;
 if(event.type==='invoice.paid'){
  invoiceId=str(event.data?.object?.id);
  if(!tag(invoiceId,'in'))return false;
 }else{
  chargeId=event.type==='charge.refunded'
   ?str(event.data?.object?.id):str(event.data?.object?.charge);
  if(!tag(chargeId,'ch'))return false;
  charge=await stripe(env,'charges/'+encodeURIComponent(chargeId));
  if(charge.id!==chargeId||charge.livemode!==false||charge.paid!==true)return false;
  piId=str(charge.payment_intent);
  if(!tag(piId,'pi'))return false;
  pi=await stripe(env,'payment_intents/'+encodeURIComponent(piId));
  if(pi.id!==piId||pi.livemode!==false||pi.status!=='succeeded'||
     str(pi.latest_charge)!==chargeId||
     str(pi.customer)!==str(charge.customer))return false;
  invoiceId=str(charge.invoice)||str(pi.invoice)||str(pi.payment_details?.order_reference);
  if(!tag(invoiceId,'in'))return false;
 }
 const inv=await stripe(env,'invoices/'+encodeURIComponent(invoiceId));
 if(inv.id!==invoiceId||inv.livemode!==false)return false;
 const md=inv.metadata||{};
 if(md.gu_ad_sponsor_qa!=='true')return false;
 // This is a deliberately narrow noncommercial 100-cent TEST fixture.
 if(inv.currency!=='usd'||inv.collection_method!=='send_invoice'||
    inv.total!==100||inv.status!=='paid'||inv.amount_paid!==100||
    Number(inv.amount_remaining)!==0||md.ad_campaign_id!=='999990'||
    md.advertiser_id!=='999990'||md.approved_quote_cents!=='100')
  throw Error('SPONSOR_TEST_INVOICE_REJECTED');
 if(event.type==='invoice.paid'){
  const allocations=await stripe(env,'invoice_payments?invoice='+encodeURIComponent(invoiceId)+'&limit=10');
  if(allocations.has_more===true||!Array.isArray(allocations.data))
   throw Error('SPONSOR_TEST_INVOICE_ALLOCATION_MISSING');
  const paid=allocations.data.filter(x=>x.status==='paid'&&x.amount_paid===100&&
   tag(str(x.payment?.payment_intent),'pi'));
  if(paid.length!==1)throw Error('SPONSOR_TEST_PAYMENT_NOT_UNIQUE');
  piId=str(paid[0].payment.payment_intent);
  pi=await stripe(env,'payment_intents/'+encodeURIComponent(piId));
  if(pi.id!==piId||pi.status!=='succeeded'||pi.livemode!==false||
     pi.amount_received!==100||str(pi.customer)!==str(inv.customer))
   throw Error('SPONSOR_TEST_PAYMENT_NOT_SETTLED');
  chargeId=str(pi.latest_charge);
  if(!tag(chargeId,'ch'))throw Error('SPONSOR_TEST_CHARGE_MISSING');
  charge=await stripe(env,'charges/'+encodeURIComponent(chargeId));
  if(charge.id!==chargeId||charge.livemode!==false||charge.paid!==true||
     str(charge.payment_intent)!==piId||
     str(charge.customer)!==str(inv.customer))
   throw Error('SPONSOR_TEST_CHARGE_INVALID');
 }else{
  if(str(inv.customer)!==str(pi.customer)||
     str(pi.payment_details?.order_reference)!==invoiceId)
    throw Error('SPONSOR_TEST_CHARGE_NOT_BOUND');
  if(event.type==='charge.refunded'&&!(charge.amount_refunded>0))
   throw Error('SPONSOR_TEST_REFUND_NOT_CONFIRMED');
  if(event.type==='charge.dispute.created'&&charge.disputed!==true)
   throw Error('SPONSOR_TEST_DISPUTE_NOT_CONFIRMED');
 }
 await save(env,{
  event_id:event.id,event_type:event.type,invoice_id:invoiceId,
  payment_intent_id:piId,charge_id:chargeId,
  invoice_total_cents:100,amount_refunded_cents:Number(charge.amount_refunded||0),
  source:'stripe_test_signed',signature_checked:true,stripe_provider_checked:true
 });
 return true;
}
