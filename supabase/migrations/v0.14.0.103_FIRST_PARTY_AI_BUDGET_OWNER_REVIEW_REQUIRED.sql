-- v0.14.0.103: first-party paid AI request ledger + atomic reservation.
-- Single EXISTING Supabase project, additive only. No subscription/competency changes.
-- NOT REQUIRED for ordinary source-grounded instruction. Owner installs separately.
-- Every provider call requires a fresh unique request ID and server-verified member.
-- The ledger tracks reserved provider REQUESTS, not provider billing or grades.
-- No question, reflection, reply, trade, financial data or AI provider key is stored.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_ai_service_requests_v014103 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 reserved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_ai_service_requests_v014103_user_date
 ON public.gu_ai_service_requests_v014103(user_id,reserved_at DESC);
CREATE INDEX IF NOT EXISTS gu_ai_service_requests_v014103_date
 ON public.gu_ai_service_requests_v014103(reserved_at DESC);
ALTER TABLE public.gu_ai_service_requests_v014103 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_ai_service_requests_v014103 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_ai_service_requests_v014103 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_ai_service_requests_v014103_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.gu_v014103_reserve_ai_request(
 p_user uuid,
 p_request uuid,
 p_member_day_limit integer,
 p_global_day_limit integer,
 p_global_month_limit integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 v_day timestamptz := date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 v_month timestamptz := date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 v_member bigint; v_day_all bigint; v_month_all bigint;
BEGIN
 IF p_user IS NULL OR p_request IS NULL
 OR p_member_day_limit NOT BETWEEN 1 AND 100
 OR p_global_day_limit NOT BETWEEN 1 AND 10000
 OR p_global_month_limit NOT BETWEEN 1 AND 250000
 THEN RETURN jsonb_build_object('accepted',false,'reason','invalid_limits'); END IF;
 -- Global serialized quota transaction prevents two tabs/members racing caps.
 PERFORM pg_advisory_xact_lock(140103,1);
 IF EXISTS(SELECT 1 FROM public.gu_ai_service_requests_v014103 WHERE request_id=p_request)
 THEN RETURN jsonb_build_object('accepted',false,'reason','duplicate_request'); END IF;
 SELECT count(*) INTO v_member FROM public.gu_ai_service_requests_v014103
 WHERE user_id=p_user AND reserved_at >= v_day;
 IF v_member >= p_member_day_limit
 THEN RETURN jsonb_build_object('accepted',false,'reason','member_daily_limit'); END IF;
 SELECT count(*) INTO v_day_all FROM public.gu_ai_service_requests_v014103
 WHERE reserved_at >= v_day;
 IF v_day_all >= p_global_day_limit
 THEN RETURN jsonb_build_object('accepted',false,'reason','global_daily_limit'); END IF;
 SELECT count(*) INTO v_month_all FROM public.gu_ai_service_requests_v014103
 WHERE reserved_at >= v_month;
 IF v_month_all >= p_global_month_limit
 THEN RETURN jsonb_build_object('accepted',false,'reason','global_monthly_limit'); END IF;
 INSERT INTO public.gu_ai_service_requests_v014103(request_id,user_id)
 VALUES(p_request,p_user);
 RETURN jsonb_build_object('accepted',true,'reason','reserved',
   'remainingMemberToday',greatest(0,p_member_day_limit-v_member-1));
END;$$;
REVOKE ALL ON FUNCTION public.gu_v014103_reserve_ai_request(uuid,uuid,integer,integer,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014103_reserve_ai_request(uuid,uuid,integer,integer,integer)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- READ ONLY expected preflight after install:
-- SELECT to_regclass('public.gu_ai_service_requests_v014103') AS request_ledger;
-- SELECT has_function_privilege('authenticated','public.gu_v014103_reserve_ai_request(uuid,uuid,integer,integer,integer)','EXECUTE') AS member_can_spend;
-- Expected: table exists, member_can_spend=false.
-- IMPORTANT: this is a count limiter, NOT a monetary or provider-level hard cap.
-- Provider billing controls remain required separately; do not activate AI blindly.
