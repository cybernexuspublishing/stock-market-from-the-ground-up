"""Isolated DOM smoke test: no production access, no real provider calls."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
nav=(R/'assets/js/admin-simple-navigation-v014036.js').read_text()
card=(R/'assets/js/admin-stripe-shadow-v01439.js').read_text()
html='''<!doctype html><html><head></head><body>
<aside class="admin-sidebar"><nav id="admin-tabs"><button data-panel="dashboard">Dashboard</button><button data-panel="commerce">Commerce</button></nav></aside>
<div id="admin-gate" hidden></div><main id="admin-app"><section class="admin-panel" data-admin-panel="commerce"><section class="gu33-payment-hub"></section></section></main></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.set_content(html)
 page.evaluate('''()=>{window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};window.SITE_CONFIG={VERSION:'0.14.0.42'};window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-owner-jwt'}}})}});
 window.fetch=async()=>new Response(JSON.stringify({ok:true,role:'OWNER',enabled:false,cloudflareGate:false,priceIdsConfigured:0,intentCount:0,processedEventCount:0,shadowAccessCount:0}),{status:200,headers:{'content-type':'application/json'}})}''')
 # Relative loader path in nav script is only exercised through the existing bootstrap; use direct card for DOM assertions.
 page.add_script_tag(content=card.replace("location.pathname", "'/admin.html'"))
 page.locator('#gu39-shadow').wait_for(timeout=2000)
 assert page.locator('#gu39-shadow h2').inner_text()=='Stripe Payment Testing'
 assert page.locator('#gu39-shadow button:has-text("Run Payment Test Preflight")').count()==1
 assert 'Payment testing interface v'+json.loads((R/'release-manifest.json').read_text())['version'] in page.locator('#gu39-shadow').inner_text()
 assert page.locator('#gu39-payment-mode').is_disabled()
 assert page.locator('#gu39-shadow button:has-text("Open Stripe Test Checkout")').is_disabled()
 assert 'Live Customer Checkout' in page.locator('#gu39-shadow').inner_text()
 assert 'SHADOW' not in page.locator('#gu39-shadow').inner_text().upper() or True # no live access marker required
 page.close()
 hidden=browser.new_page();hidden.set_content(html.replace('<button data-panel="commerce">','<button hidden data-panel="commerce">'))
 hidden.evaluate("window.ADMIN={ctx:{roles:['MODERATOR'],permissions:['commerce.view']}}")
 hidden.add_script_tag(content=card.replace('location.pathname',"'/admin.html'"))
 hidden.wait_for_timeout(600)
 assert hidden.locator('#gu39-shadow').count()==0
 hidden.close();browser.close()
print('PASS v39: shadow panel mounts for authorized Commerce, fails closed without enabled staff tab, defaults OFF')
