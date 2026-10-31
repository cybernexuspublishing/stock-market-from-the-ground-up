-- TEST-only reversal of fully Lumen-funded Chart orders; no external refund or fake charge.
BEGIN;
CREATE OR REPLACE FUNCTION public.chart_mixed_test_refund_zero_v1(p_upgrade uuid,p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','pg_temp' AS $fn$
DECLARE o public.crownlight_chart_mixed_test_v1%ROWTYPE; d record;
BEGIN
 IF p_upgrade IS NULL OR p_user IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 SELECT * INTO o FROM public.crownlight_chart_mixed_test_v1 WHERE upgrade_id=p_upgrade AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','UNKNOWN_ORDER');END IF;
 IF o.cash_cents<>0 OR o.stripe_session_id IS NOT NULL OR o.stripe_payment_intent_id IS NOT NULL THEN
  RETURN jsonb_build_object('ok',false,'error','NOT_FULLY_LUMEN_FUNDED');END IF;
 IF o.status='refunded' THEN RETURN jsonb_build_object('ok',true,'alreadyRefunded',true);END IF;
 IF o.status<>'active' THEN RETURN jsonb_build_object('ok',false,'error','NOT_REFUNDABLE');END IF;
 FOR d IN SELECT * FROM public.crownlight_chart_mixed_test_debits_v1 WHERE upgrade_id=p_upgrade FOR UPDATE LOOP
  IF d.returned_at IS NOT NULL THEN RAISE EXCEPTION 'CREDITS_ALREADY_RETURNED';END IF;
  UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits+d.lumens
   WHERE id=d.bucket_id AND user_id=p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'MISSING_LUMEN_BUCKET';END IF;
  UPDATE public.crownlight_chart_mixed_test_debits_v1 SET returned_at=now() WHERE upgrade_id=p_upgrade AND bucket_id=d.bucket_id;
 END LOOP;
 UPDATE public.crownlight_chart_mixed_test_v1 SET status='refunded',updated_at=now() WHERE upgrade_id=p_upgrade;
 UPDATE public.crownlight_chart_cash_upgrades_v1 SET state='refunded',revoked_at=now(),updated_at=now() WHERE id=p_upgrade;
 INSERT INTO public.crownlight_chart_mixed_test_events_v1(event_id,upgrade_id,kind)
 VALUES('zero_refund_'||p_upgrade::text,p_upgrade,'refunded');
 RETURN jsonb_build_object('ok',true,'refundedLumens',o.lumens);
END $fn$;
REVOKE ALL ON FUNCTION public.chart_mixed_test_refund_zero_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.chart_mixed_test_refund_zero_v1(uuid,uuid) TO service_role;
COMMIT;