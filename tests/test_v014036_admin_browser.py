"""Isolated DOM smoke test only: does not verify live Supabase/Cloudflare APIs."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
nav=(R/'assets/js/admin-simple-navigation-v014036.js').read_text()
integrity=(R/'assets/js/release-integrity-v014036.js').read_text()
html='''<!doctype html><html><head></head><body>
<aside class="admin-sidebar"><div class="admin-brand-block">Control Center</div>
<nav id="admin-tabs"><button type="button" data-panel="dashboard">Dashboard</button>
<button type="button" id="admin-account-management-direct">Account Management</button>
<button type="button" data-panel="commerce">Commerce</button>
<button type="button" data-panel="catalog">Books & Catalog</button>
<button type="button" data-panel="community">Market Commons · Reports</button>
<button type="button" data-panel="settings">Site Settings</button>
<button type="button" data-panel="audit">Audit Log</button>
<button type="button" disabled>Restricted Operations</button>
<button type="button" id="communications">Communications & Member Messages</button>
<a href="/gws-projects.html">Grant Web Solutions</a></nav></aside>
<div id="admin-gate" hidden></div><main class="admin-main"><div id="admin-app"></div>
<section data-gu33-global-search="1"><input id="gu33-global-input"></section></main>
</body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page()
 page.route('https://example.test/release-manifest.json',lambda route:route.fulfill(status=200,content_type='application/json',body='{"version":"0.14.0.36","gitCommit":null}'))
 page.set_content(html)
 page.evaluate("window.SITE_CONFIG={VERSION:'0.14.0.36'};window.GroundUpRoutePolicy={version:'0.14.0.36'};window.__clicked=[];document.querySelectorAll('#admin-tabs button').forEach(b=>b.addEventListener('click',()=>window.__clicked.push(b.textContent)))")
 page.add_script_tag(content=nav.replace("location.pathname", "'/admin.html'"))
 page.wait_for_selector('#gu36-simple-admin')
 assert page.locator('#gu36-simple-admin .gu36-nav-link').count()==10
 assert page.locator('details.gu36-all-controls #admin-tabs').count()==1
 assert page.locator('#admin-tabs button').count()==9
 page.locator('[data-gu36-target="Payments & Billing"]').click()
 assert page.evaluate('window.__clicked').pop()=='Commerce'
 page.locator('[data-gu36-target="Communications"]').click()
 assert page.evaluate('window.__clicked').pop()=='Communications & Member Messages'
 page.locator('#gu36-find-admin').fill('Books')
 assert page.locator('.gu36-nav-link:visible').count()==1
 assert page.locator('#gu33-global-input').input_value()=='Books'
 assert page.locator('details.gu36-all-controls').get_attribute('open') is None
 page.locator('details.gu36-all-controls summary').click()
 assert page.locator('#admin-tabs').is_visible()
 browser.close()
print('PASS v014036: 10 simple sections, legacy controls retained, payment/communications routing, search, preserved details')
