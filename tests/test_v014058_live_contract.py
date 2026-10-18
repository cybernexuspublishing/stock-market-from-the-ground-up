"""Locked LIVE membership fulfillment source contract; no external writes."""
from pathlib import Path
p=Path(__file__).resolve().parents[1]
read=lambda name:(p/name).read_text(encoding='utf-8')
sql=read('supabase/migrations/v0.14.0.58_LIVE_MEMBERSHIP_FULFILLMENT_REVIEW_REQUIRED.sql')
checkout=read('functions/api/stripe-live-checkout-v01458.js')
webhook=read('functions/api/stripe-live-webhook-v01458.js')
middleware=read('functions/_middleware.js')
router=read('functions/api/checkout.js')

for term in ('GU_PAYMENT_LIVE_LAUNCH_APPROVED','GU58_LIVE_CHECKOUT_ENABLED',
             'GU58_LIVE_FULFILLMENT_APPROVED','GU58_LIVE_DB_CONTRACT_APPROVED',
             'GU58_STRIPE_LIVE_ACCOUNT_ID','GU58_STRIPE_LIVE_CATALOG_JSON',
             'sk_live_','/v1/checkout/sessions','gu58_live_checkout_intents'):
 assert term in checkout,term
for term in ('GU58_LIVE_WEBHOOK_ENABLED','GU58_LIVE_FULFILLMENT_APPROVED',
             'GU58_LIVE_DB_CONTRACT_APPROVED','GU58_STRIPE_LIVE_WEBHOOK_SECRET',
             'sk_live_','event.livemode!==true','checkHmac','verifyBoundSession',
             'gu58_live_stripe_apply_event','session:intent_binding_failed',
             'gu58_live_bind_verified_checkout'):
 assert term in webhook,term
assert "'/api/stripe-live-checkout-v01458'" in middleware
assert 'GU58_LIVE_CHECKOUT_ENABLED' in router
assert 'guardedStripeLiveCheckout' in router
for term in ('gu58_live_checkout_intents','gu58_live_stripe_events',
             'gu58_live_stripe_apply_event','gu58_one_unresolved_per_member_sku',
             'gu58_live_bind_verified_checkout','p_cancel_at_period_end boolean',
             'GRANT EXECUTE ON FUNCTION public.gu58_live_bind_verified_checkout',
             'GRANT EXECUTE ON FUNCTION public.gu58_live_stripe_apply_event',
             "CASE WHEN evt_status='past_due' THEN 'paused' ELSE evt_status END",
             'cancel_at_period_end=excluded.cancel_at_period_end'):
 assert term in sql,term
assert 'cs_live_' in sql and 'cs_test_' not in sql
assert "auth.role() IS DISTINCT FROM 'service_role'" in sql
assert 'REVIEW REQUIRED' in sql
assert sql.count('BEGIN;')==1 and sql.rstrip().endswith('COMMIT;')
# A previously malformed script repeated the entire SQL function after COMMIT.
assert sql.count('CREATE OR REPLACE FUNCTION public.gu58_live_stripe_apply_event(')==1
assert sql.count('CREATE OR REPLACE FUNCTION public.gu58_live_bind_verified_checkout(')==1
assert sql.count('$fn$')==2 and sql.count('$bind$')==2
assert sql.count('COMMIT;')==1
assert "p_session_id !~ '^cs_live_[A-Za-z0-9_]{6,}$'" in sql
assert "p_price_id !~ '^price_[A-Za-z0-9_]{6,}$'" in sql
for term in ('GU58_LIVE_CHECKOUT_ENABLED','GU58_LIVE_WEBHOOK_ENABLED',
             'GU58_LIVE_FULFILLMENT_APPROVED','GU_PAYMENT_LIVE_LAUNCH_APPROVED'):
 assert term not in read('config.js')
for term in ('GU58_LIVE_CHECKOUT_ENABLED','GU58_LIVE_WEBHOOK_ENABLED',
             'GU58_LIVE_FULFILLMENT_APPROVED'):
 assert term not in read('release-manifest.json')
print('PASS v58: isolated LIVE source contract, locked routes, strict SQL syntax structure and privileges')
