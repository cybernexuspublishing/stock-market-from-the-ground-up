"""Isolated Chromium component tests; location/auth/network are mocked explicitly."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':360,'height':800})
    errors=[]
    page.on('pageerror',lambda exc: errors.append(str(exc)))
    page.set_content('''<!doctype html><html><body><div id="tabs"><div role="tablist"><button data-s="notifications" class="active">Notifications</button></div>
       <div data-settings-body><article class="v13-card"><h3>Notifications</h3><div class="v132-setting-list"><input type="checkbox" checked></div></article></div></div>
       <script>window.mockLog=[];window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'jwt'}}})}});
       window.fetch=async(url,opts={})=>{window.mockLog.push({url,opts});return new Response(JSON.stringify({ok:true,preferences:{subscribedRepliesEnabled:opts.method==='POST'?JSON.parse(opts.body).subscribedRepliesEnabled:false}}),{status:200,headers:{'content-type':'application/json'}})};</script></body></html>''')
    # In this offline sandbox, mock only the page route, retaining the production DOM/logic.
    script=(ROOT/'assets/js/member-notification-preferences-v01421.js').read_text().replace('location.pathname',"'/dashboard.html'")
    page.add_script_tag(content=script)
    page.wait_for_selector('[data-gu-v01421-preferences] input:not([disabled])')
    assert page.locator('[data-settings-body] input[type=checkbox]').count()==1
    assert not page.locator('[data-gu-v01421-preferences] input').is_checked()
    page.locator('[data-gu-v01421-preferences] input').check()
    page.wait_for_function("document.querySelector('.gu-pref-status').textContent.includes('saved')")
    assert page.locator('[data-gu-v01421-preferences] input').is_checked()
    assert page.evaluate("mockLog.filter(x=>x.opts.method==='POST').length")==1
    # If both POST and the reconciliation GET fail, the true saved state is unknown.
    # Disable input rather than claiming rollback of a possibly committed write.
    page.evaluate("window.fetch=async(url,opts={})=>new Response(JSON.stringify({ok:false,error:'Test outage'}),{status:503,headers:{'content-type':'application/json'}})")
    page.locator('[data-gu-v01421-preferences] input').uncheck()
    page.wait_for_function("document.querySelector('.gu-pref-status').textContent.includes('Could not confirm the saved preference')")
    assert page.locator('[data-gu-v01421-preferences] input').is_disabled()
    # Retry GET restores the persisted canonical server state; never blind re-POST.
    page.evaluate("window.fetch=async(url,opts={})=>new Response(JSON.stringify({ok:true,preferences:{subscribedRepliesEnabled:true}}),{status:200,headers:{'content-type':'application/json'}})")
    page.get_by_role('button',name='Retry loading').click()
    page.wait_for_selector('[data-gu-v01421-preferences] input:not([disabled])')
    assert page.locator('[data-gu-v01421-preferences] input').is_checked()
    # Reopening Settings restores exactly one backed checkbox, not the placeholder controls.
    page.evaluate("document.querySelector('[data-settings-body]').innerHTML='<article class=\"v13-card\"><div class=\"v132-setting-list\"><input checked type=\"checkbox\"></div></article>'")
    page.wait_for_selector('[data-gu-v01421-preferences] input:not([disabled])')
    assert page.locator('[data-settings-body] input[type=checkbox]').count()==1
    page.set_content('''<!doctype html><html><body><div id="v13-commons" class="v13-topic-detail"><article data-forum-content="topic">Test</article></div>
       <script>window.mockLog=[];window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'jwt'}}})}});
       window.fetch=async(url,opts={})=>{window.mockLog.push({url,opts});return new Response(JSON.stringify({ok:true,available:true,subscribed:opts.method==='POST'?JSON.parse(opts.body).subscribe:false}),{status:200,headers:{'content-type':'application/json'}})};</script></body></html>''')
    script=(ROOT/'assets/js/commons-follow-v01421.js').read_text().replace('location.pathname',"'/market-commons.html'").replace('location.search',"'?topic=13'")
    page.add_script_tag(content=script)
    page.get_by_role('button',name='Follow discussion').wait_for()
    page.get_by_role('button',name='Follow discussion').click()
    page.get_by_role('button',name='Unfollow discussion').wait_for()
    assert page.evaluate("mockLog.filter(x=>x.opts.method==='POST').length")==1
    page.get_by_role('button',name='Unfollow discussion').click()
    page.get_by_role('button',name='Follow discussion').wait_for()
    assert page.evaluate("mockLog.filter(x=>x.opts.method==='POST').length")==2
    # A gated/unavailable discussion must never show an active Follow control.
    page.evaluate("document.querySelector('[data-gu-follow-v01421]').remove()")
    page.evaluate("window.fetch=async(url,opts={})=>new Response(JSON.stringify({ok:true,available:false,subscribed:false}),{status:200,headers:{'content-type':'application/json'}})")
    # Test controlled reload by reusing module source on a fresh browser page.
    gated=browser.new_page(viewport={'width':320,'height':700})
    gated.set_content('<div id="v13-commons" class="v13-topic-detail"><article data-forum-content="topic">Hidden</article></div>')
    gated.evaluate("window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'jwt'}}})}});window.fetch=async()=>new Response(JSON.stringify({ok:true,available:false,subscribed:false}),{status:200})")
    gated.add_script_tag(content=script)
    gated.locator('[data-gu-follow-v01421] button').wait_for()
    gated.wait_for_function("document.querySelector('[data-gu-follow-v01421] button').textContent === 'Following unavailable'")
    assert gated.locator('[data-gu-follow-v01421] button').is_disabled()
    gated.close()
    assert not errors,errors
    browser.close()
print('v0.14.0.21 isolated Chromium Settings + Follow state tests: PASS')
