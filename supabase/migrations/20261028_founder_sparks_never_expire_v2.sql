-- Preserve verified Founder billing conditions while issuing non-expiring included Sparks.
CREATE OR REPLACE FUNCTION public.gu_founder_record_paid_cycle_v014196(
 p_reservation uuid,p_user uuid,p_session text,p_subscription text,
 p_invoice text,p_event text,p_customer text,p_price text,
 p_plan_line_amount integer,p_period_start timestamptz,p_period_end timestamptz,
 p_livemode boolean
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $cycle$
DECLARE r public.gu_founder_reservations_v014173%rowtype;
 p public.gu_founder_plans_v014173%rowtype;
 existing_id bigint;founder_id integer;was_new boolean:=false;
BEGIN
 IF p_reservation IS NULL OR p_user IS NULL OR p_livemode IS DISTINCT FROM true
 OR p_session !~ '^cs_live_[A-Za-z0-9_]{6,}$'
 OR p_subscription !~ '^sub_[A-Za-z0-9_]{6,}$'
 OR p_invoice !~ '^in_[A-Za-z0-9_]{6,}$'
 OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$'
 OR p_customer !~ '^cus_[A-Za-z0-9_]{6,}$'
 OR p_price !~ '^price_[A-Za-z0-9_]{6,}$'
 OR p_period_start IS NULL OR p_period_end IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROVIDER_EVIDENCE');END IF;
 PERFORM pg_advisory_xact_lock(20261024,600);
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_release_v014173
 WHERE singleton AND fulfillment_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','FULFILLMENT_DISABLED');END IF;
 SELECT * INTO r FROM public.gu_founder_reservations_v014173
 WHERE id=p_reservation FOR UPDATE;
 IF NOT FOUND OR r.user_id<>p_user OR r.reservation_state NOT IN ('bound','consumed')
 OR r.checkout_session_id<>p_session OR r.checkout_price_id<>p_price
 OR (r.checkout_subscription_id IS NOT NULL AND r.checkout_subscription_id<>p_subscription)
 THEN RETURN jsonb_build_object('ok',false,'error','UNVERIFIED_RESERVATION');END IF;
 SELECT * INTO p FROM public.gu_founder_plans_v014173 WHERE plan_code=r.plan_code;
 IF NOT FOUND OR p_plan_line_amount<>p.price_cents
 OR p_period_end-p_period_start<>make_interval(days=>p.term_days)
 THEN RETURN jsonb_build_object('ok',false,'error','PRICE_OR_TERM_MISMATCH');END IF;
 IF EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173 WHERE stripe_invoice_id=p_invoice)
 THEN
  IF EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173
    WHERE stripe_invoice_id=p_invoice AND user_id=p_user AND stripe_subscription_id=p_subscription AND plan_code=p.plan_code)
  THEN RETURN jsonb_build_object('ok',true,'replayed',true);END IF;
  RETURN jsonb_build_object('ok',false,'error','INVOICE_BINDING_CONFLICT');
 END IF;
 IF r.reservation_state='bound' THEN
  IF EXISTS(SELECT 1 FROM public.gu_founder_members_v014173 WHERE user_id=p_user)
  THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_ALREADY_EXISTS');END IF;
  -- Owner may stop new purchases at any time; already-bound sessions can
  -- fulfill their signed first invoice while existing renewals still operate.
  INSERT INTO public.gu_founder_members_v014173(
   user_id,founder_number,first_plan_code,earned_plan_code,first_invoice_id,vested_discount_bps)
  VALUES(p_user,r.founder_number,p.plan_code,p.plan_code,p_invoice,
    CASE WHEN p.plan_code='FOUNDING_30' THEN 1000 ELSE 0 END);
  UPDATE public.gu_founder_reservations_v014173
   SET reservation_state='consumed',checkout_subscription_id=p_subscription,
   terminal_event_id=p_event,finalized_at=now() WHERE id=p_reservation;
  was_new:=true;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.gu_founder_members_v014173
      WHERE user_id=p_user AND founder_number=r.founder_number AND revoked_at IS NULL)
  THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_IDENTITY_MISMATCH');END IF;
 END IF;
 INSERT INTO public.gu_founder_paid_cycles_v014173(user_id,stripe_invoice_id,stripe_event_id,
 stripe_subscription_id,plan_code,billing_start,billing_end,price_cents,granted_sparks)
 VALUES(p_user,p_invoice,p_event,p_subscription,p.plan_code,p_period_start,p_period_end,
 p.price_cents,p.included_sparks);
 INSERT INTO public.groundup_question_pass_buckets(
  user_id,source,origin_key,initial_credits,remaining_credits,
  billing_period_ends_at,expires_at)
 VALUES(p_user,'included','FOUNDING600:'||p_invoice,p.included_sparks,p.included_sparks,
 p_period_end,NULL);
 SELECT id INTO existing_id FROM public.site_subscriptions WHERE
 user_id=p_user AND provider='stripe' AND provider_subscription_id=p_subscription
 ORDER BY id DESC LIMIT 1 FOR UPDATE;
 IF existing_id IS NULL THEN
  INSERT INTO public.site_subscriptions(user_id,provider,provider_customer_id,
   provider_subscription_id,plan_code,status,current_period_start,current_period_end,metadata)
  VALUES(p_user,'stripe',p_customer,p_subscription,p.plan_code,'active',
   p_period_start,p_period_end,jsonb_build_object('founderSeat',r.founder_number,'founder',true));
 ELSE
  UPDATE public.site_subscriptions SET plan_code=p.plan_code,status='active',
  current_period_start=p_period_start,current_period_end=p_period_end,
  provider_customer_id=p_customer,updated_at=now() WHERE id=existing_id;
 END IF;
 RETURN jsonb_build_object('ok',true,'replayed',false,'firstPayment',was_new,
 'founderNumber',r.founder_number,'includedSparks',p.included_sparks,
 'sparkExpiry',NULL);
END $cycle$;
REVOKE ALL ON FUNCTION public.gu_founder_record_paid_cycle_v014196(uuid,uuid,text,text,text,text,text,text,integer,timestamptz,timestamptz,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_record_paid_cycle_v014196(uuid,uuid,text,text,text,text,text,text,integer,timestamptz,timestamptz,boolean)
 TO service_role;
