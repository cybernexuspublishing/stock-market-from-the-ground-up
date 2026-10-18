"""Locked LIVE membership fulfillment source contract; no external writes."""
from pathlib import Path
p=Path(__file__).resolve().parents[1]
read=lambda name:(p/name).read_text(encoding='utf-8')
sql=read('supabase/migrations/v0.14.0.58_LIVE_MEMBERSHIP_FULFILLMENT_REVIEW_REQUIRED.sql')
checkout=read('functions/api/stripe-live-checkout-v01458.js')
webhook=read('functions/api/stripe-live-webhook-v01458.js')
middleware=read('functions/_middleware.js')
router=read('functions/api/checkout.js')
for t in ['GU_PAYMENT_LIVE_LAUNCH_APPROVED','GU58_LIVE_CHECKOUT_ENABLED','GU58_LIVE_FULFILLMENT_APPROVED',
          'GU58_LIVE_DB_CONTRACT_APPROVED','GU58_STRIPE_LIVE_ACCOUNT_ID','GU58_STRIPE_LIVE_CATALOG_JSON',
          'sk_live_','/v1/checkout/sessions','gu58_live_checkout_intents']:
 assert t in checkout, t
for t in ['GU58_LIVE_WEBHOOK_ENABLED','GU58_LIVE_FULFILLMENT_APPROVED','GU58_LIVE_DB_CONTRACT_APPROVED',
          'GU58_STRIPE_LIVE_WEBHOOK_SECRET','sk_live_','event.livemode!==true','checkHmac',
          'verifyBoundSession','gu58_live_stripe_apply_event','session:intent_binding_failed']:
 assert t in webhook,t
assert "'/api/stripe-live-checkout-v01458'" in middleware
assert 'GU58_LIVE_CHECKOUT_ENABLED' in router
assert 'guardedStripeLiveCheckout' in router
assert 'gu58_live_checkout_intents' in sql
assert 'gu58_live_stripe_events' in sql
assert 'gu58_live_stripe_apply_event' in sql
assert 'cs_live_' in sql and 'cs_test_' not in sql
assert "auth.role() IS DISTINCT FROM 'service_role'" in sql
assert "REVOKE ALL ON FUNCTION public.gu58_live_stripe_apply_event" in sql
assert 'gu58_one_unresolved_per_member_sku' in sql
assert 'p_cancel_at_period_end boolean' in sql
assert "CASE WHEN evt_status='past_due' THEN 'paused' ELSE evt_status END" in sql
assert 'cancel_at_period_end=excluded.cancel_at_period_end' in sql
assert 'REVIEW REQUIRED' in sql
assert sql.count('BEGIN;')==1 and sql.rstrip().endswith('COMMIT;')
for k in ('GU58_LIVE_CHECKOUT_ENABLED','GU58_LIVE_WEBHOOK_ENABLED','GU58_LIVE_FULFILLMENT_APPROVED',
          'GU_PAYMENT_LIVE_LAUNCH_APPROVED'):
 assert k not in read('config.js'), 'Secret/approval controls must never be stored in public config'
for k in ('GU58_LIVE_CHECKOUT_ENABLED','GU58_LIVE_WEBHOOK_ENABLED','GU58_LIVE_FULFILLMENT_APPROVED'):
 assert k not in read('release-manifest.json'),'Do not ship live flags inside public manifest'
print('PASS v58: independent live checkout/webhook gates; live-only SQL; RLS/service RPC; no public approval flags.')
