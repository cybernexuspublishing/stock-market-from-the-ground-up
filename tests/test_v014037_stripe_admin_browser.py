"""Browser proof: Stripe catalog is discoverable only within authorized Admin commerce and preserves legacy controls."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
src=(R/'assets/js/admin-stripe-catalog-v01437.js').read_text()
registry=json.loads((R/'data/stripe-product-registry-v01437.json').read_text())
html='''<!doctype html><html lang="en"><body>
<section id="admin-gate" hidden></section><main id="admin-app"><section class="admin-panel active" data-admin-panel="commerce">
<div class="admin-heading"><h1>Payments & Billing</h1></div>
<div class="gu33-payment-hub"><div class="gu33-legacy-warning">Old billing editor remains</div></div>
<button id="original-save">Original settings unchanged</button></section></main>
<div id="admin-tabs"><button data-panel="commerce">Commerce</button><button data-panel="community">Market Commons</button></div>
</body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content(html)
 page.evaluate('''(data)=>{window.fetch=async(url)=>String(url).includes('stripe-product-registry')?new Response(JSON.stringify(data),{status:200}):new Response(JSON.stringify({ok:false,error:'Demo no credentials'}),{status:403});
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'demo'}}})}}); }''',registry)
 page.evaluate('''(source)=>{const location={pathname:'/admin.html'};eval(source)}''',src)
 page.locator('#gu37-stripe-catalog tbody tr').first.wait_for(timeout=8500)
 assert page.locator('#gu37-stripe-catalog tbody tr').count()==8
 assert page.locator('#original-save').count()==1
 assert page.locator('#gu37-stripe-catalog').inner_text().count('Not connected — need price_ ID')==8
 assert page.locator('.gu33-legacy-warning').count()==1
 page.close()
 page=browser.new_page()
 page.set_content(html.replace('<button data-panel="commerce">Commerce</button>','<button data-panel="commerce" hidden>Commerce</button>'))
 page.evaluate('''(data)=>{window.fetch=async()=>new Response(JSON.stringify(data),{status:200})}''',registry)
 page.evaluate('''(source)=>{const location={pathname:'/admin.html'};eval(source)}''',src)
 page.wait_for_timeout(1500)
 assert page.locator('#gu37-stripe-catalog').count()==0
 page.close();browser.close()
print('PASS: Stripe catalog eight rows and missing prices, existing controls preserved, unauthorized menu cannot mount the panel')
