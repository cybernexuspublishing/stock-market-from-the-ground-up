-- Cyber Nexus / The Stock Market: From the Ground Up | v0.14.0.32-R2
-- ADDITIVE STAGING CANDIDATE. NO LIVE PAYMENT OR ENTITLEMENT ACTIVATION.
-- MUST execute R1 migration after review before this R2 migration.
BEGIN;
DO $guard$ BEGIN
 IF to_regclass('public.site_settings') IS NULL OR
    to_regclass('public.admin_audit_log') IS NULL OR
    to_regclass('public.checkout_intents') IS NULL OR
    to_regprocedure('public.gu_staff_identity_v01431r1()') IS NULL OR
    to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NULL THEN
   RAISE EXCEPTION 'V01432R2_REQUIRES_INSTALLED_R1_STAFF_AND_AUDIT';
 END IF;
 IF EXISTS (SELECT 1 FROM (VALUES
    ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
    ('admin_audit_log','target_type'),('admin_audit_log','target_id'),
    ('admin_audit_log','details'),('checkout_intents','item_type'),
    ('checkout_intents','provider')) required(t,c)
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns i
       WHERE i.table_schema='public' AND i.table_name=required.t AND i.column_name=required.c))
 THEN RAISE EXCEPTION 'V01432R2_INCOMPATIBLE_AUDIT_SCHEMA'; END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.gu_digital_payment_route_v01432r2 (
 channel text PRIMARY KEY CHECK (channel='digital'),
 provider text NOT NULL CHECK (provider IN ('STRIPE_MANAGED','LEMON_SQUEEZY')),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
ALTER TABLE public.gu_digital_payment_route_v01432r2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_digital_payment_route_v01432r2 FROM PUBLIC,anon,authenticated;
INSERT INTO public.gu_digital_payment_route_v01432r2(channel,provider,enabled)
 VALUES('digital','STRIPE_MANAGED',false) ON CONFLICT(channel) DO NOTHING;

-- Return only nonsecret routing state. A provider is NEVER active by default.
CREATE OR REPLACE FUNCTION public.gu_digital_payment_route_get_v01432r2()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT jsonb_build_object('provider',coalesce(r.provider,'STRIPE_MANAGED'),
    'enabled',coalesce(r.enabled,false),'channel','digital')
 FROM (SELECT 1) seed LEFT JOIN public.gu_digital_payment_route_v01432r2 r ON r.channel='digital';
$fn$;
REVOKE ALL ON FUNCTION public.gu_digital_payment_route_get_v01432r2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gu_digital_payment_route_get_v01432r2() TO anon,authenticated,service_role;

-- OWNER only; recent password confirmation supplied by R1 server-side flow.
-- A successful setting save does not bypass Worker environment-level NO-LIVE gates.
CREATE OR REPLACE FUNCTION public.gu_owner_digital_payment_route_save_v01432r2(
 p_provider text,p_enabled boolean,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; old public.gu_digital_payment_route_v01432r2%rowtype; changed timestamptz;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 IF role<>'OWNER' THEN RAISE EXCEPTION 'OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF public.gu_staff_stepup_active_v01432r1() IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'PASSWORD_RECONFIRM_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_provider NOT IN ('STRIPE_MANAGED','LEMON_SQUEEZY') OR p_enabled IS NULL
    OR p_expected_updated_at IS NULL THEN
   RAISE EXCEPTION 'INVALID_PAYMENT_ROUTE' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT old FROM public.gu_digital_payment_route_v01432r2
 WHERE channel='digital' FOR UPDATE;
 IF old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RAISE EXCEPTION 'PAYMENT_ROUTE_STALE_REFRESH' USING ERRCODE='40001'; END IF;
 UPDATE public.gu_digital_payment_route_v01432r2
 SET provider=p_provider,enabled=p_enabled,updated_at=clock_timestamp(),updated_by=auth.uid()
 WHERE channel='digital' RETURNING updated_at INTO changed;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(auth.uid(),'commerce.digital.provider.route.v01432r2','site_setting','digital',
   jsonb_build_object('previousProvider',old.provider,'previousEnabled',old.enabled,
      'provider',p_provider,'enabled',p_enabled,'liveCheckoutActivated',false));
 RETURN jsonb_build_object('ok',true,'provider',p_provider,'enabled',p_enabled,'updatedAt',changed);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_digital_payment_route_save_v01432r2(text,boolean,timestamptz)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_payment_route_save_v01432r2(text,boolean,timestamptz)
 TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_owner_digital_payment_route_read_v01432r2()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; r public.gu_digital_payment_route_v01432r2%rowtype;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 IF role NOT IN ('OWNER','ADMIN') THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT r FROM public.gu_digital_payment_route_v01432r2 WHERE channel='digital';
 RETURN jsonb_build_object('ok',true,'role',role,'provider',r.provider,
 'enabled',r.enabled,'updatedAt',r.updated_at);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_digital_payment_route_read_v01432r2() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_payment_route_read_v01432r2() TO authenticated;

-- Fail closed even if a historical Lemon checkout URL/API is called directly.
-- Guard only NEW digital checkout intents; refunds and earlier paid orders remain
-- untouched. This is not a substitute for validating each provider webhook.
CREATE OR REPLACE FUNCTION public.gu_digital_payment_intent_guard_v01432r2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE selected text; is_enabled boolean;
BEGIN
 IF NEW.item_type IN ('plan','tool','book','bundle') AND
    coalesce(NEW.provider,'LEMON_SQUEEZY')='LEMON_SQUEEZY' THEN
   SELECT r.provider,r.enabled INTO selected,is_enabled
   FROM public.gu_digital_payment_route_v01432r2 r WHERE r.channel='digital';
   IF selected IS DISTINCT FROM 'LEMON_SQUEEZY' OR is_enabled IS DISTINCT FROM true THEN
     RAISE EXCEPTION 'LEMON_DIGITAL_ROUTE_DISABLED' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_digital_payment_intent_guard_v01432r2() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_digital_payment_intent_guard_v01432r2 ON public.checkout_intents;
CREATE TRIGGER gu_digital_payment_intent_guard_v01432r2
 BEFORE INSERT ON public.checkout_intents
 FOR EACH ROW EXECUTE FUNCTION public.gu_digital_payment_intent_guard_v01432r2();

-- Test-checkout reconciliation only; NEVER treated as a paid member entitlement.
CREATE TABLE IF NOT EXISTS public.gu_stripe_managed_test_sessions_v01432r2 (
 id uuid PRIMARY KEY,
 staff_user_id uuid NOT NULL,
 sku_code text NOT NULL CHECK(sku_code ~ '^[A-Z0-9_]{3,90}$'),
 sku_type text NOT NULL CHECK(sku_type IN ('plan','tool','book')),
 stripe_session_id text UNIQUE CHECK(stripe_session_id IS NULL OR stripe_session_id ~ '^cs_test_[A-Za-z0-9_]+$'),
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','checkout_created','test_paid','test_failed','test_refunded')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_stripe_managed_test_sessions_v01432r2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_stripe_managed_test_sessions_v01432r2 FROM PUBLIC,anon,authenticated;

-- Receipt ledger for *test-only* Stripe Managed events. Does not create purchase
-- entitlements, membership subscriptions, books, or payment/order records.
CREATE TABLE IF NOT EXISTS public.gu_stripe_managed_test_events_v01432r2 (
 event_id text PRIMARY KEY CHECK (event_id ~ '^evt_[A-Za-z0-9_]{4,150}$'),
 event_type text NOT NULL CHECK (length(event_type) BETWEEN 3 AND 100),
 provider text NOT NULL DEFAULT 'STRIPE_MANAGED' CHECK(provider='STRIPE_MANAGED'),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 livemode boolean NOT NULL DEFAULT false CHECK (livemode=false)
);
ALTER TABLE public.gu_stripe_managed_test_events_v01432r2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_stripe_managed_test_events_v01432r2 FROM PUBLIC,anon,authenticated;
-- No browser-surface RPC exposes event IDs or customer data.
NOTIFY pgrst,'reload schema';
COMMIT;
