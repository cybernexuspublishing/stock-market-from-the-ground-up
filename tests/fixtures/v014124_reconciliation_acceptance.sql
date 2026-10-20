-- v124 disposable PostgreSQL ONLY; NEVER run against production.
\set ON_ERROR_STOP on
INSERT INTO public.site_subscriptions(user_id,plan_code,provider,provider_subscription_id,
 status,current_period_end,metadata)
 VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FULL_MONTHLY','STRIPE_MANAGED',
 'sub_VERIFIED123','active',now()+interval '30 days',
 '{"source":"gu58_live_signed_stripe"}');
INSERT INTO public.user_tool_passes(user_id,tool_code,provider,provider_subscription_id,
 status,current_period_end,metadata)
 VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','MARKET_TUTOR','STRIPE_MANAGED',
 'sub_TUTOR123','paused',now()+interval '30 days',
 '{"source":"gu58_live_signed_stripe"}');
SET ROLE service_role;
DO $x$
DECLARE a jsonb;b jsonb;c jsonb;rid bigint;
BEGIN
 a:=public.gu_v014124_next_reconcile_batch('plan',20);
 IF jsonb_array_length(a->'rows')<>1 OR (a->>'wrapped')::boolean IS NOT false THEN
  RAISE EXCEPTION 'First incremental scan must expose a member-bound signed LIVE row'; END IF;
 rid:=(a->'rows'->0->>'id')::bigint;
 IF a->'rows'->0->>'intent_id' IS NULL OR a->'rows'->0->>'price_id' IS NULL THEN
  RAISE EXCEPTION 'Missing immutable Stripe intent/price reference'; END IF;
 b:=public.gu_v014124_next_reconcile_batch('plan',20);
 IF (b->>'wrapped')::boolean IS DISTINCT FROM true OR jsonb_array_length(b->'rows')<>0 THEN
  RAISE EXCEPTION 'End-of-sweep cursor did not wrap safely';END IF;
 c:=public.gu_v014124_next_reconcile_batch('plan',20);
 IF jsonb_array_length(c->'rows')<>1 THEN RAISE EXCEPTION 'Restart from zero failed';END IF;
 IF NOT public.gu_v014124_record_reconcile_result('plan',rid,'state_mismatch','past_due') THEN
  RAISE EXCEPTION 'Failed to write a private mismatch';END IF;
 IF NOT public.gu_v014124_record_reconcile_result('plan',rid,'state_mismatch','past_due') THEN
  RAISE EXCEPTION 'Idempotent re-observation failed';END IF;
 IF (SELECT sightings FROM public.gu_billing_reconcile_issues_v014124
 WHERE source_kind='plan' AND local_record_id=rid)<>2 THEN
  RAISE EXCEPTION 'Consecutive mismatch sightings not counted'; END IF;
 IF NOT public.gu_v014124_record_reconcile_result('plan',rid,'ok','active') THEN
  RAISE EXCEPTION 'Mismatch resolution failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu_billing_reconcile_issues_v014124
 WHERE source_kind='plan' AND local_record_id=rid AND resolved_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Private issue not resolved after matching provider'; END IF;
 a:=public.gu_v014124_next_reconcile_batch('tool',20);
 IF jsonb_array_length(a->'rows')<>1 OR a->'rows'->0->>'price_id' IS NULL THEN
  RAISE EXCEPTION 'Separate tool membership scan incomplete'; END IF;
 RAISE NOTICE 'PASS v124: actual SQL circular signed-LIVE scan, issuer verification, mismatch aggregation and resolution';
END $x$;
RESET ROLE;
DO $auth$
BEGIN
 IF has_function_privilege('authenticated','public.gu_v014124_next_reconcile_batch(text,integer)','EXECUTE')
 OR has_table_privilege('authenticated','public.gu_billing_reconcile_issues_v014124','SELECT')
 OR has_function_privilege('anon','public.gu_v014124_record_reconcile_result(text,bigint,text,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Private reconciliation data or write RPC leaked publicly';
 END IF;
END $auth$;
