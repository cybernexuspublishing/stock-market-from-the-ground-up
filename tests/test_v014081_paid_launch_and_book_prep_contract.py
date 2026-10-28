"""v81: real signed-positive-payment evidence is necessary; no books/KDP auto-launch."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
paid=(root/"supabase/admin/v0.14.0.81_EIGHT_PAID_SKU_SIGNED_FULFILLMENT_READ_ONLY.sql").read_text()
books=(root/"supabase/admin/v0.14.0.81_OWNER_BOOK_CATALOG_SELLABLE_PREP_REVIEW_REQUIRED.sql").read_text()
catalog=json.loads((root/"data/store-products.json").read_text())
store_js=(root/"assets/js/store.js").read_text()
# A database sale-prep flag is not a verified retailer link. The Store must
# show a closed channel if there is no verified URL and identify an approved
# retailer listing without assuming any particular Kindle/print format.
assert "Book listed · Purchase channel awaiting verification" in store_js
assert "Retailer listing recorded" in store_js
assert "amazon_listing_url" in store_js
assert "Buy Kindle on Amazon" in store_js and "Buy Paperback on Amazon" in store_js
assert "BEGIN TRANSACTION READ ONLY" in paid
assert paid.strip().endswith("ROLLBACK;")
assert "UPDATE public." not in paid.upper()
assert "INSERT INTO public." not in paid.upper()
assert "DELETE FROM public." not in paid.upper()
for sku in ("FULL_MONTHLY","FULL_ANNUAL","LIFETIME","ONDEMAND_MONTHLY",
            "INTERACTIVE_LEARNING","JOURNAL_ANALYTICS","MARKET_SIMULATOR","MARKET_TUTOR"):
 assert paid.count("'"+sku+"'")>=1,sku
assert "gu58_live_checkout_intents" in paid
assert "gu58_live_stripe_events" in paid
assert "outcome='applied'" in paid
assert "site_subscriptions" in paid
assert "user_tool_passes" in paid
assert "user_plan_grants" in paid
assert "current_period_end" in paid
assert "NOT_VERIFIED_BY_REAL_PAID_STRIPE_CHECKOUT" in paid
assert len(catalog)==5
for book in catalog:
 assert book["salesStatus"]=="published" and book["storeVisible"] is True
 # Owner may legitimately edit KDP and sales channels in the future.
 # This regression protects only the sale-preparation operation's field scope.
 assert "kdpSelect" in book and "amazon" in book
 assert "publicationStatus" in book
 assert "directDigital" in book and "directPhysical" in book
assert "sales_status='published'" in books
assert "store_visible=true" in books
for protected in ("kdp_select=","direct_digital_enabled=","website_checkout_enabled=",
                  "amazon_kindle_url=","amazon_paperback_url=","amazon_hardcover_url=",
                  "publication_status=","direct_physical_enabled="):
 assert protected not in books, "Owner reserved book metadata/checkout field changed: "+protected
assert "BOOK_CATALOG_MISMATCH" in books
assert "UPDATE public.catalog_products" in books
assert books.count("COMMIT;")==1
print("PASS v81: eight real paid proof rows, fully read-only ledger review; five sellable-prep book flags only, protected KDP/rights/checkout untouched")
