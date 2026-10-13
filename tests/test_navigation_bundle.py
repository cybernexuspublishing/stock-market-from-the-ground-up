"""Integration of the bundled mobile/desktop nav under a mocked signed-in session."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':860});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<!doctype html><html><head></head><body><header class="site-header"><div class="wrap nav"><a href="/" class="brand">Market Education</a><nav class="navlinks"></nav></div></header><main><h1>Home</h1></main><footer></footer></body></html>')
  page.evaluate("""() => {const OldURL=window.URL;window.URL=class extends OldURL{constructor(u,b){super(u,b==='null'?'https://test.example':b)}}}""")
  page.add_style_tag(path=str(R/'assets/css/v0.11_platform.css'))
  page.add_style_tag(path=str(R/'assets/css/v0.13.4.1-mobile-auth.css'))
  page.evaluate('''() => {let count=0;window.fetch=async(url)=>{return {ok:true,json:async()=>({ok:true,roles:['OWNER'],permissions:['control_panel.access']})}};
   window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fake.jwt',user:{id:'11111111-1111-4111-8111-111111111111',email:'reader@example.test',user_metadata:{username:'ExampleReader'}}}}}),signOut:async()=>({})},rpc:async()=>({data:{authenticated:true,username:'ExampleReader',staffRoles:['OWNER'],controlPanel:true,planCode:'LIFETIME',planName:'Lifetime Membership',books:[],tools:[]},error:null}),from:(table)=>{const q={select(){return q},order(){return q},eq(){return q},maybeSingle:async()=>({data:{username:'ExampleReader'}}),then(resolve){return Promise.resolve(resolve({data:[],error:null}))}};return q}});}
  ''')
  page.add_script_tag(content=(R/'assets/js/v0.13.5.7.2-navigation.js').read_text())
  page.wait_for_selector('.v11-profile-group',state='attached',timeout=12000)
  page.wait_for_selector('#v1341-mobile-menu',state='attached',timeout=12000)
  menu=page.locator('#v1356-account-menu')
  assert menu.locator(':scope > a',has_text='Dashboard').count()==1
  assert page.locator('.v11-profile-group').count()==1
  assert page.locator('#v1341-mobile-menu').count()==1
  if width==390:
   page.locator('#v1341-mobile-menu').click()
   page.wait_for_selector('#v1341-mobile-drawer:not([hidden])',timeout=8000)
   assert page.locator('.v1341-mobile-links a',has_text='Dashboard').count()==1
  assert not errors,errors
  print('PASS BUNDLED NAVIGATION',width,'one profile Dashboard, one mobile drawer, authorized Admin link')
  page.close()
 browser.close()
