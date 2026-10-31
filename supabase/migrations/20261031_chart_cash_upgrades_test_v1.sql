-- Chart Studio one-time, nonrenewing cash upgrades. TEST payments only.
-- Server routes verify Stripe and identity before calling the service-role RPC.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crownlight_chart_cash_upgrades_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 sku text NOT NULL CHECK (sku IN ('CHART_ADVANCED_30D','CHART_PROFESSIONAL_30D')),
 tier text NOT NULL CHECK (tier IN ('ADVANCED','PROFESSIONAL')),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 stripe_price_id text NOT NULL,
 amount_cents integer NOT NULL CHECK (amount_cents IN (999,1999)),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','active','refunded','disputed','expired')),
 starts_at timestamptz,
 expires_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT chart_cash_exact_product CHECK (
  (sku='CHART_ADVANCED_30D' AND tier='ADVANCED' AND amount_cents=999) OR
  (sku='CHART_PROFESSIONAL_30D' AND tier='PROFESSIONAL' AND amount_cents=1999)),
 CONSTRAINT chart_cash_active_window CHECK (state<>'active' OR
  (starts_at IS NOT NULL AND expires_at=starts_at+interval '30 days' AND revoked_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS chart_cash_one_pending_per_member_sku_v1
 ON public.crownlight_chart_cash_upgrades_v1(user_id,sku) WHERE state='pending';
CREATE INDEX IF NOT EXISTS chart_cash_member_active_v1
 ON public.crownlight_chart_cash_upgrades_v1(user_id,expires_at) WHERE state='active';
ALTER TABLE public.crownlight_chart_cash_upgrades_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_cash_upgrades_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.crownlight_chart_cash_upgrades_v1 TO service_role;

CREATE TABLE IF NOT EXISTS public.crownlight_chart_cash_events_v1 (
 stripe_event_id text PRIMARY KEY,
 upgrade_id uuid NOT NULL REFERENCES public.crownlight_chart_cash_upgrades_v1(id),
 event_type text NOT NULL CHECK (event_type IN ('paid','refunded','disputed','expired')),
 stripe_payment_intent_id text,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crownlight_chart_cash_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_cash_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.crownlight_chart_cash_events_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.crownlight_chart_cash_apply_test_v1(
 p_upgrade uuid,p_event text,p_kind text,p_session text DEFAULT NULL,
 p_payment_intent text DEFAULT NULL,p_price text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','pg_temp' AS $fn$
DECLARE purchase public.crownlight_chart_cash_upgrades_v1%ROWTYPE;
        paid_at timestamptz;
BEGIN
 IF p_upgrade IS NULL OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$' OR
    p_kind NOT IN ('paid','refunded','disputed','expired') THEN
  RETURN jsonb_build_object('ok',false,'error','INVALID_EVENT'); END IF;
 SELECT * INTO purchase FROM public.crownlight_chart_cash_upgrades_v1
  WHERE id=p_upgrade FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','UNKNOWN_PURCHASE'); END IF;
 IF EXISTS(SELECT 1 FROM public.crownlight_chart_cash_events_v1 WHERE stripe_event_id=p_event) THEN
  RETURN jsonb_build_object('ok',true,'duplicate',true,'state',purchase.state); END IF;
 IF p_kind='paid' THEN
  IF purchase.state IN ('refunded','disputed') AND
     purchase.stripe_session_id=p_session AND
     purchase.stripe_payment_intent_id=p_payment_intent AND
     purchase.stripe_price_id=p_price THEN
   INSERT INTO public.crownlight_chart_cash_events_v1
    (stripe_event_id,upgrade_id,event_type,stripe_payment_intent_id)
    VALUES(p_event,p_upgrade,p_kind,p_payment_intent);
   RETURN jsonb_build_object('ok',true,'state',purchase.state,'revocationPreserved',true);
  END IF;
  IF purchase.state='active' AND purchase.stripe_session_id=p_session AND
     purchase.stripe_payment_intent_id=p_payment_intent AND
     purchase.stripe_price_id=p_price THEN
   INSERT INTO public.crownlight_chart_cash_events_v1
    (stripe_event_id,upgrade_id,event_type,stripe_payment_intent_id)
    VALUES(p_event,p_upgrade,p_kind,p_payment_intent);
   RETURN jsonb_build_object('ok',true,'state','active','alreadyFulfilled',true);
  END IF;
  IF purchase.state<>'pending' OR p_session !~ '^cs_test_[A-Za-z0-9_]{6,}$' OR
     p_payment_intent !~ '^pi_[A-Za-z0-9_]{6,}$' OR
     p_price IS DISTINCT FROM purchase.stripe_price_id OR
     purchase.stripe_session_id IS DISTINCT FROM p_session THEN
   RETURN jsonb_build_object('ok',false,'error','PAYMENT_MISMATCH'); END IF;
  paid_at:=now();
  UPDATE public.crownlight_chart_cash_upgrades_v1 SET state='active',
   stripe_payment_intent_id=p_payment_intent,starts_at=paid_at,
   expires_at=paid_at+interval '30 days',updated_at=paid_at WHERE id=p_upgrade;
 ELSIF p_kind IN ('refunded','disputed') THEN
  IF purchase.state='refunded' AND p_payment_intent=purchase.stripe_payment_intent_id THEN
   INSERT INTO public.crownlight_chart_cash_events_v1
    (stripe_event_id,upgrade_id,event_type,stripe_payment_intent_id)
    VALUES(p_event,p_upgrade,p_kind,p_payment_intent);
   RETURN jsonb_build_object('ok',true,'state','refunded','revocationPreserved',true);
  END IF;
  IF purchase.state NOT IN ('active','expired','disputed') OR
     p_payment_intent IS DISTINCT FROM purchase.stripe_payment_intent_id THEN
   RETURN jsonb_build_object('ok',false,'error','REVOCATION_MISMATCH'); END IF;
  UPDATE public.crownlight_chart_cash_upgrades_v1 SET state=p_kind,
   revoked_at=now(),updated_at=now() WHERE id=p_upgrade;
 ELSE
  IF purchase.state<>'pending' OR p_session IS DISTINCT FROM purchase.stripe_session_id THEN
   RETURN jsonb_build_object('ok',false,'error','EXPIRY_MISMATCH'); END IF;
  UPDATE public.crownlight_chart_cash_upgrades_v1 SET state='expired',updated_at=now()
   WHERE id=p_upgrade;
 END IF;
 INSERT INTO public.crownlight_chart_cash_events_v1
  (stripe_event_id,upgrade_id,event_type,stripe_payment_intent_id)
  VALUES(p_event,p_upgrade,p_kind,p_payment_intent);
 RETURN jsonb_build_object('ok',true,'state',p_kind);
END $fn$;
REVOKE ALL ON FUNCTION public.crownlight_chart_cash_apply_test_v1(uuid,text,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crownlight_chart_cash_apply_test_v1(uuid,text,text,text,text,text)
 TO service_role;
COMMIT;
