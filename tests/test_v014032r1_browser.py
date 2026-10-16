"""Browser source contract without touching accounts or billing providers."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
source=(Path(__file__).resolve().parents[1]/'assets/js/admin-password-confirm-v01432r1.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=which('chromium') or None,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':320,'height':680})
 page.set_content('<!doctype html><html><head></head><body><main id="admin-app">Admin</main></body></html>')
 # Browser is about:blank; bypass the real route guard for this isolated test.
 page.evaluate('''() => { window.getSupabaseClient=async()=>({rpc:async()=>({data:null,error:{message:'PASSWORD_RECONFIRM_REQUIRED'}}),auth:{getSession:async()=>({data:{session:{access_token:'TEST_JWT'}}})}});
 window.fetch=async url => ({ok:true,json:async()=>({enabled:true,sitekey:'1x00000000000000000000AA'})});
 window.turnstile={render:(root,opts)=>{window.__challenge=opts;return 1},remove:()=>{},reset:()=>{}};
 }''')
 page.add_script_tag(content=source.replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;", "/* Browser test runs at about:blank */"))
 page.evaluate('''() => {window.__ensurePromise=window.GroundUpAdminPasswordConfirm.ensure().catch(()=>{})}''')
 page.locator('.gu-pw-dialog').wait_for(timeout=5000)
 assert page.locator('input[type="password"]').count()==1
 assert page.locator('input[type="password"]').get_attribute('autocomplete')=='current-password'
 assert page.locator('button:has-text("Confirm Password")').is_disabled()
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+3')
 page.get_by_role('button',name='Cancel').click()
 assert page.locator('.gu-pw-dialog').count()==0
 browser.close()
print('PASS v014032-R1 browser: password confirmation modal is accessible, cancellable, CAPTCHA-blocked, mobile-width safe.')
