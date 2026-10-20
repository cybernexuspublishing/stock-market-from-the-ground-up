-- v0.14.0.121 | OWNER REVIEW REQUIRED | additive ONE existing Supabase project.
-- Weekly free plan: 15 created Journal records + 10 saved browser CSV
-- simulator results PER ISO WEEK UTC; simulator saves consume Journal slots.
-- NOTE: this is NOT a free entitlement to private licensed/server-controlled
-- replay. Those are separately gated by user_has_tool_access.
-- Protect privacy, immutable usage counters, limit bypass by deletion/recreate,
-- simultaneous requests, and non-owner usage reads. No Stripe price changes.
BEGIN;
DO $deps$
DECLARE p public.platform_plans%ROWTYPE;
BEGIN
 IF to_regclass('public.decision_journal') IS NULL OR
    to_regclass('public.platform_plans') IS NULL OR
    to_regprocedure('public.user_has_tool_access(uuid,text)') IS NULL THEN
   RAISE EXCEPTION 'Existing Journal, plans or entitlement backend missing';
 END IF;
 SELECT * INTO p FROM public.platform_plans WHERE plan_code='FREE' FOR UPDATE;
 IF NOT FOUND OR p.price_cents<>0 THEN RAISE EXCEPTION 'FREE catalog missing or unexpectedly priced'; END IF;
 SELECT * INTO p FROM public.platform_plans WHERE plan_code='FULL_MONTHLY' FOR UPDATE;
 IF NOT FOUND OR p.price_cents<>6999 THEN
   RAISE EXCEPTION 'Existing FULL_MONTHLY SKU/price mismatch; do not mutate paid pricing';
 END IF;
END $deps$;
UPDATE public.platform_plans SET
 name='Free Membership',
 description='Free glossary and public lessons, basic progress, up to 15 Trading Journal records and 10 saved browser CSV simulator exercises per UTC week (simulator saves count toward the 15). Advanced Tutor, server replay, verified datasets and premium analysis require eligible paid access.',
 metadata=((metadata-'journal_limit'-'simulator_sessions_month')||
   '{"journal_limit_week":15,"simulator_saves_week":10,"quota_period":"iso_week_utc","quota_revision":"v0.14.0.121"}'::jsonb),
 updated_at=now()
WHERE plan_code='FREE' AND price_cents=0;
UPDATE public.platform_plans SET name='Full Platform — Monthly',
 description='All released first-party learning and companion tools while active, including eligible advanced Tutor, Journal analytics and server-controlled replay. Limited sponsor placements. Books and third-party services sold separately.',
 ad_free=false,updated_at=now()
WHERE plan_code='FULL_MONTHLY' AND price_cents=6999;

CREATE TABLE IF NOT EXISTS public.gu_free_weekly_usage_v014121(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 week_start date NOT NULL,
 usage_kind text NOT NULL CHECK(usage_kind IN ('journal','simulator_save')),
 used_count integer NOT NULL CHECK(used_count>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,week_start,usage_kind)
);
CREATE INDEX IF NOT EXISTS gu_free_week_usage_week_v014121
 ON public.gu_free_weekly_usage_v014121(week_start);
ALTER TABLE public.gu_free_weekly_usage_v014121 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_free_weekly_usage_v014121 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_free_weekly_usage_v014121 TO service_role;

