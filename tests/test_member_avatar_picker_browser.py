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
    if image.is_file():return r.fulfill(status=200,content_type='image/svg+xml',body=image.read_text())
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
  page.wait_for_function('document.querySelectorAll(".v2-avatar-tile").length===39',timeout=9000)
  assert tiles.count()==39,'Modal must present all nine original plus 30 new avatars'
  assert page.locator('dialog.v2-avatar-modal').is_visible()
  page.locator('[data-avatar-id="f13"]').click()
  assert page.locator('[data-avatar-id="f13"]').get_attribute('aria-pressed')=='true'
  assert page.evaluate('window.__applied.length')==0,'Selecting alone must not save'
  page.locator('[data-avatar-cancel]').click()
  page.wait_for_function('document.querySelectorAll("dialog.v2-avatar-modal").length===0',timeout=5000)
  assert page.evaluate('window.__applied.length')==0,'Cancel must not save'
  page.locator('#edit').click()
  page.locator('[data-avatar-id="m12"]').click()
  page.evaluate('window.__reject=true')
  page.locator('[data-avatar-apply]').click()
  page.get_by_text('Server rejected the change').wait_for(state='visible',timeout=5000)
  assert page.evaluate('window.__applied.length')==0
  page.evaluate('window.__reject=false')
  page.locator('[data-avatar-apply]').click()
  page.wait_for_function('window.__applied.length===1')
  assert page.evaluate('window.__applied[0].endsWith("/assets/avatars/av-m12.svg")')
  page.wait_for_function('document.querySelectorAll("dialog.v2-avatar-modal").length===0',timeout=5000)
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
 print('PASS 39 real avatar choices, Cancel/Apply/persistence failure handling, four Academy widths.')
if __name__=='__main__':run()
