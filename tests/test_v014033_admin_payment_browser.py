"""Isolated browser contract: payment hub, existing editors intact, global search, no unauthorized injection."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
ROOT=Path(__file__).resolve().parents[1]
SRC=(ROOT/'assets/js/admin-payment-center-v01433.js').read_text()
HTML='''<!doctype html><html><head><meta charset="utf-8"></head><body>
<div class="admin-main"><section id="admin-gate" hidden>Checking</section>
<div id="admin-app"><section class="admin-panel active" data-admin-panel="commerce">
  <div class="admin-heading"><h1>Commerce</h1><p>Old description.</p></div>
  <div class="admin-grid two" id="legacy-finance"><article class="admin-card"><h2>Orders</h2><div id="admin-orders">Original orders editor</div></article></div>
  <section data-gu-managed-r2="1"><h2>Existing Digital Payments — Stripe and Lemon</h2><button id="old-provider-button">Save Existing Provider Setting</button></section>
  <section data-gu-lemon-readiness="1"><h2>Existing Lemon Readiness</h2></section>
</section><section class="admin-panel" data-admin-panel="community">Community</section></div></div>
<div id="admin-tabs"><button data-panel="commerce">Commerce</button><button data-panel="community">Market Commons</button></div>
<script>
window.opens=0;
document.querySelectorAll('#admin-tabs button').forEach(b=>b.addEventListener('click',()=>{window.opens++;document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('active',p.dataset.adminPanel===b.dataset.panel));}));
window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-session'}}})}});
window.fetch=async()=>new Response(JSON.stringify({ok:true,configuredRoute:{provider:'STRIPE_MANAGED',enabled:false},managed:{secretConfigured:false,webhookSecretConfigured:false,priceCatalogConfigured:false,sandboxEnabled:false},lemon:{apiConfigured:false,storeConfigured:false,webhookSecretConfigured:false},physical:{signedBookCheckoutEnabled:false}}),{status:200,headers:{'content-type':'application/json'}});
</script></body></html>'''
def go(p,html,server):
 page=p.new_page()
 server.handler_content=html
 page.set_content(html)
 page.evaluate("(src)=>{const location={pathname:'/admin.html',assign:()=>{}};eval(src)}",SRC)
 return page
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  b=self.server.handler_content.encode('utf8');self.send_response(200);self.send_header('content-type','text/html');self.send_header('content-length',str(len(b)));self.end_headers();self.wfile.write(b)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=go(browser,HTML,server)
 page.locator('[data-gu33-payment-hub]').wait_for(timeout=7000)
 page.locator('[data-gu33-global-search]').wait_for(timeout=7000)
 page.wait_for_timeout(100)
 assert page.locator('#old-provider-button').count()==1
 assert 'Stripe Managed Payments' in page.locator('[data-gu33-payment-hub]').inner_text()
 assert 'NOT IMPLEMENTED' in page.locator('.gu33-hub-notice').inner_text()
 assert page.locator('#admin-orders').count()==1
 page.locator('#gu33-global-input').fill('Stripe')
 assert page.locator('#gu33-global-results button').count()>=1
 page.locator('#gu33-global-input').press('ArrowDown')
 page.locator('#gu33-global-input').press('Enter')
 assert page.evaluate('window.opens')>=1
 assert page.locator('#old-provider-button').count()==1
 page.locator('.gu33-feature-index input').fill('lulu')
 assert page.locator('.gu33-task:not([hidden])').count()>=1
 page.keyboard.press('Control+k')
 assert page.locator('#gu33-global-input').evaluate('(x)=>document.activeElement===x')
 page.close()
 # Unauthorized commerce panel is not indexed or exposed.
 restricted=HTML.replace('<button data-panel="commerce">Commerce</button>','<button data-panel="commerce" hidden>Commerce</button>')
 page=go(browser,restricted,server)
 page.wait_for_timeout(1200)
 assert page.locator('[data-gu33-payment-hub]').count()==0
 assert page.locator('[data-gu33-global-search]').count()==1
 page.locator('#gu33-global-input').fill('Stripe')
 assert page.locator('#gu33-global-results button').count()==0
 page.close();browser.close()
server.shutdown()
print('PASS v014033: search, provider readiness, existing editor unchanged, unauthorized commerce hidden')
