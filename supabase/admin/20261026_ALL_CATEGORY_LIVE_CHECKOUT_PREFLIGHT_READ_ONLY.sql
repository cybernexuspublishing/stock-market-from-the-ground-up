-- ALL CATEGORY LIVE COMMERCE PREFLIGHT, 2026-10-26
-- READ ONLY / no Stripe charges, no grants, no billing changes.
-- Inspect canonical sources, do not substitute active Stripe Products for fulfillment acceptance.
BEGIN TRANSACTION READ ONLY;
SELECT category,status,visible,sale_ready,count(*) AS offer_count
  FROM public.gu_storefront_items_v014174
 GROUP BY category,status,visible,sale_ready ORDER BY category,status,visible,sale_ready;
SELECT count(*) AS total_offers,
       count(*) FILTER (WHERE sale_ready IS TRUE) AS independently_sale_ready,
       count(*) FILTER (WHERE visible IS FALSE) AS hidden_offers
  FROM public.gu_storefront_items_v014174;
SELECT plan_code,name,price_cents,billing_interval,active,public_visible,checkout_enabled
  FROM public.platform_plans ORDER BY plan_code;
SELECT tool_code,status,active,public_visible,checkout_enabled,individual_price_cents
  FROM public.platform_tools ORDER BY tool_code;
SELECT plan_code,price_cents,term_days,purchase_discount_bps,checkout_enabled
  FROM public.gu_founder_plans_v014173 ORDER BY plan_code;
SELECT singleton,enrollment_enabled,billing_enabled,fulfillment_enabled
  FROM public.gu_founder_release_v014173;
SELECT setting_key,value FROM public.site_settings
 WHERE setting_key IN ('commerce.checkout_enabled','commerce.provider','commerce.payment_provider')
 ORDER BY setting_key;
SELECT enabled AS stripe_testing_enabled FROM public.gu39_sandbox_settings;
SELECT count(*) AS verified_digital_assets FROM public.gu_digital_books_v01430;
SELECT count(*) AS live_gu58_checkout_intents FROM public.gu58_live_checkout_intents;
SELECT count(*) AS live_gu58_signed_events FROM public.gu58_live_stripe_events;
SELECT count(*) AS confirmed_founder_members FROM public.gu_founder_members_v014173;
SELECT count(*) AS confirmed_founder_provider_events FROM public.gu_founder_provider_events_v014200;
SELECT status,count(*) AS zero_live_qa_grants FROM public.user_plan_grants
 WHERE source='stripe_zero_monthly_qa_v72' GROUP BY status ORDER BY status;
SELECT document_code,title,version,status,effective_at FROM public.legal_documents ORDER BY document_code;
COMMIT;
