from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,768,390):
  page=browser.new_page(viewport={'width':width,'height':860});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('''<!doctype html><html><head><meta charset="utf-8"></head><body><header class="site-header"><nav class="navlinks"><a class="nav-cta" href="account.html">Profile</a></nav></header><main class="wrap"></main></body></html>''')
  page.evaluate("""() => {const NativeURL=window.URL;window.URL=class extends NativeURL{constructor(url,base){super(url,base==='null'?'https://test.example':base)}}}""")
  page.add_style_tag(path=str(R/'assets/css/platform.css'));page.add_style_tag(path=str(R/'assets/css/production.css'))
  raw=(R/'assets/js/navigation.js').read_text().split('/* CANONICAL_DESKTOP_NAV */\n',1)[1]
  assert raw.endswith('})();\n')
  # Expose only the already implemented browser renderer to a mock test, not in production.
  source=raw[:-6]+"window.__testMakeNav=makeNav;\n})();\n"
  page.add_script_tag(content=source)
  page.wait_for_function('Boolean(window.__testMakeNav)',timeout=2000)
  access={'authenticated':True,'username':'ExampleReader','planCode':'FULL_MONTHLY','staffRoles':['OWNER'],'controlPanel':True,'books':[],'tools':[]}
  page.evaluate('''(a)=>window.__testMakeNav(a,[{item_code:'TOP_SAFE',label:'Secure link',href:'javascript:alert(1)',menu_group:'top',active:true,public_visible:true,auth_mode:'any'},{item_code:'TOP_STORE',label:'Store',href:'/store.html',menu_group:'top',active:true,public_visible:true,auth_mode:'any'}])''',access)
  nav=page.locator('.navlinks')
  assert nav.locator('.v11-profile-group').count()==1, 'Missing authoritative profile group'
  menu=nav.locator('.v11-profile-group .v11-menu')
  assert menu.locator('a',has_text='Dashboard').count()==1
  assert menu.locator('a',has_text='Admin Control Center').count()==1
  assert menu.locator('a').count()==10
  assert menu.locator('a',has_text='Security / MFA').count()==1
  assert nav.locator('a',has_text='Skill Assessments').count()==1
  assert nav.locator('a',has_text='Replay Training').count()==1
  assert nav.locator('a',has_text='Books & Previews').count()==1
  assert nav.locator('.account-dropdown').count()==0
  assert page.locator('a.v12-top-link',has_text='Secure link').get_attribute('href')=='#', 'Unsafe navigation destination allowed'
  trigger=nav.locator('.v12-profile-button')
  if width==1440:
   trigger.hover();assert trigger.get_attribute('aria-expanded')=='true'
   page.evaluate("document.body.dispatchEvent(new MouseEvent('click',{bubbles:true}))"); assert trigger.get_attribute('aria-expanded')=='false'
   trigger.focus();assert trigger.get_attribute('aria-expanded')=='true'
   trigger.press('Escape');assert trigger.get_attribute('aria-expanded')=='false'
   trigger.click();assert trigger.get_attribute('aria-expanded')=='true'
  else:
   trigger.click(); assert trigger.get_attribute('aria-expanded')=='true'
  page.evaluate('window.__testMakeNav({authenticated:false,planCode:"FREE",staffRoles:[]},[])')
  assert page.locator('.v11-profile-group').count()==0
  assert page.locator('.nav-cta.v12-signin').count()==1
  assert not errors,errors
  print('PASS NAVIGATION',width,'single OWNER menu, signed-out, role link, keyboard/hover/click')
  page.close()
 browser.close()
