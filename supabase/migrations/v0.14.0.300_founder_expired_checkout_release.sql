-- SMFGU v0.14.0.300 — Provider-verified expired Founder Checkout release.
-- The Stripe webhook MUST authenticate the exact LIVE event and independently fetch
-- the terminal Stripe Checkout Session before calling this service-only RPC.
-- This function never grants/revokes a membership or initiates a charge/refund.
CREATE OR REPLACE FUNCTION public.gu_founder_release_expired_checkout_v014300(
 p_reservation uuid, p_user uuid, p_session text, p_event text,
 p_plan text, p_price text, p_amount integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $body$
DECLARE r public.gu_founder_reservations_v014173%ROWTYPE;
BEGIN
 IF p_reservation IS NULL OR p_user IS NULL
    OR p_session !~ '^cs_live_[A-Za-z0-9_]{4,150}$'
    OR p_event !~ '^evt_[A-Za-z0-9_]{4,150}$'
    OR p_price !~ '^price_[A-Za-z0-9_]{4,150}$'
    OR p_plan NOT IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60')
    OR p_amount IS NULL OR p_amount <= 0
 THEN RETURN jsonb_build_object('ok',false,'code','INVALID_ARGUMENT'); END IF;
 -- Same founder-capacity advisory lock as reservation allocation.
 PERFORM pg_advisory_xact_lock(20261024,600);
 SELECT * INTO r FROM public.gu_founder_reservations_v014173
  WHERE id=p_reservation FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
 IF r.user_id IS DISTINCT FROM p_user
    OR r.plan_code IS DISTINCT FROM p_plan
    OR r.checkout_session_id IS DISTINCT FROM p_session
    OR r.checkout_price_id IS DISTINCT FROM p_price
    OR r.checkout_subscription_id IS NOT NULL
 THEN RETURN jsonb_build_object('ok',false,'code','BINDING_MISMATCH'); END IF;
 -- Terminal state: replay-safe, including an earlier verified manual release.
 IF r.reservation_state='released' THEN
   RETURN jsonb_build_object('ok',true,'replayed',true,'released',false);
 END IF;
 IF r.reservation_state IS DISTINCT FROM 'bound' OR r.expires_at>now()
    OR EXISTS (SELECT 1 FROM public.gu_founder_members_v014173 m
               WHERE m.user_id=p_user OR m.founder_number=r.founder_number)
    OR EXISTS (SELECT 1 FROM public.gu_founder_paid_cycles_v014173 p
               WHERE p.user_id=p_user AND p.plan_code=p_plan)
 THEN RETURN jsonb_build_object('ok',false,'code','NOT_RELEASABLE'); END IF;
 -- Amount must match the historical 14/30/60-day approved Checkout price.
 IF (p_plan='FOUNDING_14' AND p_amount<>2299)
    OR (p_plan='FOUNDING_30' AND p_amount<>4999)
    OR (p_plan='FOUNDING_60' AND p_amount<>5999)
 THEN RETURN jsonb_build_object('ok',false,'code','AMOUNT_MISMATCH'); END IF;
 UPDATE public.gu_founder_reservations_v014173
    SET reservation_state='released', terminal_event_id=p_event, finalized_at=now()
  WHERE id=p_reservation AND reservation_state='bound'
    AND checkout_session_id=p_session AND checkout_subscription_id IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','CONCURRENT_CHANGE'); END IF;
 RETURN jsonb_build_object('ok',true,'replayed',false,'released',true);
END $body$;
REVOKE ALL ON FUNCTION public.gu_founder_release_expired_checkout_v014300(
 uuid,uuid,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_release_expired_checkout_v014300(
 uuid,uuid,text,text,text,text,integer) TO service_role;
