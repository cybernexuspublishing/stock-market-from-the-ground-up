"""Chromium fixtures for consolidated v0.13.5.7.2; do not claim live Cloudflare/Supabase proof."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,768,390):
  page=browser.new_page(viewport={'width':width,'height':980});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('''<!doctype html><html><head></head><body><main id="main"><div id="v132-home"><section class="v132-home-hero"><div class="wrap v132-home-hero-grid"><div id="heading"><h1>Learn and practice</h1></div><div id="panel"><h2>Historical Labs</h2></div></div></section></div></main></body></html>''')
  page.add_style_tag(path=str(R/'assets/css/control-center.css'))
  page.evaluate("""() => {window.fetchCount=0;window.fetch=async()=>{window.fetchCount++;return {ok:true,json:async()=>({ok:true,show:true,online:7,registered:51,mode:'live',label:'Recent activity estimate'})}};}""")
  source=(R/'assets/js/home-community.js').read_text().replace("if(!['/','/index.html'].includes(location.pathname.toLowerCase()))return;",'')
  page.add_script_tag(content=source)
  page.wait_for_function("document.querySelector('#v1353-member-stats [data-online]')?.textContent==='7'",timeout=5000)
  assert page.locator('#v1353-member-stats').count()==1
  assert page.locator('#heading').count()==1 and page.locator('#panel').count()==1
  assert page.evaluate('window.fetchCount')==1, 'Duplicate startup fetch'
  assert not errors,errors
  print('PASS HOMEPAGE',width,'left member panel, native redesigned hero preserved, one fetch')
  page.close()
 # Shared Lab sections deliver identical content to learner and preview.
 page=browser.new_page(viewport={'width':900,'height':800});page.set_content('<html><body><div id="host"></div></body></html>')
 page.add_script_tag(path=str(R/'assets/js/lab-narrative.js'))
 result=page.evaluate('''() => {const lab={title:'Evidence-based exercise',metadata:{what:'Realistic <script>danger</script>',why:'Avoid hindsight',when:'Historical replay',objective:'Explain risk',how:['Identify previous low','Document invalidation'],historical_tape_warning:'No tape data available'}};const s=GroundUpLabNarrative(lab);document.querySelector('#host').innerHTML=s;return s;}''')
 assert '&lt;script&gt;' in result and page.locator('script').count()==1
 assert page.locator('#host .v133-lab-four article').count()==4
 assert page.locator('#host .v133-lab-steps li').count()==2
 print('PASS SHARED LAB', 'one escaped narrative component; 4 teaching pillars; no executable metadata')
 page.close()
 # Validate full account editing script from merged admin Ops bundle still defines editor.
 page=browser.new_page(viewport={'width':1200,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('''<html><body><div id="admin-gate" hidden></div><div id="admin-app"><div class="admin-panel"></div></div><nav id="admin-tabs"></nav></body></html>''')
 source=(R/'assets/js/admin-operations.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;",'')
 source=source.replace(r"if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;",'')
 page.add_script_tag(content=source)
 page.wait_for_function('Boolean(window.GroundUpAccountEditor)',timeout=5000)
 assert page.evaluate('typeof window.GroundUpAccountEditor.openById')=='function'
 assert not errors,errors
 print('PASS ADMIN BUNDLE','account editor exposed, no uncaught errors')
 page.close()
 browser.close()
