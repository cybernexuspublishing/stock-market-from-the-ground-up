"""Owner controls: browser-only source tests, no live accounts/API writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1024,'height':900})
 page.set_content('<main><div id="v132-home"><section class="v132-home-hero-grid"></section></div></main>')
 page.evaluate('''window.fetch=async()=>new Response(JSON.stringify({ok:true,show:true,mode:'range',registered:240,online:121,label:'',nextRefreshSeconds:600}),{status:200})''')
 page.add_script_tag(content=(R/'assets/js/home-community.js').read_text().replace("if(!['/','/index.html'].includes(location.pathname.toLowerCase()))return;",""))
 page.wait_for_function("document.querySelector('[data-online]')?.textContent==='121'")
 assert page.locator('[data-caption]').is_hidden(), 'Blank custom caption should not produce default text'
 assert page.locator('[data-online-label]').inner_text()=='Example online members', 'Simulated data remains identifiable'
 page.close()

 page=browser.new_page(viewport={'width':1000,'height':800})
 page.set_content('<div id="editor"></div>')
 page.add_style_tag(content=(R/'assets/css/owner-editors.css').read_text())
 page.add_script_tag(content=(R/'assets/js/admin-announcements.js').read_text())
 page.evaluate('''window.api=async()=>({ok:true,announcements:[]});window.writes=[];window.adminApi=async(action,data)=>{writes.push({action,data});return {ok:true}};window.SiteAnnouncementEditor.render(document.getElementById('editor'),{api,adminApi});''')
 page.get_by_role('button',name='New Announcement').click()
 page.locator('[name=title]').fill('Short notice')
 page.locator('[name=body]').fill('This closes after 15 minutes')
 page.locator('[name=expirationMode]').select_option('duration')
 page.locator('[name=durationAmount]').fill('15')
 page.locator('[name=durationUnit]').select_option('minutes')
 assert page.locator('[data-expiration-duration]').is_visible()
 assert page.locator('[data-expiration-date]').is_hidden()
 assert 'Short notice' in page.locator('.v01414-ann-preview').inner_text()
 page.get_by_role('button',name='Create Announcement').click()
 page.wait_for_function('writes.length>0')
 d=page.evaluate('writes[0].data')
 assert d['expirationMode']=='duration' and d['durationAmount']==15 and d['durationUnit']=='minutes'
 page.close();browser.close()
print('PASS v0.14.0.14 homepage optional caption, example labels and duration scheduling browser interaction')
