"""Local Chromium fixtures: simulated Owner API, no Supabase or Cloudflare writes."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,860,390):
  page=browser.new_page(viewport={'width':width,'height':900})
  page.set_content('<base href="https://example.test/"><main><h1>Owner Plan Settings</h1><div id="plan-feedback"></div><section id="plan-manager"></section></main>')
  page.add_style_tag(path=str(R/'assets/css/plan-controls.css'))
  page.evaluate("window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture.jwt'}}})}})")
  page.route('**/api/plan-controls',lambda route:route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok':True,'plans':[{'name':'A & <script>alert(1)</script>','plan_code':'FULL_MONTHLY','price_cents':6999,'billing_interval':'month','active':True,'public_visible':True,'checkout_enabled':False},{'name':'Founding Monthly','plan_code':'FOUNDING_MONTHLY','price_cents':4999,'billing_interval':'month','active':False,'public_visible':False,'checkout_enabled':False}], 'checkoutRolloutEnabled':False})))
  page.add_script_tag(path=str(R/'assets/js/plan-controls.js'))
  page.wait_for_function("document.querySelectorAll('#plan-manager article').length===2")
  assert page.locator('#plan-manager script').count()==0,'Owner plan names cannot execute HTML'
  assert 'A & <script>' in page.locator('#plan-manager article h2').first.inner_text()
  assert page.locator('#plan-manager').evaluate('(el)=>el.scrollWidth<=el.clientWidth+2'),f'Plan grid overflow at {width}px'
  assert page.locator('#plan-manager article').nth(1).get_by_text('NO').count()>=1
  page.close()
 page=browser.new_page(viewport={'width':390,'height':850})
 page.set_content('<base href="https://example.test/"><main><div id="gws-msg"></div><section id="gws-projects"></section><form id="gws-form"><input name="projectCode"><input name="label"><input name="contactLabel"><input name="pageTitle"><textarea name="pageSummary"></textarea><textarea name="pageText"></textarea><button type="submit">Save</button></form></main>')
 page.evaluate("window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture.jwt'}}})}})")
 page.route('**/api/gws-projects',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True,'projects':[{'project_code':'EXAMPLE','label':'<img src=x onerror=alert(1)>','page_title':'Draft','page_blocks':[],'status':'draft'}],'publishingEnabled':False})))
 page.add_script_tag(path=str(R/'assets/js/gws-projects.js'))
 page.wait_for_function('document.querySelectorAll("#gws-projects button").length===1')
 assert page.locator('#gws-projects img').count()==0
 assert 'DRAFT' in page.locator('#gws-projects').inner_text()
 browser.close()
print('PASS Owner membership and GWS browser fixtures at 1440/860/390; no XSS and no plan grid horizontal overflow')
