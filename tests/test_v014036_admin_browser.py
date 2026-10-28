"""Organized Admin compatibility test: synthetic DOM; never calls live billing APIs."""
from pathlib import Path
from playwright.sync_api import sync_playwright

R=Path(__file__).resolve().parents[1]
bridge=(R/'assets/js/admin-simple-navigation-v014036.js').read_text(encoding='utf-8')
html='''<!doctype html><html><head></head><body>
<aside class="admin-sidebar"><div class="admin-brand-block">Control Center</div>
<nav id="admin-tabs">
 <button type="button" data-panel="dashboard">Today</button>
 <button type="button" id="admin-account-management-direct">Members</button>
 <button type="button" data-panel="commerce">Orders &amp; Subscriptions</button>
 <button type="button" data-panel="content">Tutor Content &amp; Feedback</button>
 <button type="button" data-panel="community">Moderation</button>
 <button type="button" data-panel="settings">Site Settings</button>
 <button type="button" data-panel="audit">Activity Log</button>
 <a href="/gws-projects.html">Client Website Drafts (Grant Web Solutions)</a>
</nav></aside>
<div id="admin-gate" hidden></div>
<main class="admin-main"><section id="admin-app">
 <section class="admin-panel" data-admin-panel="commerce">
  <details id="gu71-zero-live-checkout"><summary>Owner diagnostic only</summary></details>
 </section></section></main></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content(html)
 page.evaluate("""()=>{window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};window.__clicked=[];
  document.querySelectorAll('#admin-tabs button').forEach(b=>b.addEventListener('click',()=>window.__clicked.push(b.textContent.trim())))}""")
 page.add_script_tag(content=bridge.replace("location.pathname","'/admin.html'"))
 page.wait_for_selector('#gu36-owner-zero-live-qa')
 assert page.locator('#gu36-simple-admin').count()==0, 'No competing Workspace row'
 assert page.locator('details.gu36-all-controls').count()==0, 'No duplicate all-controls directory'
 assert page.locator('.admin-sidebar > #admin-tabs').count()==1, 'Canonical sidebar remains in place'
 assert page.locator('#admin-tabs [data-panel]').count()==7, 'Existing handlers and module IDs remain'
 page.evaluate("window.GroundUpSimpleAdminNavV014036.open('Commerce')")
 assert page.evaluate("window.__clicked").pop()=='Orders & Subscriptions'
 page.locator('#gu36-owner-zero-live-qa').click()
 page.wait_for_function("document.getElementById('gu71-zero-live-checkout').open === true")
 assert page.locator('#gu71-zero-live-checkout').evaluate('(e)=>e.open')
 nonowner=browser.new_page()
 nonowner.set_content(html)
 nonowner.evaluate("window.ADMIN={ctx:{roles:['ADMIN'],permissions:['commerce.view']}}")
 nonowner.add_script_tag(content=bridge.replace("location.pathname","'/admin.html'"))
 nonowner.wait_for_timeout(250)
 assert nonowner.locator('#gu36-owner-zero-live-qa').count()==0, 'Owner-only diagnostic not shown to staff'
 nonowner.close();browser.close()
print('PASS: one navigation, original handlers, Owner-only diagnostic, no transaction')
