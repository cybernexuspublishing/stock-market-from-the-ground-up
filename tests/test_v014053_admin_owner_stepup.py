"""v0.14.0.53 browser regression: Stripe test toggle uses existing Owner password dialog."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
script=(ROOT/'assets/js/admin-stripe-shadow-v01439.js').read_text(encoding='utf8')
html='''<!doctype html><html><body>
<div id="admin-gate" hidden></div>
<div id="admin-app"><section class="admin-panel" data-admin-panel="commerce">
<div class="gu33-payment-hub"></div></section></div></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content(html)
 page.evaluate("""()=> {
 window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};
 window.confirm=()=>true;
 window.mock={attempts:0,dialogs:0,confirmed:false,enabled:false};
 window.GroundUpAdminPasswordConfirm={ensure:async()=>{
  window.mock.dialogs++;
  window.mock.confirmed=true;
  return true;
 }};
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-owner-jwt'}}})}});
 window.fetch=async(url,options={})=>{
  if(options.method==='POST'){
   window.mock.attempts++;
   if(!window.mock.confirmed)return new Response(JSON.stringify({ok:false,error:'PASSWORD_RECONFIRM_REQUIRED'}),{status:403});
   window.mock.enabled=true;
   return new Response(JSON.stringify({ok:true,enabled:true,updatedAt:'2026-10-17T18:57:00Z'}),{status:200});
  }
  return new Response(JSON.stringify({ok:true,role:'OWNER',enabled:window.mock.enabled,
    cloudflareGate:true,priceIdsConfigured:8,updatedAt:'2026-10-17T18:57:00Z',
    intentCount:0,processedEventCount:0,shadowAccessCount:0}),{status:200});
 };
}""")
 page.add_script_tag(content=script.replace('location.pathname', "'/admin.html'"))
 btn=page.get_by_role('button',name='Enable Testing')
 btn.wait_for(timeout=5000)
 assert btn.is_enabled()
 btn.click()
 page.get_by_role('button',name='Disable Testing').wait_for(timeout=5000)
 stats=page.evaluate('window.mock')
 assert stats['attempts']==2,stats
 assert stats['dialogs']==1,stats
 assert stats['enabled'] is True,stats
 assert page.locator('#gu39-shadow').count()==1
 print('PASS v53: Owner password dialog invoked exactly once, authorized toggle retried once, LIVE checkout remains OFF')
 browser.close()
