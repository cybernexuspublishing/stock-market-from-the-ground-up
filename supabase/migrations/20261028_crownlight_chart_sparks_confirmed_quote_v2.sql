-- Prevent TOCTOU price changes: the amount confirmed in the browser must match the
-- catalog price locked by the atomic database redemption transaction.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_sparks_chart_redeem_v2(
 p_user_id uuid,p_sku text,p_request_id uuid,p_expected_cost integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_offer public.gu_sparks_price_catalog_v1%rowtype;
 v_tier text;v_previous record;v_cost integer;v_balance integer;
 v_bucket record;v_take integer;v_remaining integer;v_id uuid;v_old timestamptz;v_new timestamptz;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR NOT (p_expected_cost BETWEEN 1 AND 100000) OR p_sku NOT IN
 ('CHART_ADVANCED_DAY','CHART_ADVANCED_WEEK','CHART_ADVANCED_MONTH',
  'CHART_PROFESSIONAL_DAY','CHART_PROFESSIONAL_WEEK','CHART_PROFESSIONAL_MONTH')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 SELECT sku,tier,sparks_spent,expires_at INTO v_previous
 FROM public.gu_sparks_chart_redemptions_v1
 WHERE user_id=p_user_id AND request_id=p_request_id;
 IF FOUND THEN
  IF v_previous.sku<>p_sku THEN RETURN jsonb_build_object('ok',false,'error','REQUEST_REUSED');END IF;
  RETURN jsonb_build_object('ok',true,'alreadyRedeemed',true,'spent',v_previous.sparks_spent,
    'tier',v_previous.tier,'expiresAt',v_previous.expires_at,
    'balance',public.groundup_question_pass_summary(p_user_id));
 END IF;
 SELECT * INTO v_offer FROM public.gu_sparks_price_catalog_v1
 WHERE sku=p_sku AND fulfillment='CHART_PASS' AND state='active' FOR SHARE;
 IF NOT FOUND OR v_offer.duration_hours IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','OFFER_UNAVAILABLE');END IF;
 IF v_offer.sparks_cost<>p_expected_cost THEN RETURN jsonb_build_object('ok',false,'error','PRICE_CHANGED');END IF;
 v_tier:=CASE WHEN p_sku LIKE 'CHART_ADVANCED_%' THEN 'ADVANCED' ELSE 'PROFESSIONAL' END;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users a ON a.id=p.id
   WHERE p.id=p_user_id AND p.account_kind='member' AND p.deleted_at IS NULL
    AND a.email_confirmed_at IS NOT NULL AND a.deleted_at IS NULL
    AND (a.banned_until IS NULL OR a.banned_until<=now()))
 OR EXISTS (SELECT 1 FROM public.admin_user_flags WHERE user_id=p_user_id
    AND lower(status) IN ('restricted','suspended'))
 OR EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=p_user_id
    AND role_code='SHOWCASE_VIEWER' AND (expires_at IS NULL OR expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_ELIGIBLE');END IF;
 -- Prevent paying for tier already included by existing full memberships or founding paid cycles.
 IF EXISTS (SELECT 1 FROM public.user_plan_grants
   WHERE user_id=p_user_id AND plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME')
    AND status='active' AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS (SELECT 1 FROM public.gu_founder_paid_cycles_v014173 c
   JOIN public.gu_founder_members_v014173 m ON m.user_id=c.user_id
   WHERE c.user_id=p_user_id AND m.revoked_at IS NULL AND c.reversed_at IS NULL
    AND c.billing_start<=now() AND c.billing_end>now()
    AND (c.plan_code='FOUNDING_60' OR (v_tier='ADVANCED' AND c.plan_code='FOUNDING_30')))
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED');END IF;
 IF v_tier='ADVANCED' AND EXISTS(SELECT 1 FROM public.gu_sparks_chart_passes_v1
   WHERE user_id=p_user_id AND tier='PROFESSIONAL' AND expires_at>now())
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED');END IF;
 v_cost:=v_offer.sparks_cost;v_remaining:=v_cost;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO v_balance
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>now());
 IF v_balance<v_cost THEN RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_SPARKS',
   'balance',public.groundup_question_pass_summary(p_user_id));END IF;
 SELECT expires_at INTO v_old FROM public.gu_sparks_chart_passes_v1
 WHERE user_id=p_user_id AND tier=v_tier FOR UPDATE;
 v_new:=greatest(coalesce(v_old,clock_timestamp()),clock_timestamp())+
   make_interval(hours=>v_offer.duration_hours);
 IF v_new>clock_timestamp()+interval '365 days' THEN
   RETURN jsonb_build_object('ok',false,'error','PASS_EXTENSION_LIMIT');END IF;
 INSERT INTO public.gu_sparks_chart_redemptions_v1(user_id,request_id,sku,tier,sparks_spent,expires_at)
 VALUES(p_user_id,p_request_id,p_sku,v_tier,v_cost,v_new) RETURNING id INTO v_id;
 FOR v_bucket IN SELECT id,remaining_credits
  FROM public.groundup_question_pass_buckets WHERE user_id=p_user_id AND remaining_credits>0
   AND (expires_at IS NULL OR expires_at>now())
  ORDER BY expires_at ASC NULLS LAST,issued_at,id FOR UPDATE
 LOOP
  v_take:=least(v_remaining,v_bucket.remaining_credits);
  UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits-v_take
    WHERE id=v_bucket.id;
  INSERT INTO public.gu_sparks_chart_debits_v1(redemption_id,bucket_id,amount)
   VALUES(v_id,v_bucket.id,v_take);
  v_remaining:=v_remaining-v_take;
  EXIT WHEN v_remaining=0;
 END LOOP;
 IF v_remaining<>0 THEN RAISE EXCEPTION 'ATOMIC_CHART_DEBIT_FAILURE';END IF;
 INSERT INTO public.gu_sparks_chart_passes_v1(user_id,tier,expires_at)
 VALUES(p_user_id,v_tier,v_new)
 ON CONFLICT(user_id,tier) DO UPDATE SET expires_at=EXCLUDED.expires_at,updated_at=now();
 RETURN jsonb_build_object('ok',true,'alreadyRedeemed',false,'spent',v_cost,
   'tier',v_tier,'expiresAt',v_new,'balance',public.groundup_question_pass_summary(p_user_id));
END $fn$;
REVOKE ALL ON FUNCTION public.gu_sparks_chart_redeem_v2(uuid,text,uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_sparks_chart_redeem_v2(uuid,text,uuid,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.gu_sparks_chart_redeem_v1(uuid,text,uuid) FROM service_role;
COMMIT;
