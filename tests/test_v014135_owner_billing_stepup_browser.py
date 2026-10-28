"""v135 production-bug regression: existing Owner password/Turnstile modal opens for protected billing GET.
All network responses mocked. No real password, provider operation, or protected database access.
"""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BILLING=(ROOT/'assets/js/admin-billing-reconciliation.js').read_text(encoding='utf-8')
PASSWORD=(ROOT/'assets/js/admin-password-confirm-v01432r1.js').read_text(encoding='utf-8')
# Isolated about:blank browser; keep all security-sensitive methods unchanged.
BILLING=BILLING.replace("if(!/^\\/admin(?:\\.html)?\\/?$/i.test(location.pathname))return;", "/* isolated browser route */")
PASSWORD=PASSWORD.replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;", "/* isolated browser route */")
assert "isolated browser route" in BILLING
assert "isolated browser route" in PASSWORD

HTML="""<!doctype html><html lang="en"><body>
<div id="admin-gate" hidden></div>
<div id="admin-app"><section class="admin-panel" data-admin-panel="commerce">
<div class="gu33-payment-hub"></div></section></div></body></html>"""
STUB="""(mode)=>{
 window.mock={reads:0,dialogs:0,confirms:0,confirmed:false,mode:mode,notices:0};
 window.ADMIN={ctx:{roles:['OWNER'],permissions:['commerce.view']}};
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({
  data:{session:{access_token:'fake-token-not-production'}}
 })}});
 window.turnstile={render:(_node,config)=>{
  window.mock.dialogs++;
  window.__challenge=config;
  return 12;
 },remove:()=>{},reset:()=>{}};
 window.fetch=async(path,init={})=>{
  const route=String(path);
  if(route==='/api/auth-guard-v0135')
   return Response.json({ok:true,enabled:true,sitekey:'sitekey-test-only'});
  if(route==='/api/admin-password-confirm-v01432r1'){
   window.mock.confirms++;
   const payload=JSON.parse(init.body);
   if(payload.password!=='testing-only' || payload.captchaToken!=='captcha-token')
    return Response.json({ok:false,error:'INVALID_CREDENTIALS'},{status:403});
   window.mock.confirmed=true;
   return Response.json({ok:true});
  }
  if(route==='/api/billing-reconciliation-health'){
   window.mock.reads++;
   if(mode==='denied')return Response.json({ok:false,error:'OWNER_ONLY'},{status:403});
   if(!window.mock.confirmed||mode==='persistent')
    return Response.json({ok:false,error:'PASSWORD_RECONFIRM_REQUIRED'},{status:403});
   return Response.json({ok:true,status:'NO_SIGNED_RECURRING_RECORDS',
    asOf:new Date().toISOString(),countsAgree:true,
    totals:{eligibleRecurringRecords:0,openIssues:0,previouslyResolvedIssues:0},
    categories:{plan:{eligibleRecurringRecords:0,unresolvedIssues:0,
      previouslyResolvedIssues:0,activityWithin48h:true,lastActivityAt:new Date().toISOString()},
     tool:{eligibleRecurringRecords:0,unresolvedIssues:0,
      previouslyResolvedIssues:0,activityWithin48h:true,lastActivityAt:new Date().toISOString()}},
    openIssuesByType:{},acceptance:{fullProviderSweep:'NOT_VERIFIED'}});
  }
  throw Error('Unapproved test network call '+route);
 };
}"""
def setup(browser,mode='approved',install_password=True):
 page=browser.new_page(viewport={'width':900,'height':800})
 page.set_content(HTML)
 page.evaluate(STUB,mode)
 if install_password:page.add_script_tag(content=PASSWORD)
 page.add_script_tag(content=BILLING)
 page.get_by_role('button',name='Review Billing Reconciliation — No Charge').wait_for()
 return page

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=which('chromium') or None,args=['--no-sandbox'])
 # Successful password re-confirmation triggers exactly one retry.
 page=setup(browser)
 page.get_by_role('button',name='Review Billing Reconciliation — No Charge').click()
 dialog=page.get_by_role('dialog',name='Confirm your password')
 dialog.wait_for()
 assert page.evaluate('window.mock.reads')==1
 assert page.evaluate('window.mock.dialogs')==1
 page.evaluate("window.__challenge.callback('captcha-token')")
 dialog.locator('input[type=password]').fill('testing-only')
 dialog.get_by_role('button',name='Confirm Password').click()
 page.get_by_text('NO PAID RECURRING RECORDS',exact=False).wait_for()
 assert page.locator('.gu-pw-dialog').count()==0
 assert page.evaluate('window.mock.reads')==2
 assert page.evaluate('window.mock.confirms')==1
 assert page.get_by_role('button',name='Review Billing Reconciliation — No Charge').is_enabled()
 page.close()

 # Cancellation never retries or reads private data.
 page=setup(browser)
 page.get_by_role('button',name='Review Billing Reconciliation — No Charge').click()
 page.get_by_role('dialog').wait_for()
 page.get_by_role('button',name='Cancel').click()
 page.get_by_text('Password confirmation was canceled',exact=False).wait_for()
 assert page.evaluate('window.mock.reads')==1
 assert page.evaluate('window.mock.confirms')==0
 assert page.get_by_role('button',name='Review Billing Reconciliation — No Charge').is_enabled()
 page.close()

 # Second 403 never reopens prompt recursively.
 page=setup(browser,'persistent')
 page.get_by_role('button',name='Review Billing Reconciliation — No Charge').click()
 page.get_by_role('dialog').wait_for()
 page.evaluate("window.__challenge.callback('captcha-token')")
 page.locator('.gu-pw-dialog input[type=password]').fill('testing-only')
 page.get_by_role('button',name='Confirm Password').click()
 page.get_by_text('has not been accepted',exact=False).wait_for()
 assert page.evaluate('window.mock.reads')==2
 assert page.evaluate('window.mock.dialogs')==1
 page.close()

 # Non-Owner cannot obtain private evidence; do not open Owner password dialog.
 page=setup(browser,'denied')
 page.get_by_role('button',name='Review Billing Reconciliation — No Charge').click()
 page.get_by_text('Only the Owner may view',exact=False).wait_for()
 assert page.locator('.gu-pw-dialog').count()==0
 assert page.evaluate('window.mock.reads')==1
 page.close()

 # Shared modal missing: explain the component failure rather than bypass auth.
 page=setup(browser,install_password=False)
 page.get_by_role('button',name='Review Billing Reconciliation — No Charge').click()
 page.get_by_text('component has not loaded',exact=False).wait_for()
 assert page.evaluate('window.mock.reads')==1
 page.close()
 browser.close()
print('PASS v135: existing dialog opens for Pages 403, confirms, retries once, cancel/deny/missing-module fail closed')
