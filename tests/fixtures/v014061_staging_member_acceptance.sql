-- v0.14.0.60 Real PostgreSQL RPC + entitlement evaluator acceptance
-- Runs ONLY in ephemeral CI postgres:16. No Supabase, Stripe, customer accounts,
-- payment credentials, webhook deliveries, or production data are contacted.
\set ON_ERROR_STOP on
SET "request.jwt.claim.role" = 'service_role';

INSERT INTO public.gu61_staging_checkout_intents(
 id,user_id,sku_kind,sku_code,price_id,quoted_amount_cents,stripe_session_id,status)
VALUES
 ('aaaa0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
   'plan','FULL_MONTHLY','price_monthly0001',6999,'cs_test_monthly0001','checkout_created'),
 ('aaaa0000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222',
   'tool','JOURNAL_ANALYTICS','price_journal0001',2999,'cs_test_journal0001','checkout_created'),
 ('aaaa0000-0000-4000-8000-000000000003','33333333-3333-4333-8333-333333333333',
   'plan','LIFETIME','price_lifetime0001',249900,'cs_test_lifetime0001','checkout_created');

DO $initial$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
  OR public.user_has_tool_access('22222222-2222-4222-8222-222222222222','JOURNAL_ANALYTICS')
  OR public.user_has_tool_access('33333333-3333-4333-8333-333333333333','MARKET_TUTOR')
 THEN RAISE EXCEPTION 'FAIL: premature access before provider-confirmed payment'; END IF;
 RAISE NOTICE 'PASS: prepared checkout alone grants no member access';
END $initial$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly001','subscription_active','cs_test_monthly0001','sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '30 days',
 now()-interval '2 minutes','in_monthly0001',false);
DO $paid$
BEGIN
 IF NOT public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
  OR (SELECT status FROM public.site_subscriptions WHERE provider_subscription_id='sub_monthly0001') <> 'active'
 THEN RAISE EXCEPTION 'FAIL: confirmed monthly payment did not grant tools';END IF;
 RAISE NOTICE 'PASS: monthly payment grants plan tool access via actual evaluator';
END $paid$;

-- Provider retry must not issue a duplicate subscription.
SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly001','subscription_active','cs_test_monthly0001','sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '30 days',
 now()-interval '2 minutes','in_monthly0001',false);
DO $duplicate$
BEGIN
 IF (SELECT count(*) FROM public.gu61_staging_stripe_events WHERE event_id='evt_live_monthly001')<>1
  OR (SELECT count(*) FROM public.site_subscriptions WHERE provider_subscription_id='sub_monthly0001')<>1
 THEN RAISE EXCEPTION 'FAIL: Stripe duplicate event applied twice';END IF;
 RAISE NOTICE 'PASS: exact duplicate Stripe event idempotent';
END $duplicate$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly002','subscription_past_due',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',NULL,'usd',now()+interval '30 days',
 now()-interval '110 seconds','in_monthly0001',false);
DO $failed$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
  OR (SELECT status FROM public.site_subscriptions WHERE provider_subscription_id='sub_monthly0001') <> 'past_due'
 THEN RAISE EXCEPTION 'FAIL: failed monthly invoice still grants access'; END IF;
 RAISE NOTICE 'PASS: past_due denies full-platform access';
END $failed$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly003','subscription_active',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '60 days',
 now()-interval '100 seconds','in_monthly0002',false);
DO $renew$
BEGIN
 IF NOT public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
 THEN RAISE EXCEPTION 'FAIL: successful renewal failed to restore access'; END IF;
 RAISE NOTICE 'PASS: paid renewal restores full platform access';
END $renew$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly004','subscription_refunded',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',NULL,'usd',now()+interval '60 days',
 now()-interval '90 seconds','in_monthly0002',false);
DO $refund$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
  OR (SELECT status FROM public.site_subscriptions WHERE provider_subscription_id='sub_monthly0001')<>'paused'
 THEN RAISE EXCEPTION 'FAIL: latest invoice refund did not suspend access'; END IF;
 RAISE NOTICE 'PASS: refunded subscription suspends access';
