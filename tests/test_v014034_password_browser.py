"""Isolated browser contract: missing Turnstile never enables password submission."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
SRC=(R/'assets/js/admin-password-confirm-v01432r1.js').read_text()
HTML='''<!doctype html><html><body><div id="admin-gate" hidden></div><div id="admin-app"></div><button id="open">Open</button>
<script>
window.__calls=[];
window.getSupabaseClient=async()=>({rpc:async()=>({data:{ok:true}}),auth:{getSession:async()=>({data:{session:{access_token:'example'}}})}});
window.fetch=async(url,opts)=>{window.__calls.push({url:String(url),method:opts?.method||'GET'});return Response.json({ok:true,enabled:false,sitekey:null})};
</script></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page();page.set_content(HTML)
 page.evaluate('(src)=>{const location={pathname:"/admin.html"};eval(src)}',SRC)
 page.evaluate('() => {window.__pw=window.GroundUpAdminPasswordConfirm.ensure().catch(()=>null); return true;}')
 page.locator('.gu-pw-dialog').wait_for()
 page.wait_for_timeout(220)
 assert page.locator('.gu-pw-dialog input[type=password]').is_disabled()
 assert page.locator('.gu-pw-dialog button[type=submit]').is_disabled()
 assert page.locator('.gu-pw-setup').is_visible()
 assert 'Human verification has not been set up' in page.locator('.gu-pw-dialog [role=status]').inner_text()
 page.locator('.gu-pw-dialog button[type=button]').click()
 assert page.locator('.gu-pw-dialog').count()==0
 assert all(item['method']!='POST' for item in page.evaluate('window.__calls'))
 page.close();browser.close()
print('PASS v014034: missing Turnstile keeps password disabled, gives setup directions, no sensitive request.')
