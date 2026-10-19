-- SUPERSEDED BY v0.14.0.83: DO NOT EXECUTE THIS OLD DIRECT-UPDATE SCRIPT.
-- This older SQL attempts to update the protected commerce.checkout_enabled
-- site_settings field without the signed-in Owner password-stepup JWT.
-- The v31R1 database trigger correctly raises 42501 OWNER_REQUIRED, causing
-- a complete transaction rollback (0 out of 4 prior switches persisted).
-- Install the new v0.14.0.83_AUTHENTICATED_OWNER_LIVE_ACTIVATION_REVIEW_REQUIRED.sql
-- (creates Owner-authorized RPC only), then sign in to WEBSITE Admin > Commerce
-- and click 'Authorize LIVE Payments for Eight Products'. No trigger bypass.
-- Historical file retained solely for audit; refer to v83 for execution.
-- Cyber Nexus | v0.14.0.82 | OWNER-EXECUTED LIVE PAID CHECKOUT ACTIVATION
-- Existing production Supabase SQL Editor ONLY. NOT executed by GitHub.
-- USER EXPLICITLY AUTHORIZED turning on the EIGHT existing positive-price
-- memberships/tools. This SQL NEVER charges anyone, inserts test purchases,
-- grants access, edits book/KDP records, changes Stripe products, or touches
-- the historical $0 LIVE QA. Real charges become possible AFTER the separate
-- Cloudflare production LIVE switches and Stripe eligibility also pass.
--
-- IMPORTANT: do not execute this activation unless the eight existing LIVE
-- product/price mappings, Stripe Managed Payments eligibility and signed LIVE
-- webhook destination are configured correctly. The checked schema cannot
-- prove those external facts; the GU58 checkout still validates them online.
BEGIN;
DO $preflight$
DECLARE
 plan_count integer;
 tool_count integer;
BEGIN
 IF to_regclass('public.platform_plans') IS NULL OR
    to_regclass('public.platform_tools') IS NULL OR
    to_regclass('public.site_settings') IS NULL OR
    to_regclass('public.gu39_sandbox_settings') IS NULL OR
    to_regclass('public.gu_digital_payment_route_v01432r2') IS NULL OR
    to_regclass('public.gu58_live_checkout_intents') IS NULL OR
    to_regclass('public.gu58_live_stripe_events') IS NULL OR
    to_regclass('public.site_subscriptions') IS NULL OR
    to_regclass('public.user_tool_passes') IS NULL OR
    to_regclass('public.user_plan_grants') IS NULL OR
    to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)') IS NULL OR
    to_regprocedure('public.gu58_live_bind_verified_checkout(uuid,uuid,text,text,integer)') IS NULL
 THEN RAISE EXCEPTION 'GU82_LIVE_PAYMENT_DATABASE_CONTRACT_MISSING'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.site_settings
   WHERE setting_key='commerce.checkout_enabled') THEN
   RAISE EXCEPTION 'GU82_MASTER_CHECKOUT_SETTING_MISSING'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.gu39_sandbox_settings
   WHERE id=true) THEN
   RAISE EXCEPTION 'GU82_PAYMENT_MODE_SETTING_MISSING'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.gu_digital_payment_route_v01432r2
   WHERE channel='digital') THEN
   RAISE EXCEPTION 'GU82_PAYMENT_PROVIDER_ROUTE_MISSING'; END IF;
 SELECT COUNT(*) INTO plan_count
 FROM public.platform_plans p
 JOIN (VALUES ('FULL_MONTHLY',6999,'month'),
              ('FULL_ANNUAL',69900,'year'),
              ('LIFETIME',249900,'lifetime'),
              ('ONDEMAND_MONTHLY',1999,'month')) AS e(code,cents,cycle)
 ON p.plan_code=e.code AND p.price_cents=e.cents
   AND p.billing_interval=e.cycle AND upper(p.currency)='USD'
 WHERE p.active=true AND p.public_visible=true;
 IF plan_count<>4 THEN
   RAISE EXCEPTION 'GU82_MEMBERSHIP_CATALOG_MISMATCH: % / 4',plan_count;
 END IF;
 SELECT COUNT(*) INTO tool_count
 FROM public.platform_tools t
 JOIN (VALUES ('INTERACTIVE_LEARNING',2999),
              ('JOURNAL_ANALYTICS',2999),
              ('MARKET_SIMULATOR',2999),
              ('MARKET_TUTOR',2999)) AS e(code,cents)
 ON t.tool_code=e.code AND t.individual_price_cents=e.cents
 WHERE t.active=true AND t.public_visible=true AND t.status='live';
 IF tool_count<>4 THEN
   RAISE EXCEPTION 'GU82_TOOL_CATALOG_MISMATCH: % / 4',tool_count;
 END IF;
END $preflight$;

-- One tightly scoped operation: all EIGHT pre-approved paid offers only.
-- The existing live backend will still reject unapproved Cloudflare configs,
-- price mismatches, TEST mode, ineligible users, unsafe Stripe sessions and
-- inactive/missing Stripe Managed Payments.
UPDATE public.platform_plans SET checkout_enabled=true,updated_at=now()
 WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY');
UPDATE public.gu39_sandbox_settings
 SET enabled=false,updated_at=clock_timestamp() WHERE id=true;
UPDATE public.gu_digital_payment_route_v01432r2
 SET provider='STRIPE_MANAGED',enabled=true,updated_at=clock_timestamp()
 WHERE channel='digital';
UPDATE public.site_settings
 SET value='true'::jsonb,updated_at=now()
 WHERE setting_key='commerce.checkout_enabled';

-- Nonsecret evidence after activation. Note: SQL cannot verify actual Stripe
-- merchant eligibility, Cloudflare flags or live webhook delivery.
SELECT 'GU82_PAID_DB_ACTIVATION' AS section,
 (SELECT COUNT(*) FROM public.platform_plans
  WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY')
    AND checkout_enabled=true) AS paid_plans_enabled,
 (SELECT COUNT(*) FROM public.platform_tools
  WHERE tool_code IN ('INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR')
    AND active=true AND public_visible=true AND status='live') AS paid_tools_eligible,
 (SELECT enabled=false FROM public.gu39_sandbox_settings WHERE id=true)
    AS testing_disabled,
 (SELECT provider='STRIPE_MANAGED' AND enabled=true
  FROM public.gu_digital_payment_route_v01432r2 WHERE channel='digital')
    AS stripe_route_enabled,
 (SELECT value='true'::jsonb FROM public.site_settings
  WHERE setting_key='commerce.checkout_enabled')
    AS public_paid_checkout_enabled;
COMMIT;
