-- v0.14.0.221 — First-party Founder discount eligibility is derived from
-- verified nonreversed paid cycles, never client badges or unaudited Stripe metadata.
-- This does NOT alter existing list prices or enable purchases.
CREATE OR REPLACE FUNCTION public.gu_founder_discount_eligibility_v014221(p_user uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $discount$
DECLARE uid uuid:=auth.uid();target uuid;has_founder boolean;standard_paid boolean;
 extended_completed boolean;extended_active boolean;standard_active boolean;bps int:=0;
BEGIN
 IF current_user='service_role' AND p_user IS NOT NULL THEN target:=p_user;
 ELSE target:=uid;END IF;
 IF target IS NULL OR (current_user<>'service_role' AND p_user IS NOT NULL AND p_user<>uid)
 THEN RETURN jsonb_build_object('ok',false,'error','AUTH_REQUIRED');END IF;
 SELECT EXISTS(SELECT 1 FROM public.gu_founder_members_v014173
   WHERE user_id=target AND revoked_at IS NULL) INTO has_founder;
 IF NOT has_founder THEN RETURN jsonb_build_object('ok',true,'eligible',false,'discountBps',0);END IF;
 SELECT EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173
 WHERE user_id=target AND plan_code='FOUNDING_30' AND reversed_at IS NULL) INTO standard_paid;
 SELECT EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173
 WHERE user_id=target AND plan_code='FOUNDING_60' AND reversed_at IS NULL
 AND billing_end<=now()) INTO extended_completed;
 SELECT EXISTS(SELECT 1 FROM public.site_subscriptions s
 WHERE s.user_id=target AND s.provider='stripe' AND s.status='active'
 AND s.plan_code='FOUNDING_60' AND s.current_period_end>now()
 AND EXISTS (SELECT 1 FROM public.gu_founder_paid_cycles_v014173 c
 WHERE c.user_id=target AND c.stripe_subscription_id=s.provider_subscription_id
 AND c.plan_code='FOUNDING_60' AND c.reversed_at IS NULL
 AND c.billing_start<=now() AND c.billing_end>now())) INTO extended_active;
 SELECT EXISTS(SELECT 1 FROM public.site_subscriptions s
 WHERE s.user_id=target AND s.provider='stripe' AND s.status='active'
 AND s.plan_code='FOUNDING_30' AND s.current_period_end>now()
 AND EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173 c
 WHERE c.user_id=target AND c.stripe_subscription_id=s.provider_subscription_id
 AND c.plan_code='FOUNDING_30' AND c.reversed_at IS NULL
 AND c.billing_start<=now() AND c.billing_end>now())) INTO standard_active;
 bps:=CASE WHEN extended_completed OR extended_active THEN 2000
 WHEN standard_paid OR standard_active THEN 1000 ELSE 0 END;
 RETURN jsonb_build_object('ok',true,'eligible',bps>0,'discountBps',bps,
 'permanent',extended_completed OR (standard_paid AND bps=1000),
 'extendedVested',extended_completed,
 'founderSubscriptionExcluded',true);
END $discount$;
REVOKE ALL ON FUNCTION public.gu_founder_discount_eligibility_v014221(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_discount_eligibility_v014221(uuid) TO authenticated,service_role;
