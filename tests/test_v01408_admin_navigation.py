"""Headless DOM regression on installed Chromium; no live credentials or services."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
html='''<!doctype html><html><head><meta name="application-version" content="v0.14.0.8"></head><body>
<main class="admin-shell"><aside class="admin-sidebar"><nav id="admin-tabs">
<div class="v13-admin-group"><div class="v13-admin-group-title">Overview</div>
<button data-panel="dashboard">Dashboard</button><button data-panel="users">Account Details & Support</button>
<button data-panel="roles">Roles & Permissions</button><button data-panel="community">Market Commons</button>
<button data-panel="catalog">Books & Catalog</button><button data-panel="commerce">Commerce</button>
<button data-panel="content">Content & Tutor</button><button data-panel="audit">Audit Log</button>
<button data-v1352-menu>Account Management</button><button data-v142-create>Create Account</button>
<button data-v135-control="labs">Lab Registry</button><button data-v135-control="cases">Competency Cases</button>
<button data-oc-tab="security">Security & Governance</button><button id="cc-directory-trigger">Control Center Directory</button>
<button data-test-unlisted>Unlisted Installed Tool</button>
</div></nav></aside>
<section class="admin-main"><div id="admin-gate" hidden></div><div id="admin-app"><div id="admin-summary"></div><div id="admin-priority-checks"></div>
<section class="admin-panel active" data-admin-panel="dashboard"></section><section class="admin-panel" data-admin-panel="community"></section><div id="admin-forum-reports">Reports list</div></div></section></main></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page()
 page.set_content(html)
 page.evaluate('''() => {window.testClicked=[]; document.querySelectorAll('#admin-tabs button').forEach(b=>b.addEventListener('click',()=>window.testClicked.push(b.textContent.trim())));window.GroundUpAdminCan=()=>true; window.GroundUpAdminWorkflows={openModeration:()=>window.testClicked.push('MODERATION')};}''')
 script=(ROOT/'assets/js/admin-navigation.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;","if(false)return;")
 page.add_script_tag(content=script)
 page.wait_for_timeout(1300)
 labels=page.locator('#admin-tabs button').all_text_contents()
 assert 'Unlisted Installed Tool' in labels, labels
 assert 'Account Management' in labels and 'Create Account' in labels
 assert page.locator('#cc-direct-reports').count()==1
 assert page.locator('#cc-direct-reports').is_visible()
 page.locator('#cc-direct-reports').click()
 assert 'Market Commons' in page.evaluate('window.testClicked')
 page.locator('#cc-direct-moderation').click()
 assert 'MODERATION' in page.evaluate('window.testClicked')
 groups=page.locator('[data-cc-nav-group]').all_text_contents()
 assert any('Additional Installed Controls' in g for g in groups)
 # Preserve all installed controls after repeated regroup and mutation.
 page.evaluate('''() => {const b=document.createElement('button');b.textContent='New Verified Tool';document.querySelector('#admin-tabs').append(b)}''')
 page.wait_for_timeout(500)
 assert page.locator('#admin-tabs button',has_text='New Verified Tool').count()==1
 assert page.locator('#cc-direct-reports').count()==1
 b.close()
print('PASS admin navigation preserves installed controls, routes Reports, exposes moderation, and accepts new modules')
