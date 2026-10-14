from pathlib import Path
import re
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
 for name,formsel in [('training-editor.html','#author-form'),('gws-projects.html','#gws-form')]:
  for width in [1440,700,375]:
   page=browser.new_page(viewport={'width':width,'height':950})
   markup=(r/name).read_text()
   markup=re.sub(r'<script[^>]*></script>','',markup)
   markup=re.sub(r'<link[^>]+rel=\"stylesheet\"[^>]*>','',markup)
   css=(r/'assets/css/styles.css').read_text()+'\n'+(r/'assets/css/owner-editors.css').read_text()
   markup=markup.replace('</head>','<style>'+css+'</style></head>')
   page.set_content(markup,wait_until='domcontentloaded')
   if name=='training-editor.html':
    page.evaluate('''() => { window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}});window.fetch=async()=>new Response(JSON.stringify({ok:true,sets:[]}),{status:200});}''')
    page.add_script_tag(content=(r/'assets/js/training-editor.js').read_text())
   page.wait_for_timeout(150)
   bounds=page.locator(formsel).evaluate('e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})')
   assert bounds['right']<=width+1,(name,width,bounds)
   assert bounds['left']>=-1,(name,width,bounds)
   if name=='gws-projects.html':
    textarea=page.locator('#gws-form textarea[name=pageText]')
    assert textarea.count()==1
    rect=textarea.bounding_box();assert rect['width']>250 if width>400 else rect['width']>235
   if name=='training-editor.html':
    page.locator('#author-questions .v014-question-editor').wait_for(timeout=10000)
    a=page.locator('#author-questions .v014-question-editor').bounding_box()
    assert a['x']+a['width']<=width+1,(name,width,a)
   if width==1440:page.screenshot(path=f'/mnt/data/v01411_{name}.png',full_page=True)
   page.close()
 print('PASS v0.14.0.11 responsive owner editor layout at 1440,700,375px')
 browser.close()
