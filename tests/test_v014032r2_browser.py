"""Isolated Chrome test of provider-selection admin interface; no real checkout."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
src=(R/'assets/js/admin-payment-providers-v01432r2.js').read_text()
assert 'if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;' in src
# Test this component in isolation instead of requiring a live staff login.
src=src.replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;", "/* test route */")
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
 page=browser.new_page(viewport={'width':360,'height':740})
 page.set_content('''<!doctype html><html><body><section class="admin-panel" data-admin-panel="commerce"></section></body></html>''')
 page.evaluate('''() => {
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-owner'}}})},
 rpc:async(name)=>({data:{ok:true,role:'OWNER',provider:'STRIPE_MANAGED',enabled:false,updatedAt:'2026-10-15T12:00:00Z'},error:null})});
 window.fetch=async()=>({ok:true,json:async()=>({ok:true,managed:{sandboxEnabled:false},lemon:{}})});
 }''')
 page.add_script_tag(content=src)
 panel=page.locator('[data-gu-managed-r2]')
 panel.wait_for(timeout=4000)
 assert page.get_by_text('Stripe Managed Payments & Lemon Squeezy').count()==1
 page.get_by_role('button',name='Check Configuration').click()
 page.get_by_text('Current route: STRIPE_MANAGED').wait_for(timeout=4000)
 assert page.get_by_role('button',name='Open Stripe Test Checkout').is_disabled()
 assert page.get_by_role('button',name='Save Digital Provider Preference').is_enabled()
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2')
 browser.close()
print('PASS R2 browser: provider choice visible, sandbox disabled until credentials, 360px layout.')
