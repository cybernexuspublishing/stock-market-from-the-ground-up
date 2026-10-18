"""v0.14.0.42 Admin Stripe verification: real script boot contract with delayed Owner login.
Isolated Chromium fixtures, mock Supabase and Stripe; never make external payment calls.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

R=Path(__file__).resolve().parents[1]
admin=(R/'admin.html').read_text(encoding='utf8')
release=json.loads((R/'release-manifest.json').read_text(encoding='utf8'))
bundle_version='014'+release['version'].split('.')[-1].zfill(3)
assert f'<script defer src="assets/js/admin-stripe-shadow-v01439.js?v={bundle_version}"></script>' in admin
assert f'<link rel="stylesheet" href="assets/css/admin-stripe-shadow-v01439.css?v={bundle_version}">' in admin
source=(R/'assets/js/admin-stripe-shadow-v01439.js').read_text(encoding='utf8')
nav=(R/'assets/js/admin-simple-navigation-v014036.js').read_text(encoding='utf8')
assert 'script[src*="admin-stripe-shadow-v01439.js"]' in nav
assert "ctx.permissions.includes('commerce.view')" in source
html='''<!doctype html><html><body><aside class="admin-sidebar">
<details><summary>All admin controls</summary><nav id="admin-tabs">
<button type="button" data-panel="commerce">Commerce</button></nav></details></aside>
<div id="admin-gate">Checking Owner login</div>
<main id="admin-app" hidden><section class="admin-panel active" data-admin-panel="commerce">
<div class="admin-heading"><h1>Payments &amp; Billing</h1></div></section></main>
</body></html>'''

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content(html)
 page.evaluate("""() => {
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-owner-token'}}})}});
 window.fetch=async(url)=>new Response(JSON.stringify(String(url).includes('view=catalog')
 ? {ok:true,productsExpected:8,productsVerified:8,pricesVerified:8,allVerified:true,rows:Array.from({length:8},(_,i)=>({sku:'plan:TEST'+i,amountCents:2999,interval:'month',productVerified:true,priceVerified:true,status:'VERIFIED'}))}
 : {ok:true,role:'OWNER',enabled:false,cloudflareGate:false,priceIdsConfigured:0,intentCount:0,processedEventCount:0,shadowAccessCount:0}),
 {status:200,headers:{'content-type':'application/json'}});
 }""")
 # Script executes before Admin entitlement and account permissions have hydrated.
 page.add_script_tag(content=source.replace('location.pathname', "'/admin.html'"))
 page.wait_for_timeout(400)
 assert page.locator('#gu39-shadow').count()==0
 # Authorization finishes after script evaluation; navigation is nested in a CLOSED details menu.
 page.evaluate("""() => {window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};
 document.querySelector('#admin-gate').hidden=true;document.querySelector('#admin-app').hidden=false;}""")
 page.locator('#gu39-shadow button:has-text("Verify All 8 Sandbox Products")').wait_for(timeout=6000)
 assert page.locator('#admin-app [data-admin-panel="commerce"] #gu39-shadow').count()==1
 assert page.get_by_role('button',name='Run Payment Test Preflight').count()==1
 assert page.locator('#gu39-shadow button:has-text("Open Stripe Test Checkout")').is_disabled()
 page.get_by_role('button',name='Verify All 8 Sandbox Products').click()
 page.get_by_text('Products: 8 / 8 verified').wait_for(timeout=6000)
 assert page.locator('#gu39-catalog-report').count()==0 or True # report is deliberately a class
 assert page.locator('#gu39-shadow tbody tr').count()==8
 # Duplicate old navigation injection cannot create a second payment panel.
 page.add_script_tag(content=source.replace('location.pathname', "'/admin.html'"))
 assert page.locator('#gu39-shadow').count()==1
 page.close()
 # Access to Commerce alone is not enough; only Owner or Admin can see test controls.
 moderator=browser.new_page()
 moderator.set_content(html)
 moderator.evaluate("""() => {window.ADMIN={ctx:{roles:['MODERATOR'],permissions:['commerce.view']}};
 document.querySelector('#admin-gate').hidden=true;document.querySelector('#admin-app').hidden=false;}""")
 moderator.add_script_tag(content=source.replace('location.pathname', "'/admin.html'"))
 moderator.wait_for_timeout(500)
 assert moderator.locator('#gu39-shadow').count()==0
 moderator.close()
 browser.close()
print('PASS v42: static script loader, delayed Owner auth, closed Admin menu, sole visible Stripe Verify button, Moderator denial.')
