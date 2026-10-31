/* Direct sponsorship invoice V1.
 * Creating/sending is Owner-directed only; this module NEVER charges a card.
 * Each campaign uses stable Stripe idempotency keys to prevent repeat invoices.
 */
const error=(message,status=409)=>Object.assign(new Error(message),{status});
export const validStripeInvoiceUrl=value=>{
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='invoice.stripe.com'&&
  !u.username&&!u.password&&!u.port&&u.pathname.startsWith('/')}catch{return false}
};
export async function issuePaidSponsorInvoice({stripe,api,campaign,advertiser,accountId}){
 const camp=campaign,adv=advertiser;
 if(!Number.isSafeInteger(Number(camp?.id))||!Number.isSafeInteger(Number(adv?.id))||
  Number(camp.advertiser_id)!==Number(adv.id)||camp.status!=='draft'||
  camp.approval_state!=='approved'||camp.payment_state!=='unpaid'||
  !Number.isSafeInteger(Number(camp.amount_cents))||Number(camp.amount_cents)<100||
  !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(adv.contact_email||''))||
  adv.status!=='active'||!camp.package_code)
   throw error('Approved paid campaign, active verified advertiser and an agreed amount of at least $1 are required.');
 const number=Number(camp.id),amount=Number(camp.amount_cents);
 const base='smfgu-ad-'+number+'-v1';
 const account=await stripe('account');
 if(account.id!==accountId)throw error('Stripe LIVE billing account does not match the website merchant.',503);
 let customerId=String(camp.stripe_customer_id||'');
 if(!customerId){
  const customer=await stripe('customers',{method:'POST',idempotencyKey:base+'-customer',
   fields:{email:adv.contact_email,name:adv.name,description:'SMFGU sponsored advertising contract '+number,
    'metadata[ad_campaign_id]':String(number),'metadata[advertiser_id]':String(adv.id)}});
  if(customer.livemode!==true||!/^cus_[A-Za-z0-9_]{6,}$/.test(customer.id||''))throw error('Stripe customer creation could not be verified.',503);
  customerId=customer.id;
 }
 let invId=String(camp.stripe_invoice_id||'');
 if(!invId){
  const invoice=await stripe('invoices',{method:'POST',idempotencyKey:base+'-invoice',
   fields:{customer:customerId,currency:'usd',collection_method:'send_invoice',
    days_until_due:'14',auto_advance:'false',pending_invoice_items_behavior:'exclude',
    description:'The Stock Market: From the Ground Up · '+camp.name,
    'metadata[ad_campaign_id]':String(number),'metadata[advertiser_id]':String(adv.id),
    'metadata[package_code]':camp.package_code,'metadata[approved_quote_cents]':String(amount)}});
  if(invoice.livemode!==true||invoice.customer!==customerId||invoice.status!=='draft'||
    !/^in_[A-Za-z0-9_]{6,}$/.test(invoice.id||''))throw error('Stripe draft invoice could not be verified.',503);
  invId=invoice.id;
  // Persist the draft immediately so retries and staff can recover in Stripe.
  const saved=await api('ad_campaigns?id=eq.'+number+'&stripe_invoice_id=is.null',{
   method:'PATCH',body:{stripe_invoice_id:invId,stripe_customer_id:customerId}});
  if(!Array.isArray(saved)||saved.length!==1)throw error('Invoice created in Stripe but its database binding was not recorded; review before retry.',503);
 }
 const current=await stripe('invoices/'+encodeURIComponent(invId));
 if(current.id!==invId||current.livemode!==true||current.customer!==customerId||
  current.metadata?.ad_campaign_id!==String(number)||current.metadata?.advertiser_id!==String(adv.id)||
  Number(current.metadata?.approved_quote_cents)!==amount||
  current.collection_method!=='send_invoice'||current.currency!=='usd')
  throw error('Stripe invoice identity, collection method or agreed price does not match.',409);
 if(current.status==='draft'){
  await stripe('invoiceitems',{method:'POST',idempotencyKey:base+'-item',
   fields:{customer:customerId,invoice:invId,currency:'usd',amount:String(amount),
    description:'Approved '+camp.package_code+' advertising campaign: '+camp.name,
    'metadata[ad_campaign_id]':String(number)}});
  const finalized=await stripe('invoices/'+encodeURIComponent(invId)+'/finalize',
   {method:'POST',idempotencyKey:base+'-finalize',fields:{auto_advance:'false'}});
  if(finalized.status!=='open'||finalized.total!==amount||finalized.amount_due!==amount)
   throw error('Invoice total differs from the approved campaign amount; do not send it.',409);
 }
 const ready=await stripe('invoices/'+encodeURIComponent(invId));
 if(ready.status!=='open'||ready.total!==amount||ready.amount_due!==amount||
   ready.livemode!==true||!validStripeInvoiceUrl(ready.hosted_invoice_url))
  throw error('LIVE invoice has an unexpected status, total or hosted payment link.',409);
 // This is the explicit customer-email action, not an automatic billing side effect.
 if(!camp.stripe_invoice_sent_at){
  const sent=await stripe('invoices/'+encodeURIComponent(invId)+'/send',{
   method:'POST',idempotencyKey:base+'-email'});
  if(sent.id!==invId||!['open','paid'].includes(sent.status)||
     !validStripeInvoiceUrl(sent.hosted_invoice_url))throw error('Stripe invoice email could not be verified.',503);
 }
 // Restore standard Stripe payment reconciliation only after the Owner-directed
 // invoice has been explicitly sent. Draft creation never collects money.
 const reconciled=await stripe('invoices/'+encodeURIComponent(invId),{
  method:'POST',idempotencyKey:base+'-enable-reconciliation',fields:{auto_advance:'true'}});
 if(reconciled.id!==invId||reconciled.livemode!==true||
   !['open','paid'].includes(reconciled.status))
  throw error('Stripe invoice reconciliation could not be verified.',503);
 const saved=await api('ad_campaigns?id=eq.'+number+'&stripe_invoice_id=eq.'+encodeURIComponent(invId),{
  method:'PATCH',body:{stripe_invoice_url:ready.hosted_invoice_url,stripe_invoice_sent_at:new Date().toISOString(),
   stripe_customer_id:customerId}});
 if(!Array.isArray(saved)||saved.length!==1)throw error('Invoice sent, but tracking could not be saved; review in Stripe.',503);
 return {invoiceId:invId,invoiceUrl:ready.hosted_invoice_url,amountCents:amount,
  advertiserId:Number(adv.id),campaignId:number,deliveryEnabled:false,livemode:true};
}
