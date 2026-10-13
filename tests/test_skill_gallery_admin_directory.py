"""Visual + navigation tests with synthetic data; no live user or database."""
import re, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
script=(R/'assets/js/dashboard-ui-legacy.js').read_text().replace("if(!/\\/dashboard(\\.html)?$/.test(path)) return;", "/* fixture accepts pathname */")
assert 'const SKILL_ICON_CODES' in script
sql=(R/'supabase/migrations/v0.13.4_SKILLS_ADMIN_SHOWCASE.sql').read_text()
raw=re.findall(r"\('([A-Z0-9_]+)','([^']+)','([^']+)'",sql)
SKILLS=[{'code':code,'category':cat,'name':name,'status':'Not Yet Assessed','evidenceCount':0,'score':None} for code,cat,name in raw if cat in {'Core Chart Reading','Setups & Price Action','Risk & Execution','Research & Quality','Microstructure & Tape','Decision Process'}]
assert len(SKILLS)==30
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,860,390):
  page=browser.new_page(viewport={'width':width,'height':920})
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#041827;color:#fff"><main><div class="wrap" style="width:min(1100px,96vw);margin:auto"></div></main></body></html>')
  for css in ['styles.css','dashboard.css','polish.css','layout-integrity.css']:
   page.add_style_tag(path=str(R/'assets/css'/css))
  page.evaluate('''(skills)=>{window.history.replaceState=()=>{};window.PlatformAccess={get:async()=>({username:'Fixture',books:[],tools:[],staffRoles:[],planCode:'FREE',planName:'Free Membership'})};window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id:'fixture'},access_token:'fake'}}})}});window.fetch=async url=>({ok:true,json:async()=>String(url).includes('competencies')?{ok:true,skills,related:{labs:[]},snapshot:{}}:{ok:true,activity:[],preferences:[]}});window.SiteUI={toast:()=>{}};}''',SKILLS)
  page.add_script_tag(content=script)
  page.wait_for_selector('[data-v1322-tab="skills"]',timeout=9000)
  page.locator('[data-v1322-tab="skills"]').click()
  page.wait_for_selector('.v134-skill-card',timeout=6000)
  assert page.locator('.v134-skill-card').count()==30
  assert page.locator('.v134-skill-thumb img').count()==30
  assert not errs,(width,errs)
  boxes=page.evaluate('''()=>({pageOverflow:document.documentElement.scrollWidth-innerWidth, cards:[...document.querySelectorAll('.v134-skill-card')].map(el=>({x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}))})''')
  assert boxes['pageOverflow']<=3,(width,boxes)
  assert all(c['scroll']<=c['client']+3 for c in boxes['cards']),(width,boxes)
  assert (R/'assets/images/skill-illustrations/vwap-context.svg').exists()
  print('PASS SKILLS',width,'30 tiles, 30 pictures, no horizontal overflow')
  page.close()
 for grouped in (False,True):
  page=browser.new_page(viewport={'width':1360,'height':950})
  page.set_content(f'''<!doctype html><html><body style="background:#061827;color:white"><div id="admin-gate" hidden></div><div id="admin-app"><section class="admin-panel active" id="legacy-panel">OLD</section></div><nav id="admin-tabs">{'<div class="v13-admin-group"><div class="v13-admin-group-title">Accounts &amp; Access</div>' if grouped else ''}<button type="button" data-panel="users">Accounts</button><button type="button" data-v1352-menu>Account Management</button><button type="button" data-panel="roles">Roles &amp; Permissions</button>{'</div>' if grouped else ''}</nav></body></html>''')
  for css in ['styles.css','admin-workflows.css']:
   page.add_style_tag(path=str(R/'assets/css'/css))
  page.evaluate('''()=>{window.opened=0;document.querySelector('[data-v1352-menu]').onclick=()=>window.opened++}''')
  page.add_script_tag(content=(R/'assets/js/admin-workflows.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;",'/* fixture simulated */'))
  page.wait_for_selector('#cc-directory-trigger',timeout=7000)
  page.locator('#cc-directory-trigger').click()
  assert page.locator('.cc-directory-card').count()>30
  page.locator('.cc-directory-card[data-kind="menu"]').first.click()
  assert page.evaluate('window.opened')==1
  assert page.locator('[data-v1352-menu]').count()==1
  print('PASS ADMIN DIRECTORY', 'grouped' if grouped else 'ungrouped','30+ real workflow links and account routing')
  page.close()
 browser.close()
