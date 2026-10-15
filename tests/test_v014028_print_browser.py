"""Isolated component validation: trusted Lulu links only, no injected HTML."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
script=(ROOT/'assets/js/print-store-channels-v01428.js').read_text()
with sync_playwright() as p:
 binary=which('chromium') or which('google-chrome')
 browser=p.chromium.launch(headless=True,executable_path=binary,args=['--no-sandbox']) if binary else p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':320,'height':800})
 page.set_content('<html><body><main id="store-products"><article class="product-card" data-code="FOUNDATION_BOOK_1"><div class="library-actions"></div></article></main></body></html>')
 page.evaluate('''() => {
   window.CommerceTools={load:async()=>({products:[{productCode:'FOUNDATION_BOOK_1',title:'Foundations Book I',directPhysical:{enabled:true},salesStatus:'published',metadata:{print_checkout_links_v01428:{paperback:'https://books.lulu.com/pb',hardcover:'javascript:alert(1)'}}}]})};
 }''')
 # The external-route guard is checked by source tests; bypass it only for
 # this isolated DOM test running at about:blank with no live network.
 assert "if(!isStore&&!isPurchases)return;" in script
 page.add_script_tag(content=script.replace("if(!isStore&&!isPurchases)return;", "/* isolated route guard bypass */").replace("if(isPurchases){let n=0;", "if(false){let n=0;"))
 page.locator('[data-print-edition="paperback"]').wait_for(timeout=3000)
 assert page.locator('[data-print-edition="hardcover"]').count()==0
 assert page.locator('[data-print-edition="paperback"]').get_attribute('href')=='https://books.lulu.com/pb'
 assert 'noopener' in page.locator('[data-print-edition="paperback"]').get_attribute('rel')
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2')
 browser.close()
print('PASS v014028: browser storefront displays safe Lulu paperback link, blocks unsafe URL and remains usable at 320px.')
