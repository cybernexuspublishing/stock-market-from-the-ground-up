-- Live founder paid-cycle invariant correction: current approved 10/15/20 Sparks.
-- Zero existing paid cycles were confirmed before this migration.
ALTER TABLE public.gu_founder_paid_cycles_v014173 DROP CONSTRAINT IF EXISTS gu_founder_exact_cycle_price_v014201;
ALTER TABLE public.gu_founder_paid_cycles_v014173 DROP CONSTRAINT IF EXISTS gu_founder_paid_cycles_v014173_granted_sparks_check;
ALTER TABLE public.gu_founder_paid_cycles_v014173 ADD CONSTRAINT gu_founder_exact_cycle_price_v014201 CHECK (
 (plan_code='FOUNDING_14' AND price_cents=2299 AND granted_sparks=10) OR
 (plan_code='FOUNDING_30' AND price_cents=4999 AND granted_sparks=15) OR
 (plan_code='FOUNDING_60' AND price_cents=5999 AND granted_sparks=20)
);
ALTER TABLE public.gu_founder_paid_cycles_v014173 ADD CONSTRAINT gu_founder_paid_cycles_v014173_granted_sparks_check CHECK (granted_sparks IN (10,15,20));
-- Extend existing authenticated provider lifecycle statuses to 14-Day founding subscriptions.
CREATE OR REPLACE FUNCTION public.gu_founder_update_provider_state_v014218(p_subscription text, p_event text, p_status text, p_cancel_at_period_end boolean, p_period_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE existing public.site_subscriptions%rowtype;
BEGIN
 IF p_subscription !~ '^sub_[A-Za-z0-9_]{6,}$'
 OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$'
 OR p_status NOT IN ('active','past_due','canceled') OR p_cancel_at_period_end IS NULL
 OR p_period_end IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROVIDER_STATE');END IF;
 PERFORM pg_advisory_xact_lock(20261024,600);
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_release_v014173 WHERE singleton AND fulfillment_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','FULFILLMENT_DISABLED');END IF;
 SELECT * INTO existing FROM public.site_subscriptions WHERE provider='stripe'
 AND provider_subscription_id=p_subscription AND plan_code IN('FOUNDING_14','FOUNDING_30','FOUNDING_60')
 ORDER BY id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','UNBOUND_SUBSCRIPTION');END IF;
 IF existing.current_period_end IS NOT NULL AND p_period_end<existing.current_period_end
 THEN RETURN jsonb_build_object('ok',false,'error','STALE_PERIOD');END IF;
 IF EXISTS(SELECT 1 FROM public.gu_founder_provider_events_v014200 WHERE event_id=p_event)
 THEN RETURN jsonb_build_object('ok',true,'replayed',true);END IF;
 IF p_status='active' AND NOT EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173
 WHERE user_id=existing.user_id AND stripe_subscription_id=p_subscription
 AND reversed_at IS NULL AND billing_end>now())
 THEN RETURN jsonb_build_object('ok',false,'error','ACTIVE_REQUIRES_VALID_PAID_CYCLE');END IF;
 UPDATE public.site_subscriptions SET status=p_status,cancel_at_period_end=p_cancel_at_period_end,
 current_period_end=greatest(coalesce(existing.current_period_end,p_period_end),p_period_end),
 updated_at=now() WHERE id=existing.id;
 INSERT INTO public.gu_founder_provider_events_v014200(event_id,event_type,subscription_id)
 VALUES(p_event,p_status||CASE WHEN p_cancel_at_period_end THEN ':scheduled_cancel' ELSE '' END,p_subscription);
 RETURN jsonb_build_object('ok',true,'replayed',false,'subscriptionStatus',p_status);
END $function$
;
