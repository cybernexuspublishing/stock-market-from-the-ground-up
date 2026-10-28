-- Central pricing integration for legacy Sparks features.
-- Existing redemption history and idempotent retries retain historical cost.
BEGIN;
ALTER TABLE public.gu_sparks_adfree_redemptions_v1
 DROP CONSTRAINT IF EXISTS gu_sparks_adfree_redemptions_v1_sparks_spent_check;
ALTER TABLE public.gu_sparks_adfree_redemptions_v1
 ADD CONSTRAINT gu_sparks_adfree_redemptions_v1_sparks_spent_check
 CHECK(sparks_spent BETWEEN 1 AND 100000);
CREATE OR REPLACE FUNCTION public.gu_sparks_adfree_redeem_v1(
 p_user_id uuid,p_sku text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_cost integer;v_hours integer;v_eligible jsonb;
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
 SELECT sparks_cost,duration_hours INTO v_cost,v_hours FROM public.gu_sparks_price_catalog_v1
 WHERE sku=p_sku AND fulfillment='ADFREE_PASS' AND state='active' FOR SHARE;
 IF NOT FOUND OR v_hours IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','OFFER_UNAVAILABLE');END IF;
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
  make_interval(hours=>v_hours);
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

CREATE OR REPLACE FUNCTION public.groundup_question_pass_spend(
 p_user_id uuid,p_attempt_id uuid,p_lab_id text,p_question_id text,p_action text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_existing public.groundup_question_pass_spends%rowtype;
 v_bucket record;v_first uuid;v_spend uuid;v_total integer;
 v_remaining integer;v_cost integer;v_take integer;
BEGIN
 IF p_user_id IS NULL OR p_attempt_id IS NULL OR p_request_id IS NULL
  OR p_lab_id !~ '^F[23]-C[0-9]{2}-L[0-9]{2}$'
  OR p_question_id NOT IN ('body','range','percent','dollars','shares','vwap')
  OR p_action NOT IN ('reveal','skip')
 THEN RETURN jsonb_build_object('ok',false,'error','Invalid credit request');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 SELECT sparks_cost INTO v_cost FROM public.gu_sparks_price_catalog_v1
 WHERE sku=CASE p_action WHEN 'reveal' THEN 'PRACTICE_REVEAL' ELSE 'PRACTICE_SKIP' END
  AND fulfillment='PRACTICE_ACTION' AND state='active' FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','OFFER_UNAVAILABLE');END IF;
 v_remaining:=v_cost;
 SELECT * INTO v_existing FROM public.groundup_question_pass_spends
 WHERE user_id=p_user_id AND (request_id=p_request_id
 OR (attempt_id=p_attempt_id AND lab_id=p_lab_id AND question_id=p_question_id))
 ORDER BY spent_at LIMIT 1;
 IF FOUND THEN
  IF v_existing.action<>p_action OR v_existing.attempt_id<>p_attempt_id
   OR v_existing.lab_id<>p_lab_id OR v_existing.question_id<>p_question_id
  THEN RETURN jsonb_build_object('ok',false,'error','Credit request mismatch');END IF;
  RETURN jsonb_build_object('ok',true,'alreadyUsed',true,
   'spent',v_existing.credits_spent,'action',v_existing.action,
   'balance',public.groundup_question_pass_summary(p_user_id));
 END IF;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO v_total
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>now());
 IF v_total<v_cost THEN RETURN jsonb_build_object('ok',false,'error','Insufficient Crownlight Sparks',
  'balance',public.groundup_question_pass_summary(p_user_id));END IF;
 SELECT id INTO v_first FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>now())
 ORDER BY issued_at,id LIMIT 1;
 INSERT INTO public.groundup_question_pass_spends(
  user_id,bucket_id,request_id,attempt_id,lab_id,question_id,action,credits_spent)
 VALUES(p_user_id,v_first,p_request_id,p_attempt_id,p_lab_id,p_question_id,p_action,v_cost)
 RETURNING id INTO v_spend;
 FOR v_bucket IN SELECT id,remaining_credits
  FROM public.groundup_question_pass_buckets
  WHERE user_id=p_user_id AND remaining_credits>0
  AND (expires_at IS NULL OR expires_at>now())
  ORDER BY issued_at,id FOR UPDATE LOOP
  v_take:=least(v_remaining,v_bucket.remaining_credits);
  UPDATE public.groundup_question_pass_buckets
   SET remaining_credits=remaining_credits-v_take WHERE id=v_bucket.id;
  INSERT INTO public.gu_sparks_question_debits_v1(spend_id,bucket_id,amount)
  VALUES(v_spend,v_bucket.id,v_take);
  v_remaining:=v_remaining-v_take;
  EXIT WHEN v_remaining=0;
 END LOOP;
 IF v_remaining<>0 THEN RAISE EXCEPTION 'ATOMIC_QUESTION_SPEND_FAILED';END IF;
 RETURN jsonb_build_object('ok',true,'alreadyUsed',false,'spent',v_cost,
  'action',p_action,'balance',public.groundup_question_pass_summary(p_user_id));
END $fn$;
REVOKE ALL ON FUNCTION public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)
 TO service_role;

COMMIT;
