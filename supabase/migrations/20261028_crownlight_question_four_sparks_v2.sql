-- Crownlight Sparks V2: 4 Sparks for eligible ungraded reveal/skip.
-- Prevent simultaneous requests, cross-bucket partial charges and double spending.
ALTER TABLE public.groundup_question_pass_spends
 ADD COLUMN IF NOT EXISTS credits_spent integer NOT NULL DEFAULT 1 CHECK (credits_spent>0);
CREATE TABLE IF NOT EXISTS public.gu_sparks_question_debits_v1 (
 spend_id uuid NOT NULL REFERENCES public.groundup_question_pass_spends(id) ON DELETE RESTRICT,
 bucket_id uuid NOT NULL REFERENCES public.groundup_question_pass_buckets(id) ON DELETE RESTRICT,
 amount integer NOT NULL CHECK (amount>0),
 PRIMARY KEY(spend_id,bucket_id)
);
ALTER TABLE public.gu_sparks_question_debits_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_sparks_question_debits_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_sparks_question_debits_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.groundup_question_pass_spend(
 p_user_id uuid,p_attempt_id uuid,p_lab_id text,p_question_id text,p_action text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_existing public.groundup_question_pass_spends%rowtype;
 v_bucket record;v_first uuid;v_spend uuid;v_total integer;
 v_remaining integer:=4;v_take integer;
BEGIN
 IF p_user_id IS NULL OR p_attempt_id IS NULL OR p_request_id IS NULL
  OR p_lab_id !~ '^F[23]-C[0-9]{2}-L[0-9]{2}$'
  OR p_question_id NOT IN ('body','range','percent','dollars','shares','vwap')
  OR p_action NOT IN ('reveal','skip')
 THEN RETURN jsonb_build_object('ok',false,'error','Invalid credit request');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
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
 IF v_total<4 THEN RETURN jsonb_build_object('ok',false,'error','Insufficient Crownlight Sparks',
  'balance',public.groundup_question_pass_summary(p_user_id));END IF;
 SELECT id INTO v_first FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>now())
 ORDER BY issued_at,id LIMIT 1;
 INSERT INTO public.groundup_question_pass_spends(
  user_id,bucket_id,request_id,attempt_id,lab_id,question_id,action,credits_spent)
 VALUES(p_user_id,v_first,p_request_id,p_attempt_id,p_lab_id,p_question_id,p_action,4)
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
 RETURN jsonb_build_object('ok',true,'alreadyUsed',false,'spent',4,
  'action',p_action,'balance',public.groundup_question_pass_summary(p_user_id));
END $fn$;
REVOKE ALL ON FUNCTION public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)
 TO service_role;
