"""v0.14.0.12 layout/interaction check using production form markup and local CSS."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
R=Path(__file__).resolve().parent.parent
html=(R/'market-commons.html').read_text()
match=re.search(r'(<dialog id="v13-topic-dialog"[\s\S]*?</dialog>)',html)
assert match
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (360,800,1440):
  page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content('<!doctype html><html><body style="background:#071827;color:#ecf0f7"><main><h1>Market Commons</h1></main>'+match.group(1)+'</body></html>')
  for css in ['styles.css','forum-composer.css']:
   page.add_style_tag(content=(R/'assets/css'/css).read_text())
  page.add_script_tag(content=(R/'assets/js/forum-composer.js').read_text())
  page.evaluate('''() => {const d=document.querySelector('dialog');window.GroundUpForumEditor.decorateAll(d);d.showModal()}''')
  page.locator('#v13-topic-title').fill('Chart structure discussion')
  page.locator('#v13-topic-body').fill('[b]What happened at the VWAP reclaim?[/b]\nCheck volume and spread.')
  page.locator('.gu-preview-toggle').click()
  assert page.locator('.gu-forum-preview strong').inner_text()=='What happened at the VWAP reclaim?'
  assert page.locator('#v13-topic-title').is_visible()
  assert page.locator('#v13-topic-icon').is_visible()
  assert not errs,errs
  if width==1440:page.screenshot(path='/mnt/data/v0.14.0.12_market_commons_new_discussion_preview.png')
  page.close()
  print('PASS: responsive modern topic composer at',width)
 browser.close()
