-- v0.14.0.193 atomic Founding 600 reservations, safe stale-intent cleanup,
-- and LIVE-provider-specific checkout binding. Requires verified server-held Stripe response.
CREATE OR REPLACE FUNCTION public.gu_founder_reserve_v014173(
 p_user_id uuid,p_plan_code text,p_intent_key text,p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE v_seat smallint;v_res public.gu_founder_reservations_v014173%rowtype;
BEGIN
 IF p_user_id IS NULL OR p_plan_code NOT IN ('FOUNDING_30','FOUNDING_60')
 OR p_intent_key IS NULL OR length(p_intent_key) NOT BETWEEN 16 AND 160
 OR p_expires_at IS NULL OR p_expires_at<=now() OR p_expires_at>now()+interval '48 hours'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 PERFORM pg_advisory_xact_lock(20261024,600);
 -- Remove only expired UNBOUND reservations; a checkout-bound seat may
 -- still produce a valid payment event and must NEVER be reallocated here.
 UPDATE public.gu_founder_reservations_v014173 r
 SET reservation_state='released',finalized_at=now()
 WHERE r.reservation_state='reserved' AND r.expires_at<=now()
 AND r.checkout_session_id IS NULL AND r.checkout_subscription_id IS NULL;

 IF NOT EXISTS (SELECT 1 FROM public.gu_founder_release_v014173 WHERE singleton=true AND enrollment_enabled AND billing_enabled)
 OR NOT EXISTS (SELECT 1 FROM public.gu_founder_plans_v014173 WHERE plan_code=p_plan_code AND checkout_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','ENROLLMENT_DISABLED');END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id AND account_kind='member' AND deleted_at IS NULL)
 OR EXISTS (SELECT 1 FROM public.admin_user_flags WHERE user_id=p_user_id AND status IN ('suspended','restricted'))
 OR EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=p_user_id AND role_code='SHOWCASE_VIEWER' AND (expires_at IS NULL OR expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','INELIGIBLE');END IF;
 IF EXISTS(SELECT 1 FROM public.gu_founder_members_v014173 WHERE user_id=p_user_id)
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_FOUNDER');END IF;
 SELECT * INTO v_res FROM public.gu_founder_reservations_v014173 WHERE intent_key=p_intent_key;
 IF FOUND THEN
  IF v_res.user_id<>p_user_id OR v_res.plan_code<>p_plan_code OR v_res.reservation_state NOT IN ('reserved','bound')
  THEN RETURN jsonb_build_object('ok',false,'error','INTENT_CONFLICT');END IF;
  RETURN jsonb_build_object('ok',true,'replayed',true,'seat',v_res.founder_number,'reservationId',v_res.id);
 END IF;
 IF EXISTS(SELECT 1 FROM public.gu_founder_reservations_v014173 WHERE user_id=p_user_id AND reservation_state IN ('reserved','bound'))
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_RESERVED');END IF;
 SELECT seat.n::smallint INTO v_seat
 FROM generate_series(1,600) AS seat(n)
 WHERE NOT EXISTS(SELECT 1 FROM public.gu_founder_members_v014173 m WHERE m.founder_number=seat.n)
 AND NOT EXISTS(SELECT 1 FROM public.gu_founder_reservations_v014173 r WHERE r.founder_number=seat.n AND r.reservation_state IN ('reserved','bound','consumed'))
 ORDER BY seat.n LIMIT 1;
 IF v_seat IS NULL THEN RETURN jsonb_build_object('ok',false,'error','CAPACITY_EXHAUSTED');END IF;
 INSERT INTO public.gu_founder_reservations_v014173(user_id,plan_code,founder_number,intent_key,expires_at)
 VALUES(p_user_id,p_plan_code,v_seat,p_intent_key,p_expires_at) RETURNING * INTO v_res;
 RETURN jsonb_build_object('ok',true,'replayed',false,'seat',v_seat,'reservationId',v_res.id);
END $f$;
REVOKE ALL ON FUNCTION public.gu_founder_reserve_v014173(uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_reserve_v014173(uuid,text,text,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.gu_founder_bind_checkout_v014193(
 p_reservation uuid,p_user uuid,p_session_id text,p_subscription_id text,p_price_id text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $bind$
DECLARE r public.gu_founder_reservations_v014173%rowtype;
BEGIN
 IF p_reservation IS NULL OR p_user IS NULL OR p_session_id !~ '^cs_live_[A-Za-z0-9_]{6,}$'
 OR p_subscription_id !~ '^sub_[A-Za-z0-9_]{6,}$'
 OR p_price_id !~ '^price_[A-Za-z0-9_]{6,}$'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROVIDER_DATA');END IF;
 PERFORM pg_advisory_xact_lock(20261024,600);
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_release_v014173 WHERE singleton AND enrollment_enabled AND billing_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','ENROLLMENT_CLOSED');END IF;
 SELECT * INTO r FROM public.gu_founder_reservations_v014173 WHERE id=p_reservation FOR UPDATE;
 IF NOT FOUND OR r.user_id<>p_user OR r.reservation_state NOT IN ('reserved','bound')
 THEN RETURN jsonb_build_object('ok',false,'error','RESERVATION_NOT_ELIGIBLE');END IF;
 IF r.reservation_state='bound' THEN
  IF r.checkout_session_id=p_session_id AND r.checkout_subscription_id=p_subscription_id
  THEN RETURN jsonb_build_object('ok',true,'replayed',true,'seat',r.founder_number);END IF;
  RETURN jsonb_build_object('ok',false,'error','CHECKOUT_BINDING_CONFLICT');
 END IF;
 IF r.expires_at<=now() THEN RETURN jsonb_build_object('ok',false,'error','RESERVATION_EXPIRED');END IF;
 UPDATE public.gu_founder_reservations_v014173 SET
 checkout_session_id=p_session_id,checkout_subscription_id=p_subscription_id,
 reservation_state='bound' WHERE id=p_reservation;
 RETURN jsonb_build_object('ok',true,'replayed',false,'seat',r.founder_number,'expectedPriceId',p_price_id);
END $bind$;
REVOKE ALL ON FUNCTION public.gu_founder_bind_checkout_v014193(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_bind_checkout_v014193(uuid,uuid,text,text,text) TO service_role;
