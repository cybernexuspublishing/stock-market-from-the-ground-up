-- Safe Owner-controlled release of a noncommercial QA reservation before Stripe binding.
-- Not a paid refund and never changes real Lumen balances or customer entitlements.
-- HTTP caller must verify Owner step-up, TEST account, and no matching Stripe sessions.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_mixed_qa_cancel_unbound_v1(p_id uuid,p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
DECLARE row_data public.gu_mixed_qa_intents_v1%rowtype;
BEGIN
 IF p_id IS NULL OR p_user IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_TEST_ORDER');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu39_sandbox_settings WHERE id=true AND enabled=true)
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_TEST_MODE_DISABLED');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 SELECT * INTO row_data FROM public.gu_mixed_qa_intents_v1
 WHERE id=p_id AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','TEST_ORDER_NOT_FOUND');END IF;
 IF row_data.status='released' AND row_data.stripe_session_id IS NULL
 THEN RETURN jsonb_build_object('ok',true,'duplicate',true,'shadowOnly',true);END IF;
 IF row_data.status<>'reserved' OR row_data.stripe_session_id IS NOT NULL
 THEN RETURN jsonb_build_object('ok',false,'error','PAYMENT_SESSION_REQUIRES_RECONCILIATION');END IF;
 UPDATE public.gu_mixed_qa_wallet_v1
 SET available=available+row_data.lumens_reserved,updated_at=now()
 WHERE user_id=p_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'QA wallet missing for unbound reservation';END IF;
 UPDATE public.gu_mixed_qa_intents_v1
 SET status='released',updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true,'released',true,'shadowOnly',true,
   'lumensRestored',row_data.lumens_reserved);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_mixed_qa_cancel_unbound_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_mixed_qa_cancel_unbound_v1(uuid,uuid) TO service_role;
COMMIT;