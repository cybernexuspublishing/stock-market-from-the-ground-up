"""v0.14.0.12 browser acceptance for shared discussion composer and Alerts."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent

def main():
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1280,'height':900})
  errors=[]
  page.on('pageerror', lambda e: errors.append(str(e)))
  page.set_content('<!doctype html><html><body><main><h1>Test</h1><form><label>Content<textarea data-forum-composer maxlength="8000"></textarea></label><button type="button">Save</button></form></main></body></html>')
  page.add_script_tag(content=(ROOT/'assets/js/forum-composer.js').read_text())
  page.evaluate('window.GroundUpForumEditor.decorateAll()')
  assert page.locator('.gu-forum-editor').count()==1
  textarea=page.locator('textarea');textarea.fill('[b]Market[/b] [url=https://example.com]Source[/url] [code]<script>alert(1)</script>[/code]')
  page.locator('.gu-preview-toggle').click()
  assert page.locator('.gu-forum-preview strong').inner_text()=='Market'
  assert page.locator('.gu-forum-preview a').get_attribute('href')=='https://example.com/'
  assert page.locator('.gu-forum-preview script').count()==0
  assert '<script>' not in page.locator('.gu-forum-preview').inner_html()
  textarea.fill('[url=javascript:alert(1)]bad[/url]');assert page.locator('.gu-forum-preview a').count()==0
  page.locator('button[aria-label="Bold"]').click();assert '[b]' in textarea.input_value()
  assert not errors,errors
  print('PASS: safe preview, formatting, restricted link schemes, single editor binding')

  page2=browser.new_page(viewport={'width':1440,'height':900})
  errors2=[];page2.on('pageerror',lambda e: errors2.append(str(e)))
  page2.set_content('<!doctype html><html><body><header><div class="nav"><a href="/">Brand</a></div></header><main><h1>Home</h1></main></body></html>')
  page2.evaluate('''window.getSupabaseClient = async()=>({auth:{getSession:async()=>({data:{session:{access_token:'demo-token',user:{id:'user-12'}}}})}});''')
  page2.evaluate("""window.fetch=async (url)=>{const path=String(url);if(path.includes('site-announcements'))return new Response(JSON.stringify({ok:true,announcements:[{id:12,title:'Scheduled maintenance',body:'Sunday evening',announcement_type:'maintenance'}]}),{status:200});if(path.includes('ui-state')&&path.includes('notifications_read'))return new Response(JSON.stringify({ok:true}),{status:200});if(path.includes('ui-state')&&path.includes('notifications'))return new Response(JSON.stringify({ok:true,notifications:[{id:19,title:'Lab results ready',body:'Your assessment is available',created_at:'2026-10-13T12:00:00Z',is_read:false}]}),{status:200});return new Response('{}',{status:200});};""")
  page2.add_script_tag(content=(ROOT/'assets/js/frontend-complete.js').read_text())
  page2.wait_for_timeout(650)
  assert page2.locator('.fe-notify-button').count()==1,errors2
  page2.evaluate("document.getElementById('fe-onboarding')?.close()")
  page2.locator('.fe-notify-button').click()
  page2.wait_for_timeout(500)
  assert page2.locator('.gu-alert-announcement').count()==1, errors2
  assert 'Scheduled maintenance' in page2.locator('#fe-notifications').inner_text()
  assert 'Lab results ready' in page2.locator('#fe-notifications').inner_text()
  page2.locator('#fe-notifications .fe-dialog-close').click()
  page2.add_script_tag(content=(ROOT/'assets/js/production-completion.js').read_text())
  page2.wait_for_timeout(650)
  page2.locator('.fe-notify-button').click()
  assert page2.locator('#v132-notifications').count()==0, 'Legacy notification handler intercepted Alerts'
  assert page2.locator('#fe-notifications').is_visible()
  assert not [e for e in errors2 if 'TypeError' in e],errors2
  print('PASS: Alerts includes scheduled announcements and personal notifications')
  browser.close()
if __name__=='__main__':main()
