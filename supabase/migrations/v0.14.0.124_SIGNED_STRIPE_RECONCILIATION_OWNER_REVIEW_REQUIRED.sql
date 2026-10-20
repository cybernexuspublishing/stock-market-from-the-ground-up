-- v0.14.0.124 | Owner reviewed | incremental read/reconcile evidence only.
-- Never grant, revoke, refund, charge or alter subscription entitlements here.
BEGIN;
DO $$BEGIN
 IF to_regclass('public.gu58_live_checkout_intents') IS NULL OR
 to_regclass('public.site_subscriptions') IS NULL OR
 to_regclass('public.user_tool_passes') IS NULL OR
 to_regclass('public.gu_billing_notice_outbox_v014123') IS NULL
 THEN RAISE EXCEPTION 'V124_REQUIRES_INSTALLED_SIGNED_GU58_AND_V123'; END IF;
END$$;
CREATE TABLE IF NOT EXISTS public.gu_billing_reconcile_cursor_v014124(
 source_kind text PRIMARY KEY CHECK(source_kind IN('plan','tool')),
 last_id bigint NOT NULL DEFAULT 0 CHECK(last_id>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_billing_reconcile_cursor_v014124(source_kind) VALUES
 ('plan'),('tool') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_billing_reconcile_issues_v014124(
 source_kind text NOT NULL CHECK(source_kind IN('plan','tool')),
 local_record_id bigint NOT NULL,
 issue_kind text NOT NULL CHECK(issue_kind IN
 ('state_mismatch','period_mismatch','price_mismatch','intent_mismatch',
  'provider_missing','provider_unavailable')),
 local_status text NOT NULL,
 provider_status text,
 first_seen_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 sightings integer NOT NULL DEFAULT 1,
 PRIMARY KEY(source_kind,local_record_id)
);
ALTER TABLE public.gu_billing_reconcile_cursor_v014124 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_billing_reconcile_issues_v014124 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_billing_reconcile_cursor_v014124 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_billing_reconcile_issues_v014124 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_billing_reconcile_cursor_v014124 TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.gu_billing_reconcile_issues_v014124 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_v014124_next_reconcile_batch(
 p_kind text,p_limit integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $scan$
DECLARE
 last_seen bigint;
 result jsonb;
 max_id bigint;
BEGIN
 IF p_kind NOT IN ('plan','tool') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 25
 THEN RAISE EXCEPTION 'INVALID_RECONCILIATION_BATCH'; END IF;
 SELECT last_id INTO last_seen FROM public.gu_billing_reconcile_cursor_v014124
 WHERE source_kind=p_kind FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECONCILIATION_CURSOR_MISSING'; END IF;
 IF p_kind='plan' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb),
         max(q.id) INTO result,max_id FROM (
   SELECT s.id,s.user_id,s.provider_subscription_id,s.status,s.current_period_end,
     i.id AS intent_id,i.price_id
   FROM public.site_subscriptions s
   LEFT JOIN public.gu58_live_checkout_intents i ON
    i.user_id=s.user_id AND i.stripe_subscription_id=s.provider_subscription_id
    AND i.sku_kind='plan' AND i.sku_code=s.plan_code
   WHERE s.id>last_seen AND s.provider='STRIPE_MANAGED'
     AND s.metadata->>'source'='gu58_live_signed_stripe'
   ORDER BY s.id LIMIT p_limit
  ) q;
 ELSE
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb),
         max(q.id) INTO result,max_id FROM (
   SELECT s.id,s.user_id,s.provider_subscription_id,s.status,s.current_period_end,
     i.id AS intent_id,i.price_id
   FROM public.user_tool_passes s
   LEFT JOIN public.gu58_live_checkout_intents i ON
    i.user_id=s.user_id AND i.stripe_subscription_id=s.provider_subscription_id
    AND i.sku_kind='tool' AND i.sku_code=s.tool_code
   WHERE s.id>last_seen AND s.provider='STRIPE_MANAGED'
     AND s.metadata->>'source'='gu58_live_signed_stripe'
   ORDER BY s.id LIMIT p_limit
  ) q;
 END IF;
 -- At the end of every sweep restart from ID 0 on the next scheduled run.
 -- Empty results are not proof of zero live subscriptions: they may represent
 -- a just-completed sweep or a source/ledger mismatch.
 UPDATE public.gu_billing_reconcile_cursor_v014124 SET
   last_id=coalesce(max_id,0),updated_at=now() WHERE source_kind=p_kind;
 RETURN jsonb_build_object('kind',p_kind,'rows',result,
   'cursor',coalesce(max_id,0),'wrapped',max_id IS NULL);
END $scan$;
REVOKE ALL ON FUNCTION public.gu_v014124_next_reconcile_batch(text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014124_next_reconcile_batch(text,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.gu_v014124_record_reconcile_result(
 p_kind text,p_local_id bigint,p_issue text,p_provider_status text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $result$
DECLARE current_status text; exists_bound boolean;
BEGIN
 IF p_kind NOT IN ('plan','tool') OR p_local_id IS NULL OR p_local_id<1
 OR p_issue NOT IN ('ok','state_mismatch','period_mismatch','price_mismatch',
  'intent_mismatch','provider_missing','provider_unavailable') OR
 length(coalesce(p_provider_status,''))>40
 THEN RAISE EXCEPTION 'INVALID_RECONCILIATION_RESULT'; END IF;
 IF p_kind='plan' THEN
  SELECT s.status INTO current_status FROM public.site_subscriptions s
  WHERE s.id=p_local_id AND s.provider='STRIPE_MANAGED'
    AND s.metadata->>'source'='gu58_live_signed_stripe';
 ELSE
  SELECT s.status INTO current_status FROM public.user_tool_passes s
  WHERE s.id=p_local_id AND s.provider='STRIPE_MANAGED'
    AND s.metadata->>'source'='gu58_live_signed_stripe';
 END IF;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_issue='ok' THEN
  UPDATE public.gu_billing_reconcile_issues_v014124 SET resolved_at=now(),
    last_seen_at=now() WHERE source_kind=p_kind AND local_record_id=p_local_id
    AND resolved_at IS NULL;
  RETURN true;
 END IF;
 INSERT INTO public.gu_billing_reconcile_issues_v014124(
  source_kind,local_record_id,issue_kind,local_status,provider_status
 ) VALUES(p_kind,p_local_id,p_issue,current_status,p_provider_status)
 ON CONFLICT(source_kind,local_record_id) DO UPDATE SET
  issue_kind=excluded.issue_kind,local_status=excluded.local_status,
  provider_status=excluded.provider_status,last_seen_at=now(),
  resolved_at=NULL,sightings=public.gu_billing_reconcile_issues_v014124.sightings+1;
 RETURN true;
END $result$;
REVOKE ALL ON FUNCTION public.gu_v014124_record_reconcile_result(text,bigint,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014124_record_reconcile_result(text,bigint,text,text)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
