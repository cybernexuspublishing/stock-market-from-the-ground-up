"""Isolated Chromium admin communication UX and username table test; no real DB."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
admin=(R/'assets/js/admin-communications-v01431r1.js').read_text()
accounts=(R/'assets/js/admin-account-usernames-v01431r1.js').read_text()
base='<html><head></head><body><div id="admin-gate" hidden></div><nav id="admin-tabs"><button>Dashboard</button></nav><div id="admin-app"><div id="admin-users-table"><table><thead><tr><th>User</th><th>Username</th><th>Roles</th></tr></thead><tbody><tr><td>reader@example.com</td><td>SampleReader</td><td>MEMBER</td></tr></tbody></table></div><section class="admin-panel" data-admin-panel="commerce"></section><section id="v1355-account-hub" class="admin-panel"><div id="v1355-access-content"><table><thead><tr><th>Member</th><th>Plan</th></tr></thead><tbody><tr><td>Generic Full Name</td><td>FULL_MONTHLY</td></tr></tbody></table></div></section></div></body></html>'
assert 'if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;' in admin
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=which('chromium') or which('google-chrome') or None)
 page=browser.new_page(viewport={'width':1024,'height':768})
 page.set_content(base)
 page.evaluate('''() => {
   window.getSupabaseClient=async()=>({
     auth:{getSession:async()=>({data:{session:{access_token:'valid-staff-token'}}})},
     rpc:async(name,args)=>{
       window.__last_rpc__={name,args};
       if(name==='gu_staff_console_v01431r1')return {data:{ok:true,role:'OWNER',settings:{
         'communications.owner_member_notices_enabled':true,
         'communications.admin_member_notices_enabled':false,
         'commerce.admin_shipping_address_access_enabled':false,
         'site.registration_enabled':true,
         'commerce.checkout_enabled':false,
         'commerce.signed_books_checkout_enabled':false
       },members:[{id:'11111111-1111-4111-8111-111111111111',username:'SampleReader'}],notices:[]},error:null};
       return {data:{ok:true},error:null};
     }
   });
   window.fetch=async(url)=>new Response(JSON.stringify({ok:true,
     people:{'11111111-1111-4111-8111-111111111111':{username:'SampleReader',name:'Generic Full Name'}},
     grants:[{user_id:'11111111-1111-4111-8111-111111111111'}],subscriptions:[]
   }),{status:200,headers:{'content-type':'application/json'}});
 }''')
 page.add_script_tag(content=admin.replace('if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;','/* isolated test route */'))
 page.wait_for_selector('#gu-communications-nav',timeout=5000)
 page.click('#gu-communications-nav')
 page.wait_for_selector('.gu-comms-form select[name="recipient"]',timeout=5000)
 assert page.get_by_text('Communications & Member Messages',exact=False).count()>=1
 assert page.locator('input[type="checkbox"]').count()>=6
 assert page.locator('input[type="checkbox"]').nth(1).is_checked() is False
 page.locator('select[name="recipient"]').select_option('SampleReader')
 page.locator('.gu-comms-form input').first.fill('Test notice')
 page.locator('.gu-comms-form textarea').first.fill('Private notice for testing')
 page.locator('.gu-comms-form [type="submit"]').click()
 page.wait_for_function("window.__last_rpc__?.name==='gu_staff_send_notice_v01431r1'",timeout=3500)
 assert page.evaluate('window.__last_rpc__.args.p_username')=='SampleReader'
 page.evaluate("history.replaceState(null,'','#access-memberships')")
 page.add_script_tag(content=accounts.replace('if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;','/* isolated test route */'))
 page.wait_for_selector('#v1355-access-content table[data-gu-username-added]',timeout=5000)
 assert page.locator('#v1355-access-content table th').first.inner_text()=='Username'
 assert page.locator('#admin-users-table thead th').first.inner_text()=='Username'
 assert '@SampleReader' in page.locator('#v1355-access-content table tbody tr').first.inner_text()
 assert page.locator('#v1355-access-content table tbody button').count()==1
 page.locator('#v1355-access-content table tbody button').click()
 page.wait_for_selector('#gu-communications-v01431r1.active')
 page.wait_for_function("document.querySelector('.gu-comms-form select')?.value==='SampleReader'",timeout=5000)
 page.close();browser.close()
print('PASS v31R1: owner toggle panel, username first column, member message send, linked recipient from account table.')
