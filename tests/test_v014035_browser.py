"""Isolated UI tests. Actual Cloudflare/Supabase/staging still require integration tests."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
common=(root/'assets/js/commerce-common.js').read_text()
membership=(root/'assets/js/membership-platform.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content('<!doctype html><html><body><div id="membership-current"></div><div id="membership-plans"></div><div id="tool-passes"></div><div id="membership-matrix"></div></body></html>')
 page.add_init_script('')
 page.evaluate('''() => {window.getSupabaseClient=async()=>({from:(x)=>({select:()=>({eq:()=>({eq:()=>({order:async()=>({data:x==='platform_plans'?window.plans:window.tools})})})})}),rpc:async()=>({data:{authenticated:true,planCode:'LIFETIME',planName:'Lifetime Platform Access',staffRoles:[]}})});window.plans=[
 {plan_code:'FULL_MONTHLY',name:'Full Monthly',price_cents:6999,billing_interval:'month',includes_all_tools:true,includes_all_books:true,description:'Monthly, companions; no ebook files.'},
 {plan_code:'FULL_ANNUAL',name:'Full Annual',price_cents:69900,billing_interval:'year',includes_all_tools:true,includes_all_books:true,description:'Annual, companions; no ebook files.'},
 {plan_code:'LIFETIME',name:'Lifetime',price_cents:249900,billing_interval:'lifetime',includes_all_tools:true,includes_all_books:true,description:'Lifetime eBooks when legally available.'},
 {plan_code:'PICK_WHAT_YOU_WANT',name:'Pick What You Want',price_cents:0,billing_interval:'month',includes_all_tools:false,includes_all_books:false,description:'Choose individual tools.'}];window.tools=[];}''')
 page.add_script_tag(content=membership)
 page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
 page.wait_for_timeout(300)
 txt=page.locator('#membership-plans').inner_text()
 assert 'Pick What You Want' in txt and 'Choose Your Tools' in txt
 assert 'Five designated eBook downloads' in txt
 assert 'operational life' in txt and 'All available book companion learning' in txt
 assert 'Enrollment Opening Soon' in txt
 assert 'never expires' not in txt.lower()
 # Product covers, even if Supabase product image URL is empty
 page.evaluate(common)
 for sku in ['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE']:
  val=page.evaluate('code=>window.CommerceTools.mapProduct({product_code:code,cover_image_url:""}).coverImageUrl',sku)
  assert val.endswith('.webp') and sku != ''
 browser.close()
print('PASS v014035: membership display and five per-book cover fallbacks, isolated browser')
