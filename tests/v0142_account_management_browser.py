"""v0.14.0.2 local Admin account editor contract tests (no live backend).

Requires installed Playwright Python package and /usr/bin/chromium.
Test assertions use mocked Owner-only backend responses, not production data.
"""
from pathlib import Path
import json
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ACCOUNT_ID = '00000000-0000-4000-8000-000000000011'
ACCOUNT = {
    'id': ACCOUNT_ID, 'email': 'reader@example.com', 'username': 'SampleReader',
    'firstName': 'Sample', 'lastName': 'Reader', 'type': 'member', 'roles': [],
    'profile': {'bio': 'Original profile', 'avatarUrl': '', 'timezone': 'America/Chicago',
                'locale': 'en-US', 'sessionTimeoutMinutes': 30},
    'createdAt': '2026-01-05T01:00:00Z', 'lastSignInAt': '2026-10-10T01:00:00Z',
    'bannedUntil': None, 'emailConfirmed': True,
}

# Remove external script tags from isolated fixture; load original JS source below.
SOURCE = re.sub(r'<script src="[^"]+"></script>', '',
                (ROOT / 'tests/fixtures/v0142_admin_fixture.html').read_text())

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width in (1440, 390):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(SOURCE)
        page.evaluate('''(account)=>{
          window.testCalls=[];
          window.fetch=async function(input,options={}) {
            const u=new URL(input,'https://mock.local'),op=u.searchParams.get('action');
            const method=options.method||'GET';
            if(method==='POST')window.testCalls.push({action:op,body:JSON.parse(options.body||'{}')});
            let data={ok:true};
            if(u.pathname.includes('admin-accounts-v01353')) {
              if(op==='list')Object.assign(data,{owner:true,synthetic:false,accounts:[account],total:1,hasMore:false,vaultReady:false});
              if(op==='detail')Object.assign(data,{account,dateOfBirth:'1990-01-01',membership:{planCode:'FREE'},flag:{status:'active',reason:''},notes:[]});
              if(op==='roles')data.roles=[{role_code:'ADMIN',name:'Administrator'},{role_code:'MODERATOR',name:'Moderator'},{role_code:'OWNER',name:'Owner'}];
              if(op==='plans')data.plans=[{plan_code:'FREE',name:'Free'},{plan_code:'MONTHLY',name:'Monthly'}];
            }
            if(u.pathname.includes('admin-access-v01355'))Object.assign(data,{synthetic:false,
              books:[{product_code:'FOUNDATION_BOOK_1',short_title:'Book I'}],tools:[{tool_code:'TUTOR',name:'Tutor'}],
              grants:[],library:[],passes:[],people:{}});
            return {ok:true,status:200,json:async()=>data,text:async()=>JSON.stringify(data)};
          };
        }''', ACCOUNT)
        for css in ('assets/css/admin-platform.css', 'assets/css/admin-operations.css', 'assets/css/accounts-and-lab-preview.css'):
            page.add_style_tag(content=(ROOT / css).read_text())
        for file in ('assets/js/admin-legacy-routing.js', 'assets/js/admin-operations.js',
                     'assets/js/accounts-access.js', 'assets/js/admin-workflows.js'):
            js = (ROOT / file).read_text()
            # Only strip the path guard in the local test environment (production untouched).
            js = js.replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;", '')
            page.add_script_tag(content=js)
        page.wait_for_function('document.querySelector("#v1352-accounts") !== null', timeout=15000)
        nav = page.locator('[data-v1352-menu]')
        assert nav.count() == 1 and nav.is_visible(), f'Account Management navigation absent at {width}px'
        assert page.locator('[data-v142-create]').is_visible(), f'Create Account navigation absent at {width}px'
        nav.click()
        page.wait_for_function('document.querySelectorAll("[data-v1352-action=edit]").length === 1')
        assert page.locator('#v1352-accounts').is_visible()
        page.locator('[data-v1352-action="edit"]').click()
        page.wait_for_function('document.querySelector("#v1353-identity-form") !== null')
        for selector in ('#v1353-identity-form', '#v1353-membership-form', '#v1353-profile-form',
                         '#v1353-state-form', '#v1353-notes-form', '[data-editor-action="access"]'):
            assert page.locator(selector).is_visible(), f'{selector} hidden at {width}px'
        assert page.locator('#v1353-identity-form [name=firstName]').input_value() == 'Sample'
        assert page.locator('#v1353-identity-form [name=lastName]').input_value() == 'Reader'
        page.locator('#v1353-identity-form [name=firstName]').fill('NewFirst')
        page.locator('#v1353-identity-form [name=lastName]').fill('NewLast')
        page.locator('#v1353-identity-form button[type=submit]').click()
        page.wait_for_function('window.testCalls.some(x=>x.action==="edit")')
        edit = page.evaluate('window.testCalls.find(x=>x.action==="edit")')
        assert edit['body']['firstName'] == 'NewFirst' and edit['body']['lastName'] == 'NewLast'
        page.locator('[data-v1352-action="edit"]').click()
        page.wait_for_function('document.querySelector("#v1353-profile-form") !== null')
        page.locator('#v1353-profile-form [name=bio]').fill('Updated bio')
        page.locator('#v1353-profile-form button[type=submit]').click()
        page.wait_for_function('window.testCalls.some(x=>x.action==="profile")')
        assert page.evaluate('window.testCalls.find(x=>x.action==="profile").body.bio') == 'Updated bio'
        page.locator('[data-v1352-action="edit"]').click()
        page.wait_for_function('document.querySelector("[data-editor-action=access]") !== null')
        page.locator('[data-editor-action="access"]').click()
        page.wait_for_function('document.querySelector("#v1355-manual-grant [name=userId]") !== null')
        assert page.locator('#v1355-manual-grant [name=userId]').input_value() == ACCOUNT_ID
        assert not errors, f'Frontend exceptions at {width}px: {errors}'
        page.close()
    browser.close()
print('PASS v0.14.0.2 Account Management: visible direct navigation and create button; full edit controls and save payloads; account access linkage at 1440px and 390px')
