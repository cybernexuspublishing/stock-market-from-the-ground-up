"""Frontend layout fixtures only: no real login, writes or payment operations.
Compare protected teaching canvases against the same Git baseline, and exercise
real canonical navigation with a synthetic session/access adapter.
"""
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
import json,mimetypes,subprocess,os
ROOT=Path('.').resolve();PUBLIC=ROOT/'public';OUT=ROOT/'artifacts/workspace-layout';OUT.mkdir(parents=True,exist_ok=True)
CHANGED=['assets/js/site.js','assets/js/navigation.js','assets/css/sitewide-composition-v014234.css']
baseline={p:subprocess.check_output(['git','show',os.getenv('GU_WORKSPACE_BASE_REF','HEAD')+':'+p]) for p in CHANGED}
STUB='''window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id:'qa-fixture',email:'fixture@example.test',user_metadata:{username:'Fixture'}},access_token:'fixture'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:{authenticated:true,planCode:'FREE',tools:[],books:[],staffRoles:[],controlPanel:false},error:null}),from:(table)=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:{username:'Fixture'}}),then:(r)=>Promise.resolve({data:table==='platform_plans'?window.__qaPlans:[],error:null}).then(r)};return q}});'''
plans=json.loads((ROOT/'data/commerce-config.json').read_text())['plans']
fixture_plans=[{'plan_code':v['planCode'],'name':v['label'],'price_cents':v['priceCents'],'billing_interval':v['billingInterval'],'checkout_enabled':False,'description':'Synthetic catalog fixture for layout testing.','active':True,'public_visible':True} for v in plans]
STUB='window.__qaPlans='+json.dumps(fixture_plans)+';'+STUB
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 def open_page(route,width,old=False):
  context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1,reduced_motion='reduce')
  def serve(r):
   u=urlparse(r.request.url);path=unquote(u.path).lstrip('/') or 'index.html'
   if u.netloc!='fixture.test' or path.startswith('api/'):
    r.fulfill(status=503,content_type='application/json',body='{"ok":false,"error":"Offline fixture"}');return
   if path=='assets/js/supabase-client.js':r.fulfill(content_type='text/javascript',body=STUB);return
   if '.' not in Path(path).name:path+='.html'
   f=PUBLIC/path
   if not f.is_file():r.fulfill(status=404,body='');return
   data=baseline[path] if old and path in baseline else f.read_bytes()
   r.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=data)
  context.route('**/*',serve)
  page=context.new_page();page.goto('https://fixture.test/'+route,wait_until='load')
  page.add_style_tag(url='https://fixture.test/assets/css/mobile-auth.css')
  page.add_style_tag(url='https://fixture.test/assets/css/sitewide-composition-v014234.css')
  # Production middleware loads the one canonical navigation module.
  page.add_script_tag(url='https://fixture.test/assets/js/navigation.js')
  page.wait_for_timeout(500)
  return context,page
 for width in [1440,1100,900,390]:
  for route in ['index.html','dashboard.html','admin.html','store.html','store-membership-free.html']:
   context,page=open_page(route,width)
   assert page.locator('body').get_attribute('data-gu-workspace') is not None,(route,'missing route scope')
   if route not in ['dashboard.html','admin.html']:
    page.locator('#gu-workspace-sidebar').wait_for(state='attached')
    assert page.locator('#gu-workspace-sidebar').count()==1
    assert page.locator('#gu-workspace-toggle').count()==1
    if width>900:
     learn=page.locator('.v11-nav-group').filter(has=page.locator('.v11-nav-button')).first
     trigger=learn.locator('button').first;trigger.focus();trigger.press('ArrowDown')
     assert trigger.get_attribute('aria-expanded')=='true'
     page.keyboard.press('Escape');assert trigger.get_attribute('aria-expanded')=='false'
     toggle=page.locator('#gu-workspace-toggle');toggle.click()
     assert page.locator('#gu-workspace-sidebar').is_hidden()
     assert toggle.get_attribute('aria-expanded')=='false'
     toggle.click();assert page.locator('#gu-workspace-sidebar').is_visible()
    else:assert page.locator('#gu-workspace-sidebar').is_hidden()
   if route in ['dashboard.html','admin.html']:
    toggle=page.locator('#gu-workspace-toggle');toggle.wait_for()
    target='#'+toggle.get_attribute('aria-controls')
    assert page.locator(target).is_visible()==(width>900)
    toggle.click();assert page.locator(target).is_visible()==(width<=900)
    toggle.click()
   if route=='store-membership-free.html':assert page.locator('.store-product-body').count()==1,'Product detail failed to render'
   if route=='store.html':
    assert page.locator('#store-plans .v11-plan').count()==5,'Synthetic Store plans failed to render'
    page.get_by_role('tab',name='Books',exact=True).click()
    assert page.locator('#store-panel-memberships').is_hidden()
    page.get_by_role('tab',name='Memberships',exact=True).click()
    assert page.locator('#store-panel-memberships').is_visible()
   assert page.evaluate('visualViewport.scale')==1
   page.wait_for_function('document.documentElement.scrollWidth <= innerWidth + 6',timeout=5000)
   page.screenshot(path=str(OUT/f'{route}-{width}.png'),full_page=True)
   results.append({'route':route,'width':width,'result':'PASS'})
   context.close()
 # Protect complete teaching routes using identical data/viewport and baseline assets.
 for width in [1440,390]:
  for route in ['labs.html','bootcamp-academy.html','lab-player.html','bootcamp.html']:
   metrics=[]
   for old in [True,False]:
    context,page=open_page(route,width,old)
    assert page.locator('body').get_attribute('data-gu-workspace') is None,(route,'protected teaching route opted in')
    assert page.locator('#gu-workspace-sidebar').count()==0
    metrics.append(page.locator('main').evaluate('(e)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}'))
    context.close()
   assert metrics[0]==metrics[1],(route,width,'teaching geometry changed',metrics)
   results.append({'route':route,'width':width,'result':'UNCHANGED','geometry':metrics[1]})
 browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2))
print('PASS 20 workspace viewport checks and 8 baseline teaching-layout comparisons. Synthetic layout fixtures; authenticated workflows NOT certified.')