-- A per-member transaction lock serializes both counting and insert/update
-- paths even if the client submits simultaneous requests from many tabs.
-- First use of a calendar week incorporates prior records, but later counter
-- consumption cannot be undone by deleting/recreating an old Journal row.
CREATE OR REPLACE FUNCTION public.gu_v014121_take_free_week_slot(
 p_user uuid,p_kind text,p_max integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $slot$
DECLARE
 w date:=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date;
 earliest timestamptz;
 baseline integer;
 previous integer;
BEGIN
 IF p_user IS NULL OR p_kind NOT IN ('journal','simulator_save') OR
    p_max IS NULL OR p_max NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Free account weekly quota configuration invalid';
 END IF;
 PERFORM pg_advisory_xact_lock(14121,hashtext(p_user::text));
 SELECT used_count INTO previous FROM public.gu_free_weekly_usage_v014121
 WHERE user_id=p_user AND week_start=w AND usage_kind=p_kind FOR UPDATE;
 IF FOUND THEN
  IF previous>=p_max THEN
   IF p_kind='journal' THEN RAISE EXCEPTION 'FREE_WEEKLY_JOURNAL_LIMIT_REACHED' USING ERRCODE='P0001';
   ELSE RAISE EXCEPTION 'FREE_WEEKLY_SIMULATOR_LIMIT_REACHED' USING ERRCODE='P0001'; END IF;
  END IF;
  UPDATE public.gu_free_weekly_usage_v014121
    SET used_count=previous+1,updated_at=now()
  WHERE user_id=p_user AND week_start=w AND usage_kind=p_kind;
  RETURN;
 END IF;
 earliest:=(w::timestamp AT TIME ZONE 'UTC');
 IF p_kind='journal' THEN
  SELECT count(*) INTO baseline FROM public.decision_journal
  WHERE user_id=p_user AND created_at>=earliest
    AND created_at<earliest+interval '7 days';
 ELSE
  SELECT count(*) INTO baseline FROM public.decision_journal
  WHERE user_id=p_user AND simulator_source IS NOT NULL
    AND created_at>=earliest AND created_at<earliest+interval '7 days';
 END IF;
 IF baseline>=p_max THEN
   IF p_kind='journal' THEN RAISE EXCEPTION 'FREE_WEEKLY_JOURNAL_LIMIT_REACHED' USING ERRCODE='P0001';
   ELSE RAISE EXCEPTION 'FREE_WEEKLY_SIMULATOR_LIMIT_REACHED' USING ERRCODE='P0001'; END IF;
 END IF;
 INSERT INTO public.gu_free_weekly_usage_v014121(user_id,week_start,usage_kind,used_count)
 VALUES(p_user,w,p_kind,baseline+1);
END $slot$;
REVOKE ALL ON FUNCTION public.gu_v014121_take_free_week_slot(uuid,text,integer)
 FROM PUBLIC,anon,authenticated;
-- No direct authenticated ability to consume or edit quota counters.
GRANT EXECUTE ON FUNCTION public.gu_v014121_take_free_week_slot(uuid,text,integer)
 TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_free_journal_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $quota$
DECLARE
 p jsonb;
 j_cap integer;
 s_cap integer;
 j_unlimited boolean;
 s_unlimited boolean;
BEGIN
 SELECT metadata INTO p FROM public.platform_plans
  WHERE plan_code='FREE' AND active=true FOR SHARE;
 IF NOT FOUND OR (p->>'journal_limit_week') !~ '^[0-9]{1,3}$'
    OR (p->>'simulator_saves_week') !~ '^[0-9]{1,3}$' THEN
  RAISE EXCEPTION 'Free membership quota configuration unavailable';
 END IF;
 j_cap:=(p->>'journal_limit_week')::integer;
 s_cap:=(p->>'simulator_saves_week')::integer;
 IF j_cap NOT BETWEEN 1 AND 500 OR s_cap NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Free membership quota configuration invalid';
 END IF;
 j_unlimited:=public.user_has_tool_access(NEW.user_id,'JOURNAL_ANALYTICS');
 s_unlimited:=public.user_has_tool_access(NEW.user_id,'MARKET_SIMULATOR');
 IF TG_OP='INSERT' AND NOT j_unlimited THEN
  PERFORM public.gu_v014121_take_free_week_slot(NEW.user_id,'journal',j_cap);
 END IF;
 IF NEW.simulator_source IS NOT NULL AND NOT s_unlimited AND
    (TG_OP='INSERT' OR OLD.simulator_source IS NULL) THEN
  PERFORM public.gu_v014121_take_free_week_slot(NEW.user_id,'simulator_save',s_cap);
 END IF;
 RETURN NEW;
END $quota$;
DROP TRIGGER IF EXISTS enforce_free_journal_limits ON public.decision_journal;
CREATE TRIGGER enforce_free_journal_limits
 BEFORE INSERT OR UPDATE OF simulator_source ON public.decision_journal
 FOR EACH ROW EXECUTE FUNCTION public.enforce_free_journal_limits();
REVOKE ALL ON FUNCTION public.enforce_free_journal_limits()
 FROM PUBLIC,anon,authenticated;

-- Auth-only self view. Counters are service-private; never trust client IDs.
CREATE OR REPLACE FUNCTION public.gu_v014121_my_free_week_usage()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $self$
DECLARE
 member uuid:=auth.uid();
 w date:=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date;
 start_at timestamptz;
 j_limit integer;
 s_limit integer;
 jc integer;
 sc integer;
 jpast integer;
 spast integer;
 jpaid boolean;
 spaid boolean;
BEGIN
 IF member IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT (metadata->>'journal_limit_week')::integer,
   (metadata->>'simulator_saves_week')::integer
 INTO j_limit,s_limit FROM public.platform_plans WHERE plan_code='FREE' AND active=true;
 IF j_limit IS NULL OR s_limit IS NULL THEN
  RAISE EXCEPTION 'Free usage configuration missing';
 END IF;
 start_at:=(w::timestamp AT TIME ZONE 'UTC');
 SELECT count(*),count(*) FILTER(WHERE simulator_source IS NOT NULL)
 INTO jpast,spast FROM public.decision_journal
 WHERE user_id=member AND created_at>=start_at
   AND created_at<start_at+interval '7 days';
 SELECT used_count INTO jc FROM public.gu_free_weekly_usage_v014121
 WHERE user_id=member AND week_start=w AND usage_kind='journal';
 SELECT used_count INTO sc FROM public.gu_free_weekly_usage_v014121
 WHERE user_id=member AND week_start=w AND usage_kind='simulator_save';
 jpaid:=public.user_has_tool_access(member,'JOURNAL_ANALYTICS');
 spaid:=public.user_has_tool_access(member,'MARKET_SIMULATOR');
 RETURN jsonb_build_object('weekStartUtc',w,'resetsAtUtc',start_at+interval '7 days',
  'journalLimit',j_limit,'journalUsed',greatest(coalesce(jc,0),jpast),
  'journalUnlimited',jpaid,'simulatorSaveLimit',s_limit,
  'simulatorSavesUsed',greatest(coalesce(sc,0),spast),
  'simulatorUnlimited',spaid,
  'scope','Saved browser CSV simulator exercises, not a free server replay entitlement');
END $self$;
REVOKE ALL ON FUNCTION public.gu_v014121_my_free_week_usage()
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_v014121_my_free_week_usage()
 TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Not a production install confirmation: run safe pre/postflight checks.
