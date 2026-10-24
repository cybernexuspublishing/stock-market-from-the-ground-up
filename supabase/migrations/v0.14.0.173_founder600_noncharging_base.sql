-- v0.14.0.173 Founding 600 production database FOUNDATION (noncharging by design).
-- Safe additive install; no existing public prices, memberships or wallet grants changed.
CREATE TABLE IF NOT EXISTS public.gu_founder_release_v014173 (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 enrollment_enabled boolean NOT NULL DEFAULT false,
 billing_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_founder_release_v014173(singleton,enrollment_enabled,billing_enabled)
VALUES(true,false,false) ON CONFLICT(singleton) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_founder_plans_v014173 (
 plan_code text PRIMARY KEY CHECK(plan_code IN ('FOUNDING_30','FOUNDING_60')),
 price_cents integer NOT NULL,
 term_days integer NOT NULL,
 purchase_discount_bps integer NOT NULL,
 included_sparks integer NOT NULL,
 sparks_expiry_after_term_days integer NOT NULL,
 checkout_enabled boolean NOT NULL DEFAULT false,
 CHECK(
  (plan_code='FOUNDING_30' AND price_cents=4999 AND term_days=30 AND purchase_discount_bps=1000 AND included_sparks=5 AND sparks_expiry_after_term_days=90)
  OR
  (plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=2000 AND included_sparks=15 AND sparks_expiry_after_term_days=150)
 )
);
INSERT INTO public.gu_founder_plans_v014173(plan_code,price_cents,term_days,purchase_discount_bps,included_sparks,sparks_expiry_after_term_days,checkout_enabled)
VALUES ('FOUNDING_30',4999,30,1000,5,90,false),('FOUNDING_60',5999,60,2000,15,150,false)
ON CONFLICT(plan_code) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_founder_members_v014173 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 founder_number smallint NOT NULL UNIQUE CHECK(founder_number BETWEEN 1 AND 600),
 first_plan_code text NOT NULL REFERENCES public.gu_founder_plans_v014173(plan_code),
 earned_plan_code text NOT NULL REFERENCES public.gu_founder_plans_v014173(plan_code),
 first_invoice_id text UNIQUE,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.gu_founder_reservations_v014173 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 founder_number smallint NOT NULL CHECK(founder_number BETWEEN 1 AND 600),
 plan_code text NOT NULL REFERENCES public.gu_founder_plans_v014173(plan_code),
 intent_key text NOT NULL UNIQUE CHECK(length(intent_key) BETWEEN 16 AND 160),
 checkout_session_id text UNIQUE,
 checkout_subscription_id text UNIQUE,
 reservation_state text NOT NULL DEFAULT 'reserved' CHECK(reservation_state IN ('reserved','bound','consumed','released')),
 reserved_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL CHECK(expires_at>reserved_at),
 terminal_event_id text UNIQUE,
 finalized_at timestamptz,
 CHECK((reservation_state IN ('consumed','released'))=(finalized_at IS NOT NULL)),
 CHECK(reservation_state<>'consumed' OR checkout_subscription_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS gu_founder_one_pending_user_v014173
 ON public.gu_founder_reservations_v014173(user_id)
 WHERE reservation_state IN ('reserved','bound');
CREATE UNIQUE INDEX IF NOT EXISTS gu_founder_one_live_seat_v014173
 ON public.gu_founder_reservations_v014173(founder_number)
 WHERE reservation_state IN ('reserved','bound','consumed');
CREATE TABLE IF NOT EXISTS public.gu_founder_paid_cycles_v014173 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.gu_founder_members_v014173(user_id) ON DELETE RESTRICT,
 stripe_invoice_id text NOT NULL UNIQUE,
 stripe_event_id text NOT NULL UNIQUE,
 stripe_subscription_id text NOT NULL,
 plan_code text NOT NULL REFERENCES public.gu_founder_plans_v014173(plan_code),
 billing_start timestamptz NOT NULL,
 billing_end timestamptz NOT NULL CHECK(billing_end>billing_start),
 price_cents integer NOT NULL CHECK(price_cents IN (4999,5999)),
 granted_sparks integer NOT NULL CHECK(granted_sparks IN (5,15)),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,stripe_subscription_id,billing_start)
);
CREATE TABLE IF NOT EXISTS public.gu_founder_discount_audit_v014173 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.gu_founder_members_v014173(user_id) ON DELETE RESTRICT,
 purchase_intent text NOT NULL UNIQUE,
 sku text NOT NULL CHECK(sku NOT IN ('FOUNDING_30','FOUNDING_60')),
 list_cents integer NOT NULL CHECK(list_cents>=0),
 discount_bps integer NOT NULL CHECK(discount_bps IN (1000,2000)),
 charged_cents integer NOT NULL CHECK(charged_cents>=0 AND charged_cents<=list_cents),
 verified_stripe_invoice text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
DO $guard$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY[
 'gu_founder_release_v014173','gu_founder_plans_v014173',
 'gu_founder_members_v014173','gu_founder_reservations_v014173',
 'gu_founder_paid_cycles_v014173','gu_founder_discount_audit_v014173']
 LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE ON TABLE public.%I TO service_role',t);
 END LOOP;
END $guard$;
-- The only exposed server mutation starts BEFORE Stripe Checkout. It cannot
-- be used while both explicit release controls and tier checkout are disabled.
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
-- Purchased Sparks never expire. Allow legacy included grants (60d) and
-- confirmed Founding 600 30d / 60d grants (90d / 150d after paid cycle).
ALTER TABLE public.groundup_question_pass_buckets DROP CONSTRAINT IF EXISTS groundup_qp_expiration_policy;
ALTER TABLE public.groundup_question_pass_buckets ADD CONSTRAINT groundup_qp_expiration_policy CHECK (
 (source IN ('purchased','manual') AND billing_period_ends_at IS NULL AND expires_at IS NULL)
 OR (source='included' AND billing_period_ends_at IS NOT NULL AND expires_at IS NOT NULL AND
 expires_at IN (billing_period_ends_at+interval '60 days',billing_period_ends_at+interval '90 days',billing_period_ends_at+interval '150 days'))
);
