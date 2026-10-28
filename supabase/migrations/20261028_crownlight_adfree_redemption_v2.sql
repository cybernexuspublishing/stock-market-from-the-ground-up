-- Crownlight Sparks V2: atomic ad-free redemption, idempotent across retries/tabs.
CREATE OR REPLACE FUNCTION public.gu_sparks_adfree_redeem_v1(
 p_user_id uuid,p_sku text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_cost integer;v_days integer;v_eligible jsonb;
 v_prior record;v_total integer;v_remaining integer;v_take integer;
 v_bucket record;v_id uuid;v_expiry timestamptz;v_old_expiry timestamptz;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL
 OR p_sku NOT IN ('ADFREE_DAY','ADFREE_WEEK','ADFREE_MONTH')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 SELECT sku,sparks_spent,expires_at INTO v_prior
 FROM public.gu_sparks_adfree_redemptions_v1
 WHERE user_id=p_user_id AND request_id=p_request_id;
 IF FOUND THEN
  IF v_prior.sku<>p_sku THEN
   RETURN jsonb_build_object('ok',false,'error','REQUEST_REUSED');END IF;
  RETURN jsonb_build_object('ok',true,'alreadyRedeemed',true,
   'spent',v_prior.sparks_spent,'expiresAt',v_prior.expires_at,
   'balance',public.groundup_question_pass_summary(p_user_id));
 END IF;
 v_eligible:=public.gu_sparks_adfree_status_v1(p_user_id);
 IF v_eligible->>'ok'<>'true' OR v_eligible->>'eligible'<>'true'
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_ELIGIBLE');END IF;
 v_cost:=CASE p_sku WHEN 'ADFREE_DAY' THEN 5 WHEN 'ADFREE_WEEK' THEN 18 ELSE 50 END;
 v_days:=CASE p_sku WHEN 'ADFREE_DAY' THEN 1 WHEN 'ADFREE_WEEK' THEN 7 ELSE 30 END;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO v_total
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>now());
 IF v_total<v_cost THEN
  RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_SPARKS',
   'balance',public.groundup_question_pass_summary(p_user_id));END IF;
 SELECT expires_at INTO v_old_expiry FROM public.gu_sparks_adfree_passes_v1
 WHERE user_id=p_user_id FOR UPDATE;
 v_expiry:=greatest(coalesce(v_old_expiry,clock_timestamp()),clock_timestamp())+
  make_interval(days=>v_days);
 INSERT INTO public.gu_sparks_adfree_redemptions_v1(
  user_id,request_id,sku,sparks_spent,expires_at)
 VALUES(p_user_id,p_request_id,p_sku,v_cost,v_expiry) RETURNING id INTO v_id;
 v_remaining:=v_cost;
 FOR v_bucket IN
  SELECT id,remaining_credits FROM public.groundup_question_pass_buckets
  WHERE user_id=p_user_id AND remaining_credits>0
  AND (expires_at IS NULL OR expires_at>now())
  ORDER BY expires_at ASC NULLS LAST,issued_at,id FOR UPDATE
 LOOP
  v_take:=least(v_remaining,v_bucket.remaining_credits);
  UPDATE public.groundup_question_pass_buckets
   SET remaining_credits=remaining_credits-v_take WHERE id=v_bucket.id;
  INSERT INTO public.gu_sparks_adfree_debits_v1(redemption_id,bucket_id,amount)
   VALUES(v_id,v_bucket.id,v_take);
  v_remaining:=v_remaining-v_take;
  EXIT WHEN v_remaining=0;
 END LOOP;
 IF v_remaining<>0 THEN RAISE EXCEPTION 'ATOMIC_SPARKS_DEBIT_FAILED';END IF;
 INSERT INTO public.gu_sparks_adfree_passes_v1(user_id,expires_at)
 VALUES(p_user_id,v_expiry)
 ON CONFLICT(user_id) DO UPDATE
 SET expires_at=excluded.expires_at,updated_at=now();
 RETURN jsonb_build_object('ok',true,'alreadyRedeemed',false,
  'spent',v_cost,'expiresAt',v_expiry,
  'balance',public.groundup_question_pass_summary(p_user_id));
END $fn$;
REVOKE ALL ON FUNCTION public.gu_sparks_adfree_redeem_v1(uuid,text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_sparks_adfree_redeem_v1(uuid,text,uuid) TO service_role;
