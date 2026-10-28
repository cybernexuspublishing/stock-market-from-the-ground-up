-- SMFGU Free Sparks V1. One grant of 2 on entry, then 2 at monthly anniversaries.
-- Each grant expires on its next calendar-month anniversary, with no rollover.
-- Paid Founder and purchased/manually issued buckets are unchanged.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

ALTER TABLE public.groundup_question_pass_buckets
 DROP CONSTRAINT groundup_question_pass_buckets_source_check;
ALTER TABLE public.groundup_question_pass_buckets
 ADD CONSTRAINT groundup_question_pass_buckets_source_check
 CHECK (source IN ('included','purchased','manual','free_included'));

ALTER TABLE public.groundup_question_pass_buckets
 DROP CONSTRAINT groundup_qp_expiration_policy;
ALTER TABLE public.groundup_question_pass_buckets
 ADD CONSTRAINT groundup_qp_expiration_policy CHECK (
  (source IN ('purchased','manual') AND billing_period_ends_at IS NULL AND expires_at IS NULL)
  OR (source='included' AND billing_period_ends_at IS NOT NULL AND expires_at IS NOT NULL AND
   expires_at IN (billing_period_ends_at+interval '60 days',billing_period_ends_at+interval '90 days',billing_period_ends_at+interval '150 days'))
  OR (source='free_included' AND billing_period_ends_at IS NULL AND expires_at=issued_at+interval '1 month')
 );

CREATE OR REPLACE FUNCTION public.groundup_free_sparks_ensure(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp' AS $fn$
DECLARE
 v_profile record;v_start timestamptz;v_begin timestamptz;v_end timestamptz;
 v_months integer;v_origin text;v_issued integer:=0;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Member required' USING errcode='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('FREE_SPARKS:'||p_user_id::text,48213));
 SELECT account_kind,deleted_at,created_at INTO v_profile FROM public.profiles WHERE id=p_user_id;
 IF NOT FOUND OR v_profile.account_kind<>'member' OR v_profile.deleted_at IS NOT NULL THEN
  RETURN jsonb_build_object('ok',false,'reason','ineligible_account');
 END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_flags
  WHERE user_id=p_user_id AND lower(status) IN ('restricted','suspended'))
 THEN RETURN jsonb_build_object('ok',false,'reason','restricted'); END IF;
 IF EXISTS(SELECT 1 FROM public.user_plan_grants
   WHERE user_id=p_user_id AND plan_code<>'FREE' AND status='active'
     AND starts_at<=clock_timestamp() AND (ends_at IS NULL OR ends_at>clock_timestamp()))
 THEN RETURN jsonb_build_object('ok',true,'issued',0,'reason','paid_account_excluded'); END IF;
 v_start:=greatest(coalesce(v_profile.created_at,clock_timestamp()),'2026-10-28T00:00:00Z'::timestamptz);
 IF v_start>clock_timestamp() THEN RETURN jsonb_build_object('ok',true,'issued',0); END IF;
 v_months:=(extract(year from age(clock_timestamp(),v_start))::int*12+
   extract(month from age(clock_timestamp(),v_start))::int);
 v_months:=greatest(0,v_months);
 v_begin:=v_start+make_interval(months=>v_months);
 WHILE v_begin>clock_timestamp() AND v_months>0 LOOP
  v_months:=v_months-1;v_begin:=v_start+make_interval(months=>v_months);
 END LOOP;
 WHILE v_start+make_interval(months=>v_months+1)<=clock_timestamp() LOOP
  v_months:=v_months+1;v_begin:=v_start+make_interval(months=>v_months);
 END LOOP;
 v_end:=v_start+make_interval(months=>v_months+1);
 v_origin:='FREE_MONTHLY_V1:'||to_char(v_begin AT TIME ZONE 'UTC','YYYYMMDDHH24MISS');
 INSERT INTO public.groundup_question_pass_buckets
   (user_id,source,origin_key,initial_credits,remaining_credits,issued_at,billing_period_ends_at,expires_at)
 VALUES(p_user_id,'free_included',v_origin,2,2,v_begin,NULL,v_begin+interval '1 month')
 ON CONFLICT (user_id,origin_key) DO NOTHING;
 GET DIAGNOSTICS v_issued=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'issued',2*v_issued,'currentWindowEndsAt',v_end,
   'nextGrantAt',v_end,'monthlyAllowance',2);
