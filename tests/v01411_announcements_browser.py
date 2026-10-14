from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1100,'height':850})
 page.set_content('<main><div id="editor"></div></main>')
 page.add_style_tag(content=(p/'assets/css/owner-editors.css').read_text())
 page.add_script_tag(content=(p/'assets/js/admin-announcements.js').read_text())
 page.evaluate('''() => {
    window.mutations=[];
    window.fakeApi=async()=>({ok:true,announcements:window._entries||[{
      id:1,title:'Maintenance',body:'A scheduled message.',announcement_type:'maintenance',audience:'all',
      active:true,dismissible:true,starts_at:null,ends_at:null
    }]});
    window.fakeAdmin=async (action,data)=> {window.mutations.push({action,data});return {ok:true}};
    window.renderEditor=()=>window.SiteAnnouncementEditor.render(document.querySelector('#editor'),{api:window.fakeApi,adminApi:window.fakeAdmin});
  }''')
 page.evaluate('window.renderEditor()')
 page.locator('.v01411-ann-item').wait_for()
 page.get_by_role('button',name='Edit').click()
 page.locator('[name=title]').fill('Maintenance extended')
 page.locator('[name=endsAt]').fill('2026-11-04T23:00')
 page.get_by_role('button',name='Save Changes').click()
 page.wait_for_function('window.mutations.some(x=>x.action===\'announcement_save\')')
 update=page.evaluate('window.mutations.find(x=>x.action===\'announcement_save\')')
 assert update['data']['title']=='Maintenance extended'
 assert update['data']['endsAt'].endswith('Z')
 page.get_by_role('button',name='New Announcement').click()
 page.locator('[name=title]').fill('New notice')
 page.locator('[name=body]').fill('Message for everyone.')
 page.get_by_role('button',name='Create Announcement').click()
 page.wait_for_function('window.mutations.filter(x=>x.action===\'announcement_save\').length===2')
 assert page.evaluate('window.mutations[1].data.id===null')
 # Deletion displays confirmation, and no action is performed until explicitly confirmed.
 page.on('dialog',lambda d: d.accept())
 page.get_by_role('button',name='Delete Permanently').first.click()
 page.wait_for_function('window.mutations.some(x=>x.action===\'announcement_delete\')')
 assert page.evaluate('window.mutations.some(x=>x.action===\'announcement_delete\'&&x.data.confirmation===\'DELETE ANNOUNCEMENT\')')
 page.close();browser.close()
print('PASS v0.14.0.11 announcement create, edit, schedule, explicit delete confirmation browser workflow')
