"""Browser DOM test for metric buttons and legacy/community report navigation; no production data."""
from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html='''<html><body><nav id="admin-tabs"><button data-panel="dashboard">Dashboard</button><button data-panel="users">Users</button><button data-v1352-menu>Account Management</button><button data-panel="commerce">Commerce</button><button data-panel="catalog">Catalog</button><button data-panel="content">Content</button><button data-panel="community">Community</button></nav><div id="admin-gate" hidden></div><div id="admin-app"><section data-admin-panel="dashboard" class="admin-panel active"><div id="admin-summary"></div><div id="admin-priority-checks"></div><div id="admin-permission-summary"></div></section><section data-admin-panel="community" class="admin-panel"><div id="admin-forum-reports"></div><div id="admin-forum-topics"></div><div id="admin-forum-posts"></div></section></div><div id="admin-role-line"></div><input id="admin-user-search"><button id="admin-user-search-btn"></button><button id="admin-new-role"></button><button id="admin-new-product"></button><button id="admin-new-content"></button><select id="admin-content-filter"></select></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page();page.set_content(html)
 page.evaluate('''() => {window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'TEST_NONPRODUCTION'}}})}});window.testClicked=[];document.querySelectorAll('#admin-tabs button').forEach(x=>x.addEventListener('click',()=>window.testClicked.push(x.textContent)));window.fetch=async u=>{const action=new URL(u,'http://example.invalid').searchParams.get('action');const result=action==='context'?{ok:true,permissions:['control_panel.access','dashboard.view','users.view','commerce.view','catalog.view','content.view','forum.view','forum.moderate'],roles:['OWNER']}:action==='dashboard'?{ok:true,summary:{users:4,activeEntitlements:1,library:5,orders:0,subscriptions:0,openReports:2,catalogProducts:7,publishedContent:0}}:{ok:true,reports:[],posts:[],topics:[]};return {ok:true,json:async()=>result};};}''')
 js=(ROOT/'assets/js/admin.js').read_text().replace("document.addEventListener('DOMContentLoaded',initAdmin);","window.__testAdminInit=initAdmin;")
 page.add_script_tag(content=js)
 page.evaluate('window.__testAdminInit()')
 page.locator('[data-cc-metric="community"]').first.wait_for()
 assert page.locator('#admin-summary .cc-metric-link').count()==8
 page.locator('#admin-summary [data-cc-metric="community"]').click()
 assert 'Community' in page.evaluate('window.testClicked')
 page.locator('#admin-summary [data-cc-metric="users"]').click()
 assert 'Users' in page.evaluate('window.testClicked')
 page.locator('#admin-summary [data-cc-metric="account-management"]').first.click()
 assert 'Account Management' in page.evaluate('window.testClicked')
 assert page.locator('#admin-priority-checks .cc-alert-link').count()==1
 b.close()
print('PASS 8 metrics use semantic buttons; Reports, Users and Account Management are navigable')
