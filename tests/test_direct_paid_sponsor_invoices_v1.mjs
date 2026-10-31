import test from 'node:test';
import assert from 'node:assert/strict';
import {issuePaidSponsorInvoice} from '../functions/_lib/paid-sponsor-invoicing-v1.js';
const accountId='acct_1OxhOiJL0O4GGVBH';
const campaign=()=>({id:55,advertiser_id:7,name:'Educational Platform Sponsorship October',
 status:'draft',approval_state:'approved',payment_state:'unpaid',amount_cents:25000,
 package_code:'SITE_SPONSOR',stripe_invoice_id:null,stripe_customer_id:null,stripe_invoice_sent_at:null});
const advertiser=()=>({id:7,name:'Sample Chart Company',contact_email:'billing@example.com',status:'active'});
function mock({paid=false,wrongTotal=false}={}){
 const calls=[], invoice={id:'in_AbCdEf123456',livemode:true,customer:'cus_AbCdEf123456',
 status:'draft',currency:'usd',collection_method:'send_invoice',total:0,amount_due:0,
 hosted_invoice_url:null,metadata:{ad_campaign_id:'55',advertiser_id:'7',approved_quote_cents:'25000'}};
 const updates=[];
 async function stripe(path,opts={}){
  calls.push({path,method:opts.method||'GET',key:opts.idempotencyKey||null});
  if(path==='account')return {id:accountId};
  if(path==='customers')return {id:'cus_AbCdEf123456',livemode:true};
  if(path==='invoices'&&opts.method==='POST')return {...invoice};
  if(path==='invoiceitems'){assert.equal(opts.fields.invoice,invoice.id);
   assert.equal(opts.fields.amount,'25000');return {id:'ii_AbCdEf123456'};}
  if(path==='invoices/'+invoice.id+'/finalize'){
   invoice.status='open';invoice.total=wrongTotal?24999:25000;
   invoice.amount_due=invoice.total;
   invoice.hosted_invoice_url='https://invoice.stripe.com/i/test_invoice_123';
   return {...invoice};
  }
  if(path==='invoices/'+invoice.id+'/send')return {...invoice};
  if(path==='invoices/'+invoice.id)return {...invoice};
  throw Error('Unexpected Stripe request '+path);
 }
 async function api(path,opts={}){
  if(opts.method==='PATCH'){updates.push({path,...opts.body});return [opts.body]}
  throw Error('Unexpected database request '+path);
 }
 return {calls,updates,stripe,api};
}
test('Owner-issued sponsorship creates and emails one exact-amount LIVE invoice, never publishes advertising',async()=>{
 const m=mock();
 const r=await issuePaidSponsorInvoice({stripe:m.stripe,api:m.api,campaign:campaign(),advertiser:advertiser(),accountId});
 assert.equal(r.invoiceId,'in_AbCdEf123456');assert.equal(r.livemode,true);
 assert.equal(r.amountCents,25000);assert.equal(r.deliveryEnabled,false);
 assert.equal(m.calls.filter(c=>c.path==='invoices'&&c.method==='POST').length,1);
 assert.equal(m.calls.filter(c=>c.path.endsWith('/send')).length,1);
 assert.equal(m.calls.filter(c=>c.path==='invoiceitems').length,1);
 assert.equal(m.updates.length,2);
 assert.equal(m.updates[0].stripe_invoice_id,r.invoiceId);
 assert.match(m.updates[1].stripe_invoice_url,/^https:\/\/invoice\.stripe\.com\//);
 assert(m.calls.filter(c=>c.method==='POST').every(c=>c.key?.startsWith('smfgu-ad-55-v1-')));
 assert(!m.calls.some(c=>/payment_intents|charges|checkout\/sessions/.test(c.path)));
});
test('Reject mismatch in finalized invoice price before sending',async()=>{
 const m=mock({wrongTotal:true});
 await assert.rejects(issuePaidSponsorInvoice({stripe:m.stripe,api:m.api,campaign:campaign(),
  advertiser:advertiser(),accountId}),/Invoice total differs/);
 assert.equal(m.calls.filter(c=>c.path.endsWith('/send')).length,0);
});
test('Reject unapproved campaigns and unqualified advertisers without Stripe operations',async()=>{
 for(const change of [{campaign:{approval_state:'pending'}},{advertiser:{status:'prospect'}},
  {campaign:{amount_cents:0}},{advertiser:{contact_email:''}}]){
  const m=mock(),c={...campaign(),...change.campaign},a={...advertiser(),...change.advertiser};
  await assert.rejects(issuePaidSponsorInvoice({stripe:m.stripe,api:m.api,campaign:c,advertiser:a,accountId}),
   /Approved paid campaign/);
  assert.equal(m.calls.length,0);
 }
});
test('Reject foreign Stripe merchant identity',async()=>{
 const m=mock();
 await assert.rejects(issuePaidSponsorInvoice({stripe:m.stripe,api:m.api,campaign:campaign(),
  advertiser:advertiser(),accountId:'acct_unexpected'}),/account does not match/);
 assert.equal(m.calls.filter(x=>x.method==='POST').length,0);
});
test('Owner UI and billing API retain separate switches and independent invoice verification',async()=>{
 const fs=await import('node:fs');
 const ui=fs.readFileSync('assets/js/admin-ad-sales-v014228.js','utf8');
 const api=fs.readFileSync('functions/api/ad-sales.js','utf8');
 const html=fs.readFileSync('admin-advertising.html','utf8');
 assert.match(ui,/issue_sponsorship_invoice/);
 assert.match(ui,/confirmedWrittenQuote:true/);
 assert.match(ui,/confirmedAdvertiserEmail:true/);
 assert.match(api,/set_paid_sponsorship_billing/);
 assert.match(api,/set_paid_sponsorship_delivery/);
 assert.match(api,/issuePaidSponsorInvoice/);
 assert.match(api,/if\(camp\?\.stripe_invoice_id&&camp\.stripe_invoice_id!==ref\)/);
 assert.match(html,/gu-ad-toggle-paid-billing/);
 assert.match(html,/gu-ad-toggle-paid-delivery/);
});
