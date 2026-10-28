"""Noncharging browser acceptance for the member avatar picker and Academy width."""
from pathlib import Path
import json
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CATALOG=(ROOT/'assets/avatars/catalog-v2.json').read_text()
HTML='''<!doctype html><html><head><title>Avatar Picker Noncharging QA</title></head>
<body><button id="edit" type="button">Edit Picture</button></body></html>'''

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  page=browser.new_page(viewport={"width":1440,"height":900})
  def route(r):
   path=urlsplit(r.request.url).path
   if path=='/assets/avatars/catalog-v2.json':
    return r.fulfill(status=200,content_type='application/json',body=CATALOG)
   if path.startswith('/assets/avatars/av-'):
    name=Path(path).name
    image=ROOT/'assets/avatars'/name
    if image.is_file():return r.fulfill(status=200,content_type='image/webp' if image.suffix=='.webp' else 'image/svg+xml',body=image.read_bytes())
   return r.fulfill(status=200,content_type='text/html',body=HTML)
  page.route('https://avatar-qa.test/**',route)
  page.goto('https://avatar-qa.test/profile')
  page.add_script_tag(path=str(ROOT/'assets/js/member-avatar-picker-v2.js'))
  page.evaluate("""() => {
   window.__applied=[];window.__reject=false;
   document.getElementById('edit').addEventListener('click',()=>window.GroundUpAvatarPicker.open({
    currentUrl:'https://stock-market-from-the-ground-up-d1r.pages.dev/assets/avatars/av-f1.svg',
    onApply: async url=>{if(window.__reject)throw Error('Server rejected the change');window.__applied.push(url)}
   }));
  }""")
  page.locator('#edit').click()
  tiles=page.locator('.v2-avatar-tile')
  page.wait_for_function('document.querySelectorAll(".v2-avatar-tile").length===60',timeout=9000)
  assert tiles.count()==60,'Modal must present 60 avatars'
  assert page.locator('dialog.v2-avatar-modal').is_visible()
  page.locator('[data-avatar-style="illustrated"]').click()
  assert page.locator('[data-avatar-id="r02"]').is_hidden()
  page.locator('[data-avatar-id="f13"]').click()
  assert page.locator('[data-avatar-id="f13"]').get_attribute('aria-pressed')=='true'
  assert page.evaluate('window.__applied.length')==0,'Selecting alone must not save'
  page.locator('[data-avatar-cancel]').click()
  page.wait_for_function('document.querySelectorAll("dialog.v2-avatar-modal").length===0',timeout=5000)
  assert page.evaluate('window.__applied.length')==0,'Cancel must not save'
  page.locator('#edit').click()
  page.locator('[data-avatar-style="all"]').click()
  page.locator('[data-avatar-id="m12"]').click()
  page.evaluate('window.__reject=true')
  page.locator('[data-avatar-apply]').click()
  page.get_by_text('Server rejected the change').wait_for(state='visible',timeout=5000)
  assert page.evaluate('window.__applied.length')==0
  page.evaluate('window.__reject=false')
  page.locator('[data-avatar-apply]').click()
  page.wait_for_function('window.__applied.length===1')
  assert page.evaluate('window.__applied[0].endsWith("/assets/avatars/av-m12.webp")')
  page.wait_for_function('document.querySelectorAll("dialog.v2-avatar-modal").length===0',timeout=5000)
  page.close()


  # Integrated Dashboard profile → dialog → authenticated member-profile save.
  # The provider endpoint is mocked; no live member records are changed.
  stored={'gender':'female','bio':'Existing member biography','avatarUrl':
   'https://stock-market-from-the-ground-up-d1r.pages.dev/assets/avatars/av-f1.svg','writes':[]}
  profile_html='''<!doctype html><html><body><section data-v1322-panel="settings">
    <div data-settings-body><span data-email>private@example.test</span></div>
    </section></body></html>'''
  def member_route(r):
   path=urlsplit(r.request.url).path
   if path=='/api/member-profile':
    if r.request.method=='POST':
     body=json.loads(r.request.post_data)
     assert body.get('action')=='save'
     stored['writes'].append(body)
     stored['gender']=body['gender'];stored['bio']=body['bio'];stored['avatarUrl']=body['avatarUrl']
    return r.fulfill(status=200,content_type='application/json',body=json.dumps({
     'ok':True,'profile':{'id':'a1','selectedTitle':'learner',**{k:stored[k] for k in ['gender','bio','avatarUrl']}},
     'choices':[{'code':'learner','label':'Market Learner'}]}))
   if path=='/assets/avatars/catalog-v2.json':
    return r.fulfill(status=200,content_type='application/json',body=CATALOG)
   if path.startswith('/assets/avatars/av-'):
    img=ROOT/'assets/avatars'/Path(path).name
    if img.is_file():return r.fulfill(status=200,content_type='image/webp' if img.suffix=='.webp' else 'image/svg+xml',body=img.read_bytes())
   return r.fulfill(status=200,content_type='text/html',body=profile_html)
  page=browser.new_page(viewport={'width':1200,'height':820})
  page.route('https://member-avatar-qa.test/**',member_route)
  page.goto('https://member-avatar-qa.test/dashboard.html')
  page.evaluate("""() => {
    window.getSupabaseClient=async()=>({auth:{getSession:async()=>({
      data:{session:{access_token:'synthetic',user:{id:'a1'}}},error:null
    })}})
  }""")
  page.add_script_tag(path=str(ROOT/'assets/js/member-avatar-picker-v2.js'))
  page.add_script_tag(path=str(ROOT/'assets/js/member-profile-ui-v1.js'))
  page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
  page.locator('[data-edit-picture]').wait_for(timeout=7500)
  page.locator('[data-edit-picture]').click()
  page.locator('.v2-avatar-inline').wait_for(state='visible')
  assert page.locator('dialog.v2-avatar-modal').count()==0,'Dashboard must not open the legacy modal'
  page.locator('[data-avatar-style="realistic"]').click()
  assert page.locator('[data-avatar-id="n13"]').is_hidden()
  page.locator('[data-avatar-id="r15"]').click()
  assert stored['writes']==[],'Selection must never trigger a profile write'
  page.locator('[data-avatar-apply]').click()
  page.wait_for_function("""() => document.querySelector('[data-avatar-preview]')?.getAttribute('src')?.endsWith('av-r15.webp')""")
  assert len(stored['writes'])==1,'Apply should submit one authenticated member-profile save'
  assert stored['avatarUrl'].endswith('/assets/avatars/av-r15.webp')
  page.locator('.v2-avatar-inline').wait_for(state='hidden')
  assert stored['gender']=='female' and stored['bio']=='Existing member biography','Unrelated profile fields changed'
  page.close()

  for width,expected_cols in [(1600,4),(950,3),(740,2),(390,1)]:
   page=browser.new_page(viewport={"width":width,"height":850})
   page.set_content('<body class="gu-bc-learning"><main class="section gu-redesign-academy">'+
    '<div class="wrap"><h1>Boot Camp Academy</h1><div id="academy-programs">'+
    ''.join('<article class="academy-program">A program</article>' for _ in range(7))+
    '</div></div></main></body>')
   page.add_style_tag(path=str(ROOT/'assets/css/bootcamp-academy-compact-v2.css'))
   geometry=page.evaluate("""() => ({
    width:document.querySelector('main>.wrap').getBoundingClientRect().width,
    cols:getComputedStyle(document.getElementById('academy-programs')).gridTemplateColumns.split(' ').length,
    overflow:document.documentElement.scrollWidth>innerWidth+4
   })""")
   assert geometry['width']<=min(1221,width),'Academy content should stay within the intended width'
   assert geometry['cols']==expected_cols,(width,geometry)
   assert not geometry['overflow'],(width,geometry)
   page.close()
  browser.close()
 print('PASS 30 premium avatars, Cancel/Apply, profile API integration (mocked), rejected saves, and four Academy widths.')
if __name__=='__main__':run()
