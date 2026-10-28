-- Include subscription records in Free-grant paid account exclusion.
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
   WHERE user_id=p_user_id AND plan_code<>'FREE' AND status IN ('active','trialing')
     AND starts_at<=clock_timestamp() AND (ends_at IS NULL OR ends_at>clock_timestamp()))
 OR EXISTS(SELECT 1 FROM public.site_subscriptions
   WHERE user_id=p_user_id AND plan_code<>'FREE' AND status IN ('active','trialing')
     AND (current_period_end IS NULL OR current_period_end>clock_timestamp()))
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
 VALUES(p_user_id,'free_included',v_origin,5,5,v_begin,NULL,NULL)
 ON CONFLICT (user_id,origin_key) DO NOTHING;
 GET DIAGNOSTICS v_issued=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'issued',5*v_issued,'currentWindowEndsAt',v_end,
   'nextGrantAt',v_end,'monthlyAllowance',5);
END $fn$;

REVOKE ALL ON FUNCTION public.groundup_free_sparks_ensure(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.groundup_free_sparks_ensure(uuid) TO service_role;