END $fn$;

REVOKE ALL ON FUNCTION public.groundup_free_sparks_ensure(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.groundup_free_sparks_ensure(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.groundup_question_pass_summary(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public','pg_temp' AS $fn$
DECLARE vi integer;vp integer;vm integer;ve timestamptz;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Invalid member' USING errcode='22023'; END IF;
 SELECT
  coalesce(sum(remaining_credits) FILTER(WHERE source IN ('included','free_included')),0)::integer,
  coalesce(sum(remaining_credits) FILTER(WHERE source='purchased'),0)::integer,
  coalesce(sum(remaining_credits) FILTER(WHERE source='manual'),0)::integer,
  min(expires_at) FILTER(WHERE source IN ('included','free_included'))
 INTO vi,vp,vm,ve FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0 AND (expires_at IS NULL OR expires_at>now());
 RETURN jsonb_build_object('included',vi,'purchased',vp,'manual',vm,
  'available',vi+vp+vm,'nextExpiry',ve);
END $fn$;

CREATE OR REPLACE FUNCTION public.groundup_question_pass_spend(
 p_user_id uuid,p_attempt_id uuid,p_lab_id text,p_question_id text,p_action text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp' AS $fn$
DECLARE v_existing public.groundup_question_pass_spends%rowtype;
 v_bucket public.groundup_question_pass_buckets%rowtype;v_balance jsonb;
BEGIN
 IF p_user_id IS NULL OR p_attempt_id IS NULL OR p_request_id IS NULL
  OR p_lab_id !~ '^F[23]-C[0-9]{2}-L[0-9]{2}$'
  OR p_question_id NOT IN ('body','range','percent','dollars','shares','vwap')
  OR p_action NOT IN ('reveal','skip') THEN
  RETURN jsonb_build_object('ok',false,'error','Invalid credit request');
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 SELECT * INTO v_existing FROM public.groundup_question_pass_spends
  WHERE user_id=p_user_id AND (request_id=p_request_id OR
   (attempt_id=p_attempt_id AND lab_id=p_lab_id AND question_id=p_question_id))
  ORDER BY spent_at LIMIT 1;
 IF FOUND THEN
  IF v_existing.action<>p_action OR v_existing.attempt_id<>p_attempt_id
    OR v_existing.lab_id<>p_lab_id OR v_existing.question_id<>p_question_id THEN
   RETURN jsonb_build_object('ok',false,'error','This credit request belongs to a different question or action');
  END IF;
  RETURN jsonb_build_object('ok',true,'alreadyUsed',true,'action',v_existing.action,
   'balance',public.groundup_question_pass_summary(p_user_id));
 END IF;
 SELECT * INTO v_bucket FROM public.groundup_question_pass_buckets
  WHERE user_id=p_user_id AND remaining_credits>0
   AND (expires_at IS NULL OR expires_at>clock_timestamp())
  ORDER BY expires_at ASC NULLS LAST,issued_at,id FOR UPDATE LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','No Crownlight Sparks available',
    'balance',public.groundup_question_pass_summary(p_user_id)); END IF;
 UPDATE public.groundup_question_pass_buckets
  SET remaining_credits=remaining_credits-1 WHERE id=v_bucket.id;
 INSERT INTO public.groundup_question_pass_spends
  (user_id,bucket_id,request_id,attempt_id,lab_id,question_id,action)
 VALUES(p_user_id,v_bucket.id,p_request_id,p_attempt_id,p_lab_id,p_question_id,p_action);
 v_balance:=public.groundup_question_pass_summary(p_user_id);
 RETURN jsonb_build_object('ok',true,'alreadyUsed',false,'action',p_action,'balance',v_balance);
END $fn$;
COMMIT;
