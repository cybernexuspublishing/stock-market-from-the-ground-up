from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
script=(root/'assets/js/admin-report-policy.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':375,'height':812})
 page.set_content('<nav id="admin-tabs"><button data-panel="community">Commons</button></nav><section class="admin-panel" data-admin-panel="community"></section><section class="admin-panel" data-admin-panel="settings"></section>')
 page.evaluate('''() => {window._posts=[];window._owner=true;window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'TEST'}}})}});window.fetch=async (url,options)=>{if(options?.method==='POST'){window._posts.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:true,policy:{version:2}}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({ok:true,canEdit:window._owner,policy:{quota_enabled:true,quota_max:10,quota_hours:24,duplicate_enabled:true,duplicate_hours:24,version:1,updated_at:'2026-10-14T20:00:00Z'}}),{status:200,headers:{'content-type':'application/json'}})}}''')
 page.add_script_tag(content=script)
 page.get_by_role('button',name='Load reporting policies').click()
 page.wait_for_timeout(100)
 assert page.locator('#gu-admin-report-policy').count()==1
 assert page.locator('input[name=quotaMax]').input_value()=='10'
 page.locator('input[name=quotaEnabled]').uncheck()
 assert page.locator('input[name=quotaMax]').is_disabled()
 page.locator('input[name=duplicateEnabled]').uncheck()
 assert page.locator('input[name=duplicateHours]').is_disabled()
 page.once('dialog',lambda d:d.accept())
 page.get_by_role('button',name='Save reporting policy').click()
 page.wait_for_timeout(100)
 assert len(page.evaluate('window._posts'))==1
 assert page.evaluate('window._posts[0].quotaEnabled') is False
 assert page.evaluate('window._posts[0].duplicateEnabled') is False
 page.evaluate('window._owner=false')
 page.get_by_role('button',name='Load reporting policies').click()
 page.wait_for_timeout(100)
 assert page.locator('input[name=quotaEnabled]').is_disabled()
 assert page.get_by_role('button',name='Save reporting policy').count()==0
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 print('PASS UI: Owner controls, independent toggles, disabled quotas, submit, non-owner read-only, responsive 375px')
 browser.close()
