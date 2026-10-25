"""Theme failure/retry browser fixtures; no production writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
script=Path('assets/js/premium-design-v014168.js').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page()
    mode={'value':'html'}
    writes=[]
    def serve(route):
        if '/api/website-design' in route.request.url:
            if route.request.method!='GET':
                writes.append(route.request.method)
                route.fulfill(status=500,content_type='application/json',body='{}')
            elif mode['value']=='html':
                route.fulfill(status=404,content_type='text/html',body='<h1>Page not found</h1>')
            elif mode['value']=='invalid':
                route.fulfill(status=200,content_type='application/json',body='{"ok":true,"design":{"theme":"premium-light"}}')
            else:
                route.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True,'design':{'theme':'premium-dark','revision':3}}))
        else:
            route.fulfill(content_type='text/html',body='<html data-gu-design="premium-dark"><body><div id="admin-app"><div data-admin-panel="settings"></div></div></body></html>')
    page.route('**/*',serve)
    page.goto('https://fixture.test/admin.html')
    page.add_script_tag(content=script)
    note=page.locator('.gu-design-state')
    note.get_by_text('Published theme settings are unavailable.',exact=False).wait_for()
    activate=page.get_by_role('button',name='Activate Selected Theme')
    assert not activate.is_enabled()
    assert note.get_attribute('aria-live')=='polite'
    page.get_by_label('Clean Light',exact=True).check()
    assert page.locator('html').get_attribute('data-gu-design')=='premium-light'
    mode['value']='invalid'
    page.get_by_role('button',name='Retry Published Settings').click()
    note.get_by_text('Published theme settings are unavailable.',exact=False).wait_for()
    assert not activate.is_enabled()
    mode['value']='healthy'
    page.get_by_role('button',name='Retry Published Settings').click()
    page.wait_for_function('window.__guActiveDesign?.revision===3')
    assert activate.is_enabled()
    assert page.locator('html').get_attribute('data-gu-design')=='premium-light'
    assert writes==[],writes
    browser.close()
print('PASS theme HTML failure, invalid revision, disabled activation, local preview and retry recovery; zero writes')
