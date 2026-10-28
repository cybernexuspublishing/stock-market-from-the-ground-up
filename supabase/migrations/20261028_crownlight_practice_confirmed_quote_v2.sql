BEGIN;
CREATE OR REPLACE FUNCTION public.groundup_question_pass_spend_v2(
 p_user_id uuid,p_attempt_id uuid,p_lab_id text,p_question_id text,p_action text,p_request_id uuid,p_expected_cost integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_existing public.groundup_question_pass_spends%rowtype;
 v_bucket record;v_first uuid;v_spend uuid;v_total integer;
 v_remaining integer;v_cost integer;v_take integer;
BEGIN
 IF p_user_id IS NULL OR p_attempt_id IS NULL OR p_request_id IS NULL OR NOT (p_expected_cost BETWEEN 1 AND 100000)
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
 IF v_cost<>p_expected_cost THEN RETURN jsonb_build_object('ok',false,'error','PRICE_CHANGED');END IF;
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

REVOKE ALL ON FUNCTION public.groundup_question_pass_spend_v2(uuid,uuid,text,text,text,uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.groundup_question_pass_spend_v2(uuid,uuid,text,text,text,uuid,integer)
 TO service_role;
REVOKE EXECUTE ON FUNCTION public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid) FROM service_role;
COMMIT;