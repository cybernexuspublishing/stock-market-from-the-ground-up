-- Disposable PostgreSQL 16 ONLY; DO NOT run against production Supabase.
-- Reuses the actual GU61 migration, real transactional fulfillment RPC, and
-- existing isolated entitlement function. Exactly four approved test tools.
\set ON_ERROR_STOP on
SET "request.jwt.claim.role" = 'service_role';
INSERT INTO auth.users(id) VALUES
 ('44444444-4444-4444-8444-444444444444'),
 ('55555555-5555-4555-8555-555555555555'),
 ('66666666-6666-4666-8666-666666666666'),
 ('77777777-7777-4777-8777-777777777777');
INSERT INTO public.gu61_staging_checkout_intents(
 id,user_id,sku_kind,sku_code,price_id,quoted_amount_cents,stripe_session_id,status)
VALUES
 ('aaaa0000-0000-4000-8000-000000000004','44444444-4444-4444-8444-444444444444',
   'tool','INTERACTIVE_LEARNING','price_interactive0001',2999,'cs_test_interactive0001','checkout_created'),
 ('aaaa0000-0000-4000-8000-000000000005','55555555-5555-4555-8555-555555555555',
   'tool','JOURNAL_ANALYTICS','price_journal0002',2999,'cs_test_journal0002','checkout_created'),
 ('aaaa0000-0000-4000-8000-000000000006','66666666-6666-4666-8666-666666666666',
   'tool','MARKET_SIMULATOR','price_simulator0001',2999,'cs_test_simulator0001','checkout_created'),
 ('aaaa0000-0000-4000-8000-000000000007','77777777-7777-4777-8777-777777777777',
   'tool','MARKET_TUTOR','price_tutor0001',2999,'cs_test_tutor0001','checkout_created');
DO $before$
DECLARE x record;
BEGIN
 FOR x IN SELECT user_id,sku_code FROM public.gu61_staging_checkout_intents
   WHERE id IN ('aaaa0000-0000-4000-8000-000000000004',
   'aaaa0000-0000-4000-8000-000000000005',
   'aaaa0000-0000-4000-8000-000000000006',
   'aaaa0000-0000-4000-8000-000000000007') LOOP
  IF public.user_has_tool_access(x.user_id,x.sku_code)
  THEN RAISE EXCEPTION 'UNPAID_TEST_SESSION_GRANTED_TOOL %',x.sku_code; END IF;
 END LOOP;
 RAISE NOTICE 'PASS four staging Checkout intents grant zero access before payment';
END $before$;
SELECT public.gu61_staging_stripe_apply_event('evt_tool_interactive_1','subscription_active',
 'cs_test_interactive0001','sub_tool_interactive01',NULL,'price_interactive0001',2999,'usd',
 now()+interval '30 days',now()-interval '14 minutes','in_interactive01',false);
SELECT public.gu61_staging_stripe_apply_event('evt_tool_journal_1','subscription_active',
 'cs_test_journal0002','sub_tool_journal0001',NULL,'price_journal0002',2999,'usd',
 now()+interval '30 days',now()-interval '14 minutes','in_journal0002',false);
SELECT public.gu61_staging_stripe_apply_event('evt_tool_simulator_1','subscription_active',
 'cs_test_simulator0001','sub_tool_simulator01',NULL,'price_simulator0001',2999,'usd',
 now()+interval '30 days',now()-interval '14 minutes','in_simulator01',false);
SELECT public.gu61_staging_stripe_apply_event('evt_tool_tutor_1','subscription_active',
 'cs_test_tutor0001','sub_tool_tutor000001',NULL,'price_tutor0001',2999,'usd',
 now()+interval '30 days',now()-interval '14 minutes','in_tutor000001',false);
DO $paid$
DECLARE x record; n int;
BEGIN
 FOR x IN SELECT user_id,sku_code FROM public.gu61_staging_checkout_intents
   WHERE id IN ('aaaa0000-0000-4000-8000-000000000004',
   'aaaa0000-0000-4000-8000-000000000005',
   'aaaa0000-0000-4000-8000-000000000006',
   'aaaa0000-0000-4000-8000-000000000007') LOOP
   IF NOT public.user_has_tool_access(x.user_id,x.sku_code)
   THEN RAISE EXCEPTION 'PAID_TOOL_DENIED %',x.sku_code; END IF;
   SELECT count(*) INTO n FROM public.user_tool_passes
    WHERE user_id=x.user_id AND tool_code=x.sku_code
      AND status='active' AND provider='STRIPE_MANAGED';
   IF n<>1 THEN RAISE EXCEPTION 'MISSING_PROVIDER_PASS %',x.sku_code; END IF;
   IF EXISTS(SELECT 1 FROM public.platform_tools t WHERE t.tool_code<>x.sku_code
     AND public.user_has_tool_access(x.user_id,t.tool_code))
   THEN RAISE EXCEPTION 'PAID_TOOL_LEAKS_OTHER_TOOLS %',x.sku_code; END IF;
 END LOOP;
 RAISE NOTICE 'PASS all four paid tools activate exactly one isolated entitlement';
END $paid$;
-- Redelivery must be idempotent, even though subscription price and tool are valid.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_interactive_1','subscription_active',
 'cs_test_interactive0001','sub_tool_interactive01',NULL,'price_interactive0001',2999,'usd',
 now()+interval '30 days',now()-interval '14 minutes','in_interactive01',false);
DO $dedupe$
BEGIN
 IF (SELECT count(*) FROM public.user_tool_passes
     WHERE provider_subscription_id='sub_tool_interactive01')<>1 OR
    (SELECT count(*) FROM public.gu61_staging_stripe_events
     WHERE event_id='evt_tool_interactive_1')<>1
 THEN RAISE EXCEPTION 'DUPLICATE_WEBHOOK_CREATED_DUPLICATE_PASS'; END IF;
 RAISE NOTICE 'PASS duplicate signed event idempotent';
END $dedupe$;

-- Renew Journal into a new paid cycle and reject old provider events.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_journal_renew','subscription_active',
 NULL,'sub_tool_journal0001',NULL,'price_journal0002',2999,'usd',
 now()+interval '60 days',now()-interval '9 minutes','in_journal_renew',false);
DO $renew$
BEGIN
 IF NOT public.user_has_tool_access('55555555-5555-4555-8555-555555555555','JOURNAL_ANALYTICS')
 OR (SELECT current_period_end FROM public.user_tool_passes
     WHERE provider_subscription_id='sub_tool_journal0001')<=now()+interval '58 days'
 THEN RAISE EXCEPTION 'RENEWAL_DID_NOT_ADVANCE_PAID_PERIOD'; END IF;
 RAISE NOTICE 'PASS paid renewal advances eligible period';
END $renew$;
SELECT public.gu61_staging_stripe_apply_event('evt_tool_journal_stale','subscription_canceled',
 NULL,'sub_tool_journal0001',NULL,'price_journal0002',NULL,'usd',
 now()-interval '1 day',now()-interval '12 minutes','in_journal0002',false);
DO $stale$
BEGIN
 IF NOT public.user_has_tool_access('55555555-5555-4555-8555-555555555555','JOURNAL_ANALYTICS')
 OR (SELECT outcome FROM public.gu61_staging_stripe_events
  WHERE event_id='evt_tool_journal_stale')<>'stale_ignored'
 THEN RAISE EXCEPTION 'OLDER_EVENT_REVOKED_NEWER_PAYMENT'; END IF;
 RAISE NOTICE 'PASS stale cancellation cannot revoke later paid renewal';
END $stale$;

-- Scheduled cancellation must retain access until the paid period expires.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_simulator_scheduled','subscription_active',
 NULL,'sub_tool_simulator01',NULL,'price_simulator0001',2999,'usd',
 now()+interval '30 days',now()-interval '8 minutes','in_simulator01',true);
DO $scheduled$
BEGIN
 IF (SELECT cancel_at_period_end FROM public.user_tool_passes
      WHERE provider_subscription_id='sub_tool_simulator01') IS DISTINCT FROM true
 OR NOT public.user_has_tool_access('66666666-6666-4666-8666-666666666666','MARKET_SIMULATOR')
 THEN RAISE EXCEPTION 'SCHEDULED_CANCEL_PREMATURE_REVOCATION'; END IF;
 RAISE NOTICE 'PASS cancel-at-period-end preserves eligible paid term';
END $scheduled$;
SELECT public.gu61_staging_stripe_apply_event('evt_tool_simulator_canceled','subscription_canceled',
 NULL,'sub_tool_simulator01',NULL,'price_simulator0001',NULL,'usd',
 now()+interval '30 days',now()-interval '7 minutes','in_simulator01',false);
DO $canceled$
BEGIN
 IF public.user_has_tool_access('66666666-6666-4666-8666-666666666666','MARKET_SIMULATOR')
 OR (SELECT status FROM public.user_tool_passes
  WHERE provider_subscription_id='sub_tool_simulator01')<>'canceled'
 THEN RAISE EXCEPTION 'EXPIRED_CANCEL_RETAINED_ACCESS'; END IF;
 RAISE NOTICE 'PASS actual canceled subscription revokes Simulator';
END $canceled$;

-- The failed newest invoice suspends only Tutor; next valid invoice restores.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_tutor_failed','subscription_past_due',
 NULL,'sub_tool_tutor000001',NULL,'price_tutor0001',NULL,'usd',
 now()+interval '30 days',now()-interval '8 minutes','in_tutor000001',false);
DO $failure$
BEGIN
 IF public.user_has_tool_access('77777777-7777-4777-8777-777777777777','MARKET_TUTOR')
 OR (SELECT status FROM public.user_tool_passes
  WHERE provider_subscription_id='sub_tool_tutor000001')<>'paused'
 THEN RAISE EXCEPTION 'FAILED_PAYMENT_STILL_GRANTED_TUTOR'; END IF;
 RAISE NOTICE 'PASS failed newest invoice pauses premium Tutor access';
END $failure$;
SELECT public.gu61_staging_stripe_apply_event('evt_tool_tutor_recovered','subscription_active',
 NULL,'sub_tool_tutor000001',NULL,'price_tutor0001',2999,'usd',
 now()+interval '60 days',now()-interval '6 minutes','in_tutor_renew01',false);
DO $recovery$
BEGIN
 IF NOT public.user_has_tool_access('77777777-7777-4777-8777-777777777777','MARKET_TUTOR')
 THEN RAISE EXCEPTION 'RENEWED_TUTOR_NOT_RESTORED'; END IF;
 RAISE NOTICE 'PASS valid newest paid invoice restores Tutor';
END $recovery$;

-- A future subscription period cannot stay valid after its effective expiry.
UPDATE public.user_tool_passes SET current_period_end=now()-interval '1 minute'
 WHERE provider_subscription_id='sub_tool_interactive01';
DO $expiry$
BEGIN
 IF public.user_has_tool_access('44444444-4444-4444-8444-444444444444','INTERACTIVE_LEARNING')
 THEN RAISE EXCEPTION 'EXPIRED_PAID_TERM_GRANTED_INTERACTIVE_LEARNING'; END IF;
 RAISE NOTICE 'PASS expired period immediately denies paid Lab access';
END $expiry$;
-- A new paid invoice restores Interactive Learning for the next actual term.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_interactive_renew','subscription_active',
 NULL,'sub_tool_interactive01',NULL,'price_interactive0001',2999,'usd',
 now()+interval '60 days',now()-interval '6 minutes','in_interactive_renew',false);
DO $newPaid$
BEGIN
 IF NOT public.user_has_tool_access('44444444-4444-4444-8444-444444444444','INTERACTIVE_LEARNING')
 THEN RAISE EXCEPTION 'PAID_RENEWAL_FAILED_TO_RESTORE_TOOL'; END IF;
END $newPaid$;
-- A full refund of the LATEST invoice revokes just that membership tool.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_interactive_refund','subscription_refunded',
 NULL,'sub_tool_interactive01',NULL,'price_interactive0001',NULL,'usd',
 now()+interval '60 days',now()-interval '3 minutes','in_interactive_renew',false);
DO $refund$
BEGIN
 IF public.user_has_tool_access('44444444-4444-4444-8444-444444444444','INTERACTIVE_LEARNING')
 OR (SELECT status FROM public.user_tool_passes
  WHERE provider_subscription_id='sub_tool_interactive01')<>'paused'
 THEN RAISE EXCEPTION 'LATEST_INVOICE_REFUND_FAILED_TO_SUSPEND_TOOL'; END IF;
 RAISE NOTICE 'PASS latest full refund suspends precisely the purchased tool';
END $refund$;
SELECT public.gu61_staging_stripe_apply_event('evt_tool_interactive_replay','subscription_active',
 NULL,'sub_tool_interactive01',NULL,'price_interactive0001',2999,'usd',
 now()+interval '60 days',now()-interval '2 minutes','in_interactive_renew',false);
DO $noRegrant$
BEGIN
 IF public.user_has_tool_access('44444444-4444-4444-8444-444444444444','INTERACTIVE_LEARNING')
 OR (SELECT outcome FROM public.gu61_staging_stripe_events
  WHERE event_id='evt_tool_interactive_replay')<>'refunded_invoice_cannot_regrant'
 THEN RAISE EXCEPTION 'REFUNDED_INVOICE_REGRANTED_PAID_ACCESS'; END IF;
 RAISE NOTICE 'PASS refunded invoice cannot regain access from webhook replay';
END $noRegrant$;
-- A new separately paid period can regain access, with its own invoice.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_interactive_newperiod','subscription_active',
 NULL,'sub_tool_interactive01',NULL,'price_interactive0001',2999,'usd',
 now()+interval '90 days',now()-interval '1 minute','in_interactive_new',false);
DO $newAfterRefund$
BEGIN
 IF NOT public.user_has_tool_access('44444444-4444-4444-8444-444444444444','INTERACTIVE_LEARNING')
 THEN RAISE EXCEPTION 'NEW_INVOICE_FAILED_TO_RESTORE_PAID_ACCESS'; END IF;
 RAISE NOTICE 'PASS different verified invoice can restore access';
END $newAfterRefund$;

-- Chargeback/dispute should pause Journal only, not other tools or newer invoices.
SELECT public.gu61_staging_stripe_apply_event('evt_tool_journal_dispute','subscription_disputed',
 NULL,'sub_tool_journal0001',NULL,'price_journal0002',NULL,'usd',
 now()+interval '60 days',now()-interval '1 minute','in_journal_renew',false);
DO $dispute$
BEGIN
 IF public.user_has_tool_access('55555555-5555-4555-8555-555555555555','JOURNAL_ANALYTICS')
 OR (SELECT status FROM public.user_tool_passes
  WHERE provider_subscription_id='sub_tool_journal0001')<>'paused'
 OR NOT public.user_has_tool_access('77777777-7777-4777-8777-777777777777','MARKET_TUTOR')
 THEN RAISE EXCEPTION 'DISPUTED_JOURNAL_NOT_SCOPED_TO_ORIGINAL_PURCHASE'; END IF;
 RAISE NOTICE 'PASS disputed latest invoice suspends only its specific tool';
END $dispute$;
DO $roleGates$
BEGIN
 IF has_function_privilege('anon',
 'public.gu61_staging_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean)','EXECUTE')
 OR has_function_privilege('authenticated',
 'public.gu61_staging_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'UNTRUSTED_ROLE_CAN_FULFILL_STRIPE'; END IF;
 IF (SELECT count(*) FROM public.user_tool_passes WHERE provider='STRIPE_MANAGED')<>5
 THEN RAISE EXCEPTION 'UNEXPECTED_NUMBER_OF_INDEPENDENT_TEST_TOOL_SUBSCRIPTIONS'; END IF;
 RAISE NOTICE 'PASS service-only webhook RPC and exactly-scoped tool subscription records';
END $roleGates$;
SELECT 'PASS FOUR_TOOL_LIFECYCLE' AS test,
 (SELECT count(*) FROM public.gu61_staging_stripe_events) processed_events,
 (SELECT count(*) FROM public.user_tool_passes WHERE provider='STRIPE_MANAGED') tool_passes;
