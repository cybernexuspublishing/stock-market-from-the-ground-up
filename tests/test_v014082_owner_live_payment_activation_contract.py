"""v82: production payment activation must not bypass Stripe verification or edit books."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
act=(root/"supabase/admin/v0.14.0.82_OWNER_ENABLE_EIGHT_PAID_LIVE_CHECKOUT.sql").read_text()
checkout=(root/"functions/api/stripe-live-checkout-v01458.js").read_text()
webhook=(root/"functions/api/stripe-live-webhook-v01458.js").read_text()
store=(root/"store.html").read_text()
for p in ("FULL_MONTHLY","FULL_ANNUAL","LIFETIME","ONDEMAND_MONTHLY",
          "INTERACTIVE_LEARNING","JOURNAL_ANALYTICS","MARKET_SIMULATOR","MARKET_TUTOR"):
 assert "'"+p+"'" in act,p
for needle in ("BEGIN;","COMMIT;","GU82_MEMBERSHIP_CATALOG_MISMATCH",
 "GU82_TOOL_CATALOG_MISMATCH","GU82_LIVE_PAYMENT_DATABASE_CONTRACT_MISSING",
 "gu58_live_stripe_apply_event","checkout_enabled=true","enabled=false",
 "provider='STRIPE_MANAGED',enabled=true","value='true'::jsonb"):
 assert needle in act,needle
for forbidden in ("UPDATE public.catalog_products","UPDATE public.user_plan_grants",
 "UPDATE public.site_subscriptions","INSERT INTO public.site_orders",
 "UPDATE public.user_tool_passes","DELETE FROM public.","kdp_select",
 "GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED=true","GU58_STRIPE_LIVE_CATALOG_JSON"):
 assert forbidden not in act,forbidden
assert "GU58_LIVE_CHECKOUT_ENABLED" in checkout
assert "GU58_LIVE_WEBHOOK_ENABLED" in checkout
assert "GU58_LIVE_FULFILLMENT_APPROVED" in checkout
assert "GU58_LIVE_DB_CONTRACT_APPROVED" in checkout
assert "GU_PAYMENT_LIVE_LAUNCH_APPROVED" in checkout
assert "testModeOff(c)" in checkout
assert "verifyPrice(c" in checkout
assert "assertLiveAccount(c)" in checkout
assert "managed_payments[enabled]" in checkout
assert "checkHmac" in webhook
assert "gu58_live_stripe_apply_event" in webhook
assert "id=\"store-zero-monthly-qa\"" not in store
print("PASS v82: single Owner-only positive-price DB switch preserves signed payment gates, books and retired QA")
