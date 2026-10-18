"""v0.14.0.56 — One Owner button runs the full audit and resolves prior shadow-only intent."""
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
  window.mock={audits:0,reconciles:0,checkoutCalls:0,resolved:false};
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-owner-jwt'}}})}});
  const incident='22222222-2222-4222-8222-222222222222';
  const checks7=Array.from({length:7},(_,i)=>({check:'Config '+(i+1),status:'PASS',detail:'Ready'}));
  const checks9=Array.from({length:9},(_,i)=>({name:i===8?'No recent unreconciled Stripe TEST intents':'Checkout '+(i+1),
    status:i===8&&!window.mock.resolved?'BLOCKED':'PASS',
    detail:i===8&&!window.mock.resolved?'Earlier attempt needs reconciliation':'Ready'}));
  window.fetch=async(url,options={})=>{
   const href=String(url);
   if(options.method==='POST'){
    const data=JSON.parse(options.body);
    if(data.action==='checkout'){window.mock.checkoutCalls++;throw Error('Checkout must NOT run in this browser test');}
    if(data.action==='reconcile'){
     window.mock.reconciles++;window.mock.resolved=true;
     return new Response(JSON.stringify({ok:true,action:'MARKED_UNBOUND_TEST_FAILED',testOnly:true,
       liveCheckout:false}),{status:200});
    }
    throw Error('Other POST not expected');
   }
   if(href.includes('view=complete-review')){
    window.mock.audits++;
    const ready=window.mock.resolved;
    return new Response(JSON.stringify({ok:true,selectedSku:'plan:FULL_MONTHLY',version:'0.14.0.56',
      mode:'TESTING',config:{checks:checks7,passed:7,total:7},
      checkout:{checks:checks9,safeToAttemptTest:ready,passed:ready?9:8,total:9},
      catalog:{allVerified:true,productsVerified:8,pricesVerified:8},
      pending:ready?{totalUnbound:0,results:[],safeToReconcile:false}:{
        totalUnbound:1,results:[{intentId:incident,status:'NO_MATCH_FOUND',
          createdAt:'2026-10-18T00:39:34Z',matchedSessions:0}],safeToReconcile:true},
      checksPassed:ready?17:16,totalChecks:17,readyForSingleSandboxCheckout:ready,
      production:{liveCheckoutApproved:false},writesPerformed:false,providerCheckoutCreated:false}),{status:200});
   }
   return new Response(JSON.stringify({ok:true,role:'OWNER',enabled:true,liveRouteGateOpen:false,
     cloudflareGate:true,priceIdsConfigured:8,updatedAt:'2026-10-18T00:39:35Z',
     intentCount:1,processedEventCount:0,shadowAccessCount:0}),{status:200});
  };
 }""")
 page.add_script_tag(content=script.replace('location.pathname', "'/admin.html'"))
 unified=page.get_by_role('button',name='Run Complete Payment Review — No Charge')
 unified.wait_for(timeout=5000)
 assert page.get_by_role('button',name='Open Stripe Test Checkout').is_disabled()
 unified.click()
 page.get_by_text('Complete payment review: 16 / 17 checks passed').wait_for(timeout=5000)
 assert page.get_by_role('button',name='Open Stripe Test Checkout').is_disabled()
 assert page.get_by_text('Earlier TEST attempts: 1 unbound record(s).',exact=False).is_visible()
 page.get_by_role('button',name='Resolve Existing TEST Attempt — No Charge').click()
 page.get_by_text('Complete payment review: 17 / 17 checks passed').wait_for(timeout=5000)
 assert page.get_by_role('button',name='Open Stripe Test Checkout').is_enabled()
 counts=page.evaluate('window.mock')
 assert counts['audits']==2,counts
 assert counts['reconciles']==1,counts
 assert counts['checkoutCalls']==0,counts
 assert 'Payment testing interface v0.14.0.56' in page.locator('#gu39-shadow').inner_text()
 print('PASS v56: Owner one complete review, blocked unresolved attempt, guarded TEST-only resolution and zero payment attempts.')
 browser.close()
