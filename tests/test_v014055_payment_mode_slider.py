"""v0.14.0.55 — accessibility + Owner LIVE/TESTING mode slider acceptance (mock only)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
script=(ROOT/'assets/js/admin-stripe-shadow-v01439.js').read_text(encoding='utf-8')
html='''<!doctype html><html><body><div id="admin-gate" hidden></div>
<div id="admin-app"><section class="admin-panel" data-admin-panel="commerce">
<div class="gu33-payment-hub"></div></section></div></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content(html)
 page.evaluate("""()=>{
  window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};
  window.confirm=()=>true;
  window.mock={mode:false,reads:0,writes:0,stage:'',shadowCheckoutCalls:0};
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'owner-test-jwt'}}})}});
  window.fetch=async(url,options={})=>{
   if(options.method==='POST'){
    window.mock.writes++;
    const payload=JSON.parse(options.body);
    if(payload.action==='checkout'){window.mock.shadowCheckoutCalls++;throw Error('Must not create payments');}
    if(payload.action!=='toggle')throw Error('Unexpected POST');
    window.mock.mode=payload.enabled;
    return new Response(JSON.stringify({ok:true,enabled:payload.enabled,updatedAt:'2026-10-17T20:30:00Z'}),{status:200});
   }
   window.mock.reads++;
   return new Response(JSON.stringify({ok:true,role:'OWNER',enabled:window.mock.mode,
      liveRouteGateOpen:false,liveLaunchApproved:false,cloudflareGate:true,priceIdsConfigured:8,
      updatedAt:'2026-10-17T20:30:00Z',intentCount:1,processedEventCount:0,shadowAccessCount:0}),{status:200});
  };
 }""")
 page.add_script_tag(content=script.replace('location.pathname', "'/admin.html'"))
 switch=page.locator('#gu39-payment-mode')
 switch.wait_for(timeout=5000)
 assert switch.get_attribute('role')=='switch'
 assert not switch.is_checked()
 assert switch.is_enabled()
 assert page.get_by_text('LIVE SELECTED · Real customer checkout is NOT approved.',exact=False).is_visible()
 assert page.get_by_role('button',name='Open Stripe Test Checkout').is_disabled()
 switch.check()
 page.get_by_text('TESTING ENABLED · New customer checkout is blocked',exact=False).wait_for(timeout=5000)
 assert switch.is_checked()
 assert page.locator('#gu39-shadow').get_by_text('Payment Mode',exact=True).count()==1
 assert page.get_by_role('button',name='Open Stripe Test Checkout').is_disabled()
 switch.uncheck()
 page.get_by_text('LIVE SELECTED · Real customer checkout is NOT approved.',exact=False).wait_for(timeout=5000)
 assert not switch.is_checked()
 stats=page.evaluate('window.mock')
 assert stats['writes']==2,stats
 assert stats['mode'] is False,stats
 assert stats['shadowCheckoutCalls']==0,stats
 assert 'Payment testing interface v0.14.0.55' in page.locator('#gu39-shadow').inner_text()
 print('PASS v55: OWNER accessible LIVE/TEST slider, backend-confirmed state, fail-closed live not approved, zero checkout attempts.')
 browser.close()
