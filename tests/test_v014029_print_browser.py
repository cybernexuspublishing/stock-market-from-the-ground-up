"""Isolated test for v29 store channel rendering. No payment or Supabase network."""
from pathlib import Path
from playwright.sync_api import sync_playwright
JS=(Path(__file__).resolve().parents[1]/'assets/js/print-store-channels-v01428.js').read_text()
BASE_HTML='''<!doctype html><html><body><div id="store-products"><article class="product-card" data-code="FOUNDATION_BOOK_1"><div class="library-actions"><a href="https://lulu.com/test-checkout">Buy Physical Edition Direct</a></div></article></div><script>window.CommerceTools={load:async()=>({products:[{
  productCode:'FOUNDATION_BOOK_1',title:'Foundations Book I',salesStatus:'published',kdpSelect:true,
  directPhysical:{enabled:true},directDigital:{enabled:false},metadata:{
   print_checkout_links_v01428:{paperback:'https://www.lulu.com/test-paperback'},
   print_fulfillment_v01429:window.__POLICY__
  }
}]})};</script></body></html>'''
def run_case(context,policy,expected_lulu,expected_signed):
    page=context.new_page()
    page.set_content(BASE_HTML)
    page.evaluate('({policy,script}) => {window.__POLICY__=policy; const location={pathname:"/store.html"}; eval(script)}',{"policy":policy,"script":JS})
    page.wait_for_timeout(420)
    links=page.locator('.library-actions a')
    signed=page.locator('[data-gu-signed-copy]')
    assert links.count()==expected_lulu,(policy,links.count())
    assert signed.count()==expected_signed,(policy,signed.count())
    page.close()
if __name__=='__main__':
 with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
    context=browser.new_context()
    run_case(context,{'signed_available':True,'lulu_enabled':False},0,1)
    run_case(context,{'signed_available':False,'lulu_enabled':True},2,0)
    run_case(context,{'signed_available':True,'lulu_enabled':True},2,1)
    run_case(context,{'signed_available':False,'lulu_enabled':False},0,0)
    context.close();browser.close()
 print('PASS v014029: signed copy is never a checkout, optional Lulu respected for every flag combination')
