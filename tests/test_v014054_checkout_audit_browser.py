"""v54: checkout button is locked until the separate read-only safety audit passes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
script=(R/'assets/js/admin-stripe-shadow-v01439.js').read_text()
html='''<!doctype html><html><body>
<div id="admin-gate" hidden></div>
<div id="admin-app"><section class="admin-panel" data-admin-panel="commerce">
<div class="gu33-payment-hub"></div></section></div></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content(html)
 page.evaluate("""()=> {
  window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};
  window.mock={writes:0,readAudits:0};
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-jwt'}}})}});
  window.fetch=async(url,opts={})=>{
   const location=String(url);
   if(opts.method==='POST'){window.mock.writes++;throw Error('No Stripe payments allowed in this test!');}
   if(location.includes('view=checkout-safety')){
    window.mock.readAudits++;
    return new Response(JSON.stringify({ok:true,sku:'plan:FULL_MONTHLY',passed:9,total:9,
     safeToAttemptTest:true,checks:Array.from({length:9},(_,i)=>({name:'Check '+i,status:'PASS',detail:'Mock test pass'}))}),{status:200});
   }
   if(location.includes('view=catalog'))return new Response(JSON.stringify({
    ok:true,allVerified:true,productsVerified:8,pricesVerified:8,rows:[]}),{status:200});
   return new Response(JSON.stringify({ok:true,role:'OWNER',enabled:true,cloudflareGate:true,
    priceIdsConfigured:8,updatedAt:'2026-10-17T18:00:00Z',intentCount:0,
    processedEventCount:0,shadowAccessCount:0}),{status:200});
  };
 }""")
 page.add_script_tag(content=script.replace('location.pathname', "'/admin.html'"))
 payment=page.get_by_role('button',name='Open Stripe Test Checkout')
 payment.wait_for(timeout=5000)
 assert payment.is_disabled()
 page.locator('#gu39-shadow details.gu39-advanced-controls summary').click()
 page.get_by_role('button',name='Verify All 8 Sandbox Products').click()
 page.get_by_text('Products: 8 / 8 verified').wait_for(timeout=5000)
 assert payment.is_disabled(),'Catalog verification is not sufficient!'
 page.get_by_role('button',name='Audit Checkout — No Payment').click()
 page.get_by_text('Pre-payment safety audit: 9 / 9 checks passed').wait_for(timeout=5000)
 assert payment.is_enabled(),'Only after full 8 guard audit should test checkout be exposed'
 stats=page.evaluate('window.mock')
 assert stats['readAudits']==1,stats
 assert stats['writes']==0,stats
 page.locator('#gu39-sku').select_option('plan:FULL_ANNUAL')
 assert payment.is_disabled(),'Changing SKU must invalidate the prior safety audit'
 assert 'Payment testing interface v0.14.0.58' in page.locator('#gu39-shadow').inner_text()
 print('PASS v54: no TEST checkout allowed before nine-check read-only safety audit, selected SKU invalidates approval, no writes.')
 browser.close()
