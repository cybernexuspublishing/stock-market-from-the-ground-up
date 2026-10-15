"""Isolated Stripe signed-book storefront usability: no live accounts or payments."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
script=Path(__file__).resolve().parents[1].joinpath('assets/js/store-signed-books-v01431.js').read_text()
HTML='''<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="store-products"><article data-code="FOUNDATION_BOOK_1" class="product-card"><h2>Book I</h2><div class="library-actions"></div></article></div></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=which('chromium') or which('google-chrome'))
 for available,expected in [(False,0),(True,2)]:
  page=browser.new_page(viewport={'width':320,'height':760})
  page.set_content(HTML)
  page.evaluate("""(available) => {window.fetch=async ()=>new Response(JSON.stringify({ok:true,available,quote:{code:'FOUNDATION_BOOK_1',title:'Book I',edition:'paperback',priceCents:2999,shippingCents:699}}),{status:200,headers:{'content-type':'application/json'}})}""",available)
  guard=r'if(!/^\/store(?:\.html)?$/.test(location.pathname))return;'
  assert guard in script
  page.add_script_tag(content=script.replace(guard,'/* isolated page guard replaced for DOM test */'))
  if available:
   page.locator('.gu-signed-offer').first.wait_for(timeout=7000)
   page.wait_for_timeout(650)
   buttons=page.locator('.gu-signed-offer button')
   assert buttons.count()==2,buttons.count()
   assert buttons.first.is_disabled()
   page.locator('.gu-signed-offer input[type=checkbox]').first.check()
   assert buttons.first.is_enabled()
  else:page.wait_for_timeout(700)
  assert page.locator('.gu-signed-offer button').count()==expected
  # No horizontal overflow from offer block at mobile width.
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+3')
  page.close()
 browser.close()

print('PASS v014031 browser: inactive offers hidden; active US physical edition buttons require terms; 320px layout acceptable.')