END $refund$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly005','subscription_active',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '60 days',
 now()-interval '80 seconds','in_monthly0002',false);
DO $replay$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
 THEN RAISE EXCEPTION 'FAIL: refunded invoice replay re-granted access';END IF;
 RAISE NOTICE 'PASS: refunded invoice cannot regrant membership';
END $replay$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly006','subscription_active',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '90 days',
 now()-interval '70 seconds','in_monthly0003',false);
SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly007','subscription_active',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '90 days',
 now()-interval '60 seconds','in_monthly0003',true);
DO $scheduled$
BEGIN
 IF NOT public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
 OR (SELECT cancel_at_period_end FROM public.site_subscriptions WHERE provider_subscription_id='sub_monthly0001') IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'FAIL: scheduled cancel incorrectly removed already-paid period'; END IF;
 RAISE NOTICE 'PASS: scheduled cancellation preserves paid period access';
END $scheduled$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly008','subscription_canceled',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',NULL,'usd',now()+interval '90 days',
 now()-interval '50 seconds','in_monthly0003',true);
DO $canceled$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
  OR (SELECT status FROM public.site_subscriptions WHERE provider_subscription_id='sub_monthly0001')<>'canceled'
 THEN RAISE EXCEPTION 'FAIL: fully canceled membership still grants access'; END IF;
 RAISE NOTICE 'PASS: canceled subscription removes access';
END $canceled$;

-- A delayed older-paid invoice event must not reinstate a canceled member.
SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_monthly009','subscription_active',NULL,'sub_monthly0001',
 NULL,'price_monthly0001',6999,'usd',now()+interval '90 days',
 now()-interval '4 minutes','in_monthly0001',false);
DO $stale$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','MARKET_SIMULATOR')
 OR (SELECT outcome FROM public.gu61_staging_stripe_events
   WHERE event_id='evt_live_monthly009') <> 'stale_ignored'
 THEN RAISE EXCEPTION 'FAIL: stale Stripe event revived a canceled membership'; END IF;
 RAISE NOTICE 'PASS: older paid event ignored after cancellation';
END $stale$;

-- Individual journal purchase must not accidentally grant Market Tutor.
SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_journal001','subscription_active','cs_test_journal0001','sub_journal0001',
 NULL,'price_journal0001',2999,'usd',now()+interval '30 days',
 now()-interval '2 minutes','in_journal0001',false);
DO $tool$
BEGIN
 IF NOT public.user_has_tool_access('22222222-2222-4222-8222-222222222222','JOURNAL_ANALYTICS')
  OR public.user_has_tool_access('22222222-2222-4222-8222-222222222222','MARKET_TUTOR')
 THEN RAISE EXCEPTION 'FAIL: individual tool isolation violated';END IF;
 RAISE NOTICE 'PASS: paid standalone tool grants only the purchased tool';
END $tool$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_journal002','subscription_past_due',NULL,'sub_journal0001',
 NULL,'price_journal0001',NULL,'usd',now()+interval '30 days',
 now()-interval '100 seconds','in_journal0001',false);
DO $tool_past_due$
BEGIN
 IF public.user_has_tool_access('22222222-2222-4222-8222-222222222222','JOURNAL_ANALYTICS')
  OR (SELECT status FROM public.user_tool_passes WHERE provider_subscription_id='sub_journal0001')<>'paused'
 THEN RAISE EXCEPTION 'FAIL: past-due tool pass not paused'; END IF;
 RAISE NOTICE 'PASS: past-due tool pass paused with no tool access';
END $tool_past_due$;

-- Latest-invoice dispute suspends tool access without touching other users.
SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_journal003','subscription_active',NULL,'sub_journal0001',
 NULL,'price_journal0001',2999,'usd',now()+interval '60 days',
 now()-interval '90 seconds','in_journal0002',false);
SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_journal004','subscription_disputed',NULL,'sub_journal0001',
 NULL,'price_journal0001',NULL,'usd',now()+interval '60 days',
 now()-interval '80 seconds','in_journal0002',false);
DO $dispute$
BEGIN
 IF public.user_has_tool_access('22222222-2222-4222-8222-222222222222','JOURNAL_ANALYTICS')
 OR (SELECT status FROM public.user_tool_passes WHERE provider_subscription_id='sub_journal0001')<>'paused'
 THEN RAISE EXCEPTION 'FAIL: disputed invoice did not revoke tool access'; END IF;
 RAISE NOTICE 'PASS: disputed subscription suspends only its own purchased tool';
END $dispute$;

-- An authenticated browser user may not directly call the service-only RPC.
SET "request.jwt.claim.role" = 'authenticated';
DO $no_client_write$
BEGIN
 PERFORM public.gu61_staging_stripe_apply_event(
 'evt_live_clientforged','subscription_active',NULL,'sub_journal0001',
 NULL,'price_journal0001',2999,'usd',now()+interval '60 days',
 now()-interval '60 seconds','in_journal0003',false);
 RAISE EXCEPTION 'FAIL: client forged Stripe entitlement operation';
EXCEPTION WHEN insufficient_privilege THEN
 RAISE NOTICE 'PASS: browser/authenticated role rejected by service-only fulfillment RPC';
END $no_client_write$;
SET "request.jwt.claim.role" = 'service_role';

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_lifetime001','lifetime_paid','cs_test_lifetime0001',NULL,
 'pi_lifetime0001','price_lifetime0001',249900,'usd',NULL,
 now()-interval '2 minutes',NULL,false);
DO $lifetime$
BEGIN
 IF NOT public.user_has_tool_access('33333333-3333-4333-8333-333333333333','MARKET_TUTOR')
  OR (SELECT status FROM public.site_orders WHERE provider_order_id='pi_lifetime0001') <> 'paid'
 THEN RAISE EXCEPTION 'FAIL: confirmed lifetime purchase did not activate';END IF;
 RAISE NOTICE 'PASS: paid lifetime membership creates owned plan and order';
END $lifetime$;

SELECT public.gu61_staging_stripe_apply_event(
 'evt_live_lifetime002','payment_refunded',NULL,NULL,
 'pi_lifetime0001','price_lifetime0001',NULL,'usd',NULL,
 now()-interval '1 minute',NULL,false);
DO $lifetime_refund$
BEGIN
 IF public.user_has_tool_access('33333333-3333-4333-8333-333333333333','MARKET_TUTOR')
  OR (SELECT status FROM public.site_orders WHERE provider_order_id='pi_lifetime0001') <> 'refunded'
 THEN RAISE EXCEPTION 'FAIL: full lifetime refund did not revoke owned access';END IF;
 RAISE NOTICE 'PASS: lifetime refund revokes only Stripe-created plan and refunds order';
END $lifetime_refund$;

DO $permissions$
BEGIN
 IF has_function_privilege('authenticated',
 'public.gu61_staging_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean)',
 'EXECUTE')
 THEN RAISE EXCEPTION 'FAIL: authenticated users can directly invoke fulfillment RPC';END IF;
 IF NOT has_function_privilege('service_role',
 'public.gu61_staging_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean)',
 'EXECUTE') THEN RAISE EXCEPTION 'FAIL: service role cannot apply provider events';END IF;
 RAISE NOTICE 'PASS: fulfillment RPC restricted to service role';
END $permissions$;

SELECT 'PASS: EPHEMERAL_POSTGRES_MEMBER_FULFILLMENT_ACCEPTANCE' AS acceptance,
       (SELECT count(*) FROM public.gu61_staging_stripe_events) AS event_rows,
       (SELECT count(*) FROM public.site_subscriptions) AS plan_rows,
       (SELECT count(*) FROM public.user_tool_passes) AS tool_rows,
       (SELECT count(*) FROM public.site_orders) AS order_rows;
