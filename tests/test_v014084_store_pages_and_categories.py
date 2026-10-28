"""v84: product category isolation, unique detail URLs, safe checkout, owner-controlled book fields."""
from pathlib import Path
from html.parser import HTMLParser
import json,re
root=Path(__file__).resolve().parent.parent
store=(root/"store.html").read_text()
script=(root/"assets/js/store.js").read_text()
details=(root/"assets/js/store-product-detail-v01484.js").read_text()
css=(root/"assets/css/store-catalog-v01484.css").read_text()
guide=json.loads((root/"data/store-product-guides-v01484.json").read_text())
books=json.loads((root/"data/store-products.json").read_text())
expected={
 'plan':{'FREE':'store-membership-free.html','FULL_MONTHLY':'store-membership-full-monthly.html','FULL_ANNUAL':'store-membership-full-annual.html','LIFETIME':'store-membership-lifetime.html','ONDEMAND_MONTHLY':'store-membership-ondemand-monthly.html'},
 'book':{'FOUNDATION_BOOK_1':'store-book-foundation-1.html','FOUNDATION_BOOK_2':'store-book-foundation-2.html','FOUNDATION_BOOK_3':'store-book-foundation-3.html','DAY_TRADING_BOOK_1':'store-book-day-trading-1.html','READING_THE_TAPE':'store-book-reading-the-tape.html'},
 'tool':{'INTERACTIVE_LEARNING':'store-tool-interactive-learning.html','JOURNAL_ANALYTICS':'store-tool-journal-analytics.html','MARKET_SIMULATOR':'store-tool-market-simulator.html','MARKET_TUTOR':'store-tool-market-tutor.html'}
}
class Tags(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[]
 def handle_starttag(self,t,a):
  if t not in ('meta','link','img','br','input','hr','source','area','base','embed','param','track','wbr'):
   self.stack.append(t)
 def handle_endtag(self,t):
  assert self.stack,('extra_close',t)
  top=self.stack.pop();assert top==t,('mismatched',top,t)
def valid_html(s):
 t=Tags();t.feed(s);assert not t.stack,t.stack
valid_html(store)
for category in ('founders','books','tools'):
 assert store.count('id="store-tab-'+category+'"')==1
 assert store.count('id="store-panel-'+category+'"')==1
 assert 'aria-controls="store-panel-'+category+'"' in store
 assert 'role="tabpanel"' in store
 assert 'store.html#' in details
# Owner directed old public Memberships selection hidden; existing member and
# billing records remain available to their authenticated owners.
assert store.count('id="store-tab-memberships"')==1
assert 'id="store-tab-memberships"' in store and 'data-store-category="memberships" hidden' in store, 'Future public Membership tab stays hidden during founding beta'
assert store.count('id="store-panel-memberships"')==1
assert 'aria-selected="true"' in store
assert 'ArrowLeft' in script and 'ArrowRight' in script and "e.key==='Home'" in script
assert ".filter(p=>p.type==='book'" in script
assert "t.status==='live'&&Number(t.priceCents)>0" in script
assert 'membershipIds.includes(p?.planCode)' in script
assert 'approvedPlanCatalog' in script
assert "new Set(items.map(p=>p.planCode)).size!==items.length" in script
assert "toolPaths" in script and "bookPaths" in script and "planPaths" in script
assert 'id="store-founder-compare"' in store
assert 'aria-label="Founding membership benefit comparison"' in store
assert 'id="store-member-plans"' in store
assert 'approvedPlanCatalog' in script
assert "scope=\"col\"" in script and "scope=\"row\"" in script
assert "store-zero-monthly" not in store
assert "store-zero-monthly" not in script
assert "checkout.stripe.com" not in details
assert "api/stripe-live-checkout" not in details
assert "checkout.html?type=plan" in details
assert "checkout.html?type=tool" in details
assert "p.websiteCheckoutEnabled&&!p.kdpSelect&&p.lemonVariantId" in details
assert "p.directDigital?.enabled&&!p.kdpSelect" in details
assert "p.directPhysical?.enabled&&p.directPhysical?.checkoutUrl" in details
assert "money(t.priceCents)" in details
assert "html" not in guide["plans"]["FULL_MONTHLY"]["summary"].lower()
assert len(books)==5
assert set(expected['book'])=={x['productCode'] for x in books}
for typ,items in expected.items():
 assert set(items).issubset(set(guide[{'plan':'plans','book':'books','tool':'tools'}[typ]]))
 for code,path in items.items():
  assert path in script and (root/path).is_file()
  file=(root/path).read_text();valid_html(file)
  assert f'data-product-type="{typ}"' in file
  assert f'data-product-code="{code}"' in file
  assert "store-product-detail-v01484.js" in file
  assert '<meta name="description"' in file
  assert "store.html#" in file
for path in ('store-membership-replay-training.html','store-product.html'):
 assert (root/path).is_file();valid_html((root/path).read_text())
assert (root/"store.html").read_text().count('store-catalog-v01484.css')==1
assert "role=tab" in css and ":focus-visible" in css
# No existing customer book records, KDP metadata, prices, storefront direct
# sale switches or forum moderation routes are changed by this release.
assert not any(k in details for k in ("from('catalog_products').update","from('platform_plans').update","rpc('gu","stripe.checkout.sessions.create"))
print("PASS v84: strict storefront tabs; 15 distinct static product pages + safe catalog fallback; metadata and signed payments unchanged.")
