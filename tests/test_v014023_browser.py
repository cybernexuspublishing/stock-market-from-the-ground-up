'''v0.14.0.23 isolated Chromium component QA using mocked auth and API.
The route-only guard is bypassed in the test harness because Chromium network
navigation is unavailable. No production requests or database writes occur.
'''
from pathlib import Path
from playwright.sync_api import sync_playwright
from shutil import which
R=Path(__file__).resolve().parents[1]
binary=which('chromium') or which('google-chrome')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=binary,args=['--no-sandbox']) if binary else p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':320,'height':800})
    page.set_content('<html><body><div data-s="notifications" class="active"></div><div data-settings-body><article class="gu-notification-preferences"></article></div></body></html>')
    page.evaluate('''() => {
      window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'member-jwt'}}})}});
      window.fetch=async(_url,opts)=>new Response(JSON.stringify({ok:true,preferences:{mentionsEnabled:opts?.method==='POST'}}),
         {status:200,headers:{'content-type':'application/json'}});
    }''')
    source=(R/'assets/js/mention-notification-preferences-v01423.js').read_text()
    guard="if(!/^\\/dashboard(?:\\.html)?$/i.test(location.pathname))return;"
    assert guard in source
    page.add_script_tag(content=source.replace(guard,'/* test-only route guard bypass */'))
    field=page.locator('[data-gu-mentions-v01423] input[type=checkbox]')
    field.wait_for(timeout=7000)
    page.wait_for_function('document.querySelector("[data-gu-mentions-v01423] input")?.disabled===false',timeout=7000)
    assert not field.is_checked(), 'Mention alerts must be off by default'
    field.check()
    page.wait_for_function('document.querySelector("[data-gu-mentions-v01423] .gu-pref-status")?.textContent.includes("saved")',timeout=4000)
    assert field.is_checked()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'), '320px overflow'
    page.close()
    a=browser.new_page(viewport={'width':1280,'height':720})
    a.set_content('<html><body><div class="admin-panel" data-admin-panel="system"></div></body></html>')
    a.evaluate('''() => {
      window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'owner-jwt'}}})}});
      window.fetch=async()=>new Response(JSON.stringify({ok:true,checkedAt:new Date().toISOString(),
        metrics:{discussionFollows:{available:true,count:2},replyNotificationsRecorded:{available:true,count:1},
         mentionOptIns:{available:false,count:null},mentionNotificationsRecorded:{available:true,count:0}}}),
       {status:200,headers:{'content-type':'application/json'}});
    }''')
    source=(R/'assets/js/admin-community-health-v01423.js').read_text()
    guard="if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;"
    assert guard in source
    a.add_script_tag(content=source.replace(guard,'/* test-only route guard bypass */'))
    a.locator('#gu-community-health-v01423 button').wait_for(timeout=7000)
    a.locator('#gu-community-health-v01423 button').click()
    a.wait_for_function('document.querySelectorAll(".gu-community-health-row").length===4',timeout=5000)
    assert 'Unavailable / not installed' in a.locator('#gu-community-health-v01423').inner_text()
    assert 'database' in a.locator('#gu-community-health-v01423').inner_text().lower()
    a.close();browser.close()
print('PASS: isolated Chromium 320px opt-in and OWNER aggregate component; mocked network. No live acceptance.')
