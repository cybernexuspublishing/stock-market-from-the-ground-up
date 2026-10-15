"""Owner/ADMIN shipping queue is permission-gated; username identity never exposes address by default."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
js=(p/'assets/js/admin-staff-shipping-v01431r1.js').read_text()
assert "gu_staff_signed_orders_v01431r1" in js
assert "signed-book-owner-detail" in js
assert "order.status" not in js or "o.status" in js
html='''<html><head></head><body><div id="admin-app"><section class="admin-panel" data-admin-panel="commerce"></section></div></body></html>'''
with sync_playwright() as browser_engine:
 browser=browser_engine.chromium.launch(headless=True,executable_path=which('chromium') or None,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':375,'height':780});page.set_content(html)
 page.evaluate('''() => {window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'valid'}}})},
 rpc:async(name)=>({data:{ok:true,allowed:false,orders:[]},error:null})})}''')
 page.add_script_tag(content=js.replace('if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;','/* test route */'))
 page.locator('.gu-shipping-r1 button').wait_for(timeout=4000)
 page.locator('.gu-shipping-r1 button').click()
 page.get_by_text('ADMIN shipping access is disabled.',exact=False).wait_for(timeout=4000)
 assert page.locator('.gu-shipping-r1 pre').count()==0
 page.close();browser.close()
print('PASS v31R1 shipping UI: disabled ADMIN gets no address and no view buttons.')
