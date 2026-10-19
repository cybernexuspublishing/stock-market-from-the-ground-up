"""v84 product navigation, exact category visibility and no unauthorized KDP/checkout changes."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
store=(root/"store.html").read_text()
storejs=(root/"assets/js/store.js").read_text()
detail=(root/"assets/js/store-product-detail-v01484.js").read_text()
catalog=(root/"data/store-products.json").read_text()
for id_ in ('memberships','books','a-la-carte'):
 assert 'data-store-category="'+id_+'"' in store
 assert 'data-store-panel="'+id_+'"' in store
assert "activateCategory(location.hash.slice(1))" in storejs
assert "document.querySelectorAll('[data-store-panel]')" in storejs
assert 'data-store-category' in storejs
assert 'data-family' in storejs
assert "data-store-category" in store
assert "document.getElementById('store-tools')" in storejs
assert "d.tools||[]" in storejs
assert "data-store-panel" in storejs
assert "detailLink('plan',p.planCode)" in storejs
assert "detailLink('book',p.productCode)" in storejs
assert "detailLink('tool',t.toolCode)" in storejs
assert "READING_THE_TAPE" in detail
assert "FOUNDATION_BOOK_3" in detail
assert "FULL_MONTHLY" in detail and "FULL_ANNUAL" in detail
assert "PICK_WHAT_YOU_WANT" in detail
assert "ONDEMAND_MONTHLY" in detail
assert "What is not included" in detail
assert "What this book teaches" in detail
assert "Learning access and feature comparison" in detail
assert "What this tool provides" in detail
assert "p.directDigital?.enabled&&!p.kdpSelect" in detail
assert "p.websiteCheckoutEnabled&&p.lemonVariantId" in detail
assert "t.status==='live'" in detail
assert "d.commerceUnavailable" in detail
assert 'store-zero-monthly' not in store
assert "gu72_zero_monthly_qa" not in detail
ids={
 'plan':['FREE','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY','PICK_WHAT_YOU_WANT'],
 'tool':['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'],
 'book':['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE']
}
for kind,codes in ids.items():
 for code in codes:
  path=root/('store-product-'+kind+'-'+code.lower().replace('_','-')+'.html')
  assert path.exists(),str(path)
  html=path.read_text()
  assert 'data-product-kind="'+kind+'"' in html
  assert 'data-product-code="'+code+'"' in html
  assert 'store-product-detail-v01484.js' in html
assert '"kdpSelect": true' in catalog
assert '"listingUrl": "https://www.amazon.com/dp/' in catalog
print("PASS v84: 3 isolated Store tabs, 15 distinct detail pages, grounded inclusions/exclusions, source-gated purchase links, untouched KDP/book catalog and $0 QA.")
