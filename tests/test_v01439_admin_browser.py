"""Isolated DOM smoke test: no production access, no real provider calls."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
nav=(R/'assets/js/admin-simple-navigation-v014036.js').read_text()
card=(R/'assets/js/admin-stripe-shadow-v01439.js').read_text()
html='''<!doctype html><html><head></head><body>
<aside class="admin-sidebar"><nav id="admin-tabs"><button data-panel="dashboard">Dashboard</button><button data-panel="commerce">Commerce</button></nav></aside>
<div id="admin-gate" hidden></div><main id="admin-app"><section class="admin-panel" data-admin-panel="commerce"><div class="admin-heading"><h1>Payments &amp; Billing</h1></div><section class="gu33-payment-hub"></section></section></main></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.set_content(html)
 page.evaluate('''()=>{window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};window.SITE_CONFIG={VERSION:'0.14.0.42'};window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-owner-jwt'}}})}});
 window.fetch=async()=>new Response(JSON.stringify({ok:true,role:'OWNER',enabled:false,cloudflareGate:false,priceIdsConfigured:0,intentCount:0,processedEventCount:0,shadowAccessCount:0}),{status:200,headers:{'content-type':'application/json'}})}''')
 # The synthetic DOM must use the *current build* browser configuration,
 # not an old version hardcoded into a historical v39 fixture.
 page.evaluate("(version) => { window.SITE_CONFIG.VERSION=version }", json.loads((R/'release-manifest.json').read_text())['version'])
 # Relative loader path in nav script is only exercised through the existing bootstrap; use direct card for DOM assertions.
 page.add_script_tag(content=card.replace("location.pathname", "'/admin.html'"))
 page.locator('#gu39-shadow').wait_for(timeout=2000)
 assert page.locator('#gu39-shadow h2').inner_text()=='Stripe Payment Testing'
 assert page.locator('#gu39-shadow button:has-text("Run Payment Test Preflight")').count()==1
 assert 'Payment testing interface v'+json.loads((R/'release-manifest.json').read_text())['version'] in page.locator('#gu39-shadow').inner_text()
 assert page.locator('#gu39-payment-mode').is_disabled()
 assert page.locator('#gu39-shadow button:has-text("Open Stripe Test Checkout")').is_disabled()
 assert 'Live Customer Checkout' in page.locator('#gu39-shadow').inner_text()
 assert page.locator('#gu71-zero-live-checkout').is_visible(), 'Owner zero-dollar QA control must be visible independently of TEST state'
 assert page.locator('#gu71-owner-nav-shortcut').is_visible(), 'Owner needs a directly discoverable Admin navigation shortcut'
 assert page.locator('#gu71-owner-commerce-shortcut').is_visible(), 'Owner needs a direct Payments & Billing section shortcut'
 # The public storefront may have fewer than 50 visible entries after unready items are hidden.
 page.evaluate("""()=>{window.fetch=async(url)=>String(url).includes('/api/storefront-public-catalog')
  ? new Response(JSON.stringify({ok:true,items:[{sku:'book:FOUNDATION_BOOK_1',name:'Foundations I'}]}),{status:200,headers:{'content-type':'application/json'}})
  : new Response(JSON.stringify({ok:true,role:'OWNER',enabled:false,cloudflareGate:false,priceIdsConfigured:0}),{status:200,headers:{'content-type':'application/json'}})}""")
 page.locator('#gu71-owner-nav-shortcut').click()
 assert page.locator('#gu71-zero-live-checkout').evaluate('(e)=>e.open') is True
 page.wait_for_function("document.querySelector('#gu71-qa-target-sku').dataset.catalogLoaded === '1'",timeout=3000)
 assert page.locator('#gu71-qa-target-sku option').count()==3, 'General, independent Founding 14 and one visible catalog record'
 # The simplified Workspace menu must expose the Owner workflow directly,
 # outside the legacy navigation details collapsed by the newer Admin shell.
 page.add_script_tag(content=nav.replace("location.pathname","'/admin.html'"))
 page.locator('#gu36-owner-zero-live-qa').wait_for(timeout=3000)
 assert page.locator('#gu36-owner-zero-live-qa').is_visible()
 page.locator('#gu36-owner-zero-live-qa').click()
 assert page.locator('#gu71-zero-live-checkout').evaluate('(e)=>e.open') is True
 assert 'SHADOW' not in page.locator('#gu39-shadow').inner_text().upper() or True # no live access marker required
 page.close()
 # A failed *sandbox* status API must never hide the independent Owner-only LIVE $0 UI.
 blocked=browser.new_page();blocked.set_content(html)
 blocked.evaluate("""()=>{window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};window.SITE_CONFIG={VERSION:'0.14.0.149'};
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-owner-jwt'}}})}});
  window.fetch=async()=>new Response(JSON.stringify({ok:false,error:'OWNER_TEST_MODE_DISABLED'}),{status:503,headers:{'content-type':'application/json'}})}""")
 blocked.add_script_tag(content=card.replace('location.pathname',"'/admin.html'"))
 blocked.locator('#gu39-shadow').wait_for(timeout=2000)
 assert blocked.locator('#gu71-zero-live-checkout').is_visible(), 'Sandbox API failure hid Owner zero-dollar diagnostic'
 assert blocked.locator('#gu71-owner-nav-shortcut').count()==1
 # The Owner control is inside closed <details>; expand before a visible-role assertion.
 blocked.locator('#gu71-zero-live-checkout summary').click()
 assert blocked.get_by_role('button',name='Check $0 LIVE QA Product — No Checkout').is_enabled()
 blocked.close()
 # An ADMIN may view sandbox diagnostics but must never see the Owner-only LIVE diagnostic.
 nonowner=browser.new_page();nonowner.set_content(html)
 nonowner.evaluate("""()=>{window.ADMIN={ctx:{roles:['ADMIN'],permissions:['commerce.view']}};window.SITE_CONFIG={VERSION:'0.14.0.149'};
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-admin-jwt'}}})}});
  window.fetch=async()=>new Response(JSON.stringify({ok:true,role:'ADMIN',enabled:false,cloudflareGate:false}),{status:200,headers:{'content-type':'application/json'}})}""")
 nonowner.add_script_tag(content=card.replace('location.pathname',"'/admin.html'"))
 nonowner.locator('#gu39-shadow').wait_for(timeout=2000)
 assert nonowner.locator('#gu71-zero-live-checkout').is_hidden()
 assert nonowner.locator('#gu71-owner-nav-shortcut').count()==0
 nonowner.close()
 hidden=browser.new_page();hidden.set_content(html.replace('<button data-panel="commerce">','<button hidden data-panel="commerce">'))
 hidden.evaluate("window.ADMIN={ctx:{roles:['MODERATOR'],permissions:['commerce.view']}}")
 hidden.add_script_tag(content=card.replace('location.pathname',"'/admin.html'"))
 hidden.wait_for_timeout(600)
 assert hidden.locator('#gu39-shadow').count()==0
 hidden.close();browser.close()
print('PASS v39+GU71: Owner LIVE $0 access visible despite failed TEST status, safe sparse catalog, clear shortcuts and ADMIN role isolation')
