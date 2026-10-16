-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.39
-- PRODUCTION-DATABASE-COMPATIBLE *SHADOW* SANDBOX, DISABLED BY DEFAULT.
-- REVIEW BEFORE APPLYING ON YOUR EXISTING PROJECT; backup first.
-- Does not alter gu38 tables, production orders, plans, grants, tools or subscriptions.
BEGIN;
DO $pre$ BEGIN
 IF to_regprocedure('public.gu_staff_identity_v01431r1()') IS NULL
 OR to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NULL
 OR to_regclass('public.admin_audit_log') IS NULL THEN
  RAISE EXCEPTION 'GU39_REQUIRED_OWNER_GUARDS_MISSING';
 END IF;
END $pre$;

CREATE TABLE IF NOT EXISTS public.gu39_sandbox_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id=true),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_by uuid
);
INSERT INTO public.gu39_sandbox_settings(id,enabled) VALUES(true,false)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gu39_sandbox_intents (
 id uuid PRIMARY KEY,
 tester_user_id uuid NOT NULL REFERENCES auth.users(id),
 sku text NOT NULL CHECK(sku ~ '^(plan|tool):[A-Z0-9_]{3,90}$'),
 stripe_product_id text NOT NULL CHECK(stripe_product_id ~ '^prod_[A-Za-z0-9_]{6,}$'),
 stripe_price_id text NOT NULL CHECK(stripe_price_id ~ '^price_[A-Za-z0-9_]{6,}$'),
 quoted_cents integer NOT NULL CHECK(quoted_cents>0),
 currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
 session_id text UNIQUE CHECK(session_id IS NULL OR session_id ~ '^cs_test_[A-Za-z0-9_]+$'),
 subscription_id text UNIQUE CHECK(subscription_id IS NULL OR subscription_id ~ '^sub_[A-Za-z0-9_]+$'),
 payment_intent_id text UNIQUE CHECK(payment_intent_id IS NULL OR payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'),
 customer_id text CHECK(customer_id IS NULL OR customer_id ~ '^cus_[A-Za-z0-9_]+$'),
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN('prepared','checkout_created','test_active','test_failed','test_cancel_scheduled','test_canceled','test_refunded','test_disputed')),
 latest_invoice_id text,
 blocked_invoice_id text,
 current_period_end timestamptz,
 last_event_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS gu39_sandbox_intents_owner_idx ON public.gu39_sandbox_intents(tester_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.gu39_sandbox_events (
 event_id text PRIMARY KEY CHECK(event_id ~ '^evt_[A-Za-z0-9_]{6,150}$'),
 intent_id uuid NOT NULL REFERENCES public.gu39_sandbox_intents(id),
 action text NOT NULL,
 outcome text NOT NULL,
 occurred_at timestamptz NOT NULL,
 handled_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS gu39_sandbox_events_intent_idx ON public.gu39_sandbox_events(intent_id,handled_at DESC);

-- Separate SHADOW access; NEVER consulted by the existing customer entitlement evaluator.
CREATE TABLE IF NOT EXISTS public.gu39_sandbox_access (
 intent_id uuid PRIMARY KEY REFERENCES public.gu39_sandbox_intents(id),
 tester_user_id uuid NOT NULL REFERENCES auth.users(id),
 sku text NOT NULL,
 shadow_access boolean NOT NULL DEFAULT false,
 access_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

DO $rights$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['gu39_sandbox_settings','gu39_sandbox_intents','gu39_sandbox_events','gu39_sandbox_access']) LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',t);
 END LOOP;
END $rights$;

CREATE OR REPLACE FUNCTION public.gu39_sandbox_owner_read()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE role text; r public.gu39_sandbox_settings%ROWTYPE;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 IF role NOT IN ('OWNER','ADMIN') THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT r FROM public.gu39_sandbox_settings WHERE id=true;
 RETURN jsonb_build_object('ok',true,'role',role,'enabled',r.enabled,'updatedAt',r.updated_at,
  'intentCount',(SELECT count(*) FROM public.gu39_sandbox_intents),
  'processedEventCount',(SELECT count(*) FROM public.gu39_sandbox_events),
  'shadowAccessCount',(SELECT count(*) FROM public.gu39_sandbox_access WHERE shadow_access AND (access_until IS NULL OR access_until>now())),
  'productionAccessChanged',false);
END $f$;
REVOKE ALL ON FUNCTION public.gu39_sandbox_owner_read() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu39_sandbox_owner_read() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu39_sandbox_owner_toggle(p_enabled boolean,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE current_row public.gu39_sandbox_settings%ROWTYPE; changed timestamptz;
BEGIN
 IF public.gu_staff_identity_v01431r1() IS DISTINCT FROM 'OWNER' THEN RAISE EXCEPTION 'OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF public.gu_staff_stepup_active_v01432r1() IS DISTINCT FROM true THEN RAISE EXCEPTION 'PASSWORD_RECONFIRM_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_enabled IS NULL OR p_expected_updated_at IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT current_row FROM public.gu39_sandbox_settings WHERE id=true FOR UPDATE;
 IF current_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'SETTINGS_STALE_REFRESH' USING ERRCODE='40001'; END IF;
 UPDATE public.gu39_sandbox_settings SET enabled=p_enabled,updated_at=clock_timestamp(),updated_by=auth.uid()
 WHERE id=true RETURNING updated_at INTO changed;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(auth.uid(),'commerce.stripe.shadow.toggle.v01439','site_setting','stripe_sandbox',jsonb_build_object('from',current_row.enabled,'to',p_enabled,'liveCheckout',false));
 RETURN jsonb_build_object('ok',true,'enabled',p_enabled,'updatedAt',changed,'liveCheckout',false);
END $f$;
REVOKE ALL ON FUNCTION public.gu39_sandbox_owner_toggle(boolean,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu39_sandbox_owner_toggle(boolean,timestamptz) TO authenticated;

-- Service-only, event-ID-deduplicated **SHADOW** payment state transitions.
-- Does not reference or mutate: user_plan_grants, user_tool_passes,
-- site_subscriptions, site_orders, site_order_items, or auth user metadata.
CREATE OR REPLACE FUNCTION public.gu39_shadow_apply(
 p_event_id text,p_intent_id uuid,p_action text,p_price_id text,p_amount_cents integer,
 p_session_id text,p_subscription_id text,p_payment_intent_id text,p_customer_id text,
 p_invoice_id text,p_access_until timestamptz,p_event_created timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE r public.gu39_sandbox_intents%ROWTYPE; next_status text; allowed boolean;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVER_ONLY' USING ERRCODE='42501'; END IF;
 IF p_event_id !~ '^evt_[A-Za-z0-9_]{6,150}$' OR p_event_created IS NULL OR p_event_created>now()+interval '5 minutes'
 OR p_action NOT IN ('paid','renewed','failed','cancel_scheduled','canceled','refunded','disputed') THEN
  RAISE EXCEPTION 'INVALID_SHADOW_EVENT' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gu39:event:'||p_event_id,0));
 IF EXISTS(SELECT 1 FROM public.gu39_sandbox_events WHERE event_id=p_event_id) THEN
   RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 SELECT * INTO r FROM public.gu39_sandbox_intents WHERE id=p_intent_id FOR UPDATE;
 IF NOT FOUND OR r.session_id IS NULL OR r.status='prepared' THEN RAISE EXCEPTION 'INTENT_NOT_BOUND' USING ERRCODE='22023'; END IF;
 IF r.stripe_price_id IS DISTINCT FROM p_price_id OR r.session_id IS DISTINCT FROM p_session_id
    OR (r.subscription_id IS NOT NULL AND r.subscription_id IS DISTINCT FROM p_subscription_id)
    OR (r.payment_intent_id IS NOT NULL AND p_payment_intent_id IS NOT NULL AND r.payment_intent_id IS DISTINCT FROM p_payment_intent_id)
    OR (r.customer_id IS NOT NULL AND r.customer_id IS DISTINCT FROM p_customer_id) THEN
   RAISE EXCEPTION 'SHADOW_STRIPE_ID_MISMATCH' USING ERRCODE='22023'; END IF;
 IF p_action IN('paid','renewed') AND (p_amount_cents IS NULL OR p_amount_cents<r.quoted_cents) THEN
  RAISE EXCEPTION 'SHADOW_AMOUNT_MISMATCH' USING ERRCODE='22023'; END IF;
 IF p_action='renewed' AND p_subscription_id IS NULL THEN RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED' USING ERRCODE='22023'; END IF;
 IF p_action='renewed' AND (p_access_until IS NULL OR p_access_until<=now()) THEN RAISE EXCEPTION 'NO_PAID_PERIOD' USING ERRCODE='22023'; END IF;
 IF r.last_event_at IS NOT NULL AND p_event_created<r.last_event_at THEN
   INSERT INTO public.gu39_sandbox_events(event_id,intent_id,action,outcome,occurred_at)
   VALUES(p_event_id,r.id,p_action,'stale_ignored',p_event_created);
   RETURN jsonb_build_object('ok',true,'ignored','stale');
 END IF;
 -- A fully refunded/disputed invoice cannot reactivate from a replay of its paid event.
 IF p_action IN('paid','renewed') AND r.blocked_invoice_id IS NOT NULL
   AND r.blocked_invoice_id IS NOT DISTINCT FROM p_invoice_id THEN
   INSERT INTO public.gu39_sandbox_events(event_id,intent_id,action,outcome,occurred_at)
   VALUES(p_event_id,r.id,p_action,'refunded_invoice_ignored',p_event_created);
   RETURN jsonb_build_object('ok',true,'ignored','blocked_invoice');
 END IF;
 next_status:=CASE p_action WHEN 'paid' THEN 'test_active' WHEN 'renewed' THEN 'test_active'
   WHEN 'failed' THEN 'test_failed' WHEN 'cancel_scheduled' THEN 'test_cancel_scheduled'
   WHEN 'canceled' THEN 'test_canceled' WHEN 'refunded' THEN 'test_refunded' ELSE 'test_disputed' END;
 allowed:=p_action IN('paid','renewed','cancel_scheduled');
 IF p_action='cancel_scheduled' AND (r.current_period_end IS NULL OR r.current_period_end<=now()) THEN
   allowed:=false; END IF;
 IF p_action IN('paid','renewed') AND r.status IN('test_refunded','test_disputed') AND p_invoice_id IS NULL THEN
  RAISE EXCEPTION 'REFUND_RECONCILIATION_REQUIRED' USING ERRCODE='22023'; END IF;
 UPDATE public.gu39_sandbox_intents SET status=next_status,
   subscription_id=coalesce(r.subscription_id,p_subscription_id),
   payment_intent_id=coalesce(r.payment_intent_id,p_payment_intent_id),
   customer_id=coalesce(r.customer_id,p_customer_id),
   latest_invoice_id=coalesce(p_invoice_id,r.latest_invoice_id),
   blocked_invoice_id=CASE WHEN p_action IN('refunded','disputed') THEN p_invoice_id WHEN p_action='renewed' THEN NULL ELSE r.blocked_invoice_id END,
   current_period_end=CASE WHEN p_action IN('paid','renewed') THEN p_access_until ELSE r.current_period_end END,
   last_event_at=greatest(coalesce(r.last_event_at,p_event_created),p_event_created),updated_at=clock_timestamp()
 WHERE id=r.id;
 INSERT INTO public.gu39_sandbox_access(intent_id,tester_user_id,sku,shadow_access,access_until)
 VALUES(r.id,r.tester_user_id,r.sku,allowed,
   CASE WHEN p_action IN('paid','renewed') THEN p_access_until ELSE r.current_period_end END)
 ON CONFLICT(intent_id) DO UPDATE SET shadow_access=excluded.shadow_access,
  access_until=excluded.access_until,updated_at=clock_timestamp();
 INSERT INTO public.gu39_sandbox_events(event_id,intent_id,action,outcome,occurred_at)
 VALUES(p_event_id,r.id,p_action,'shadow_applied',p_event_created);
 RETURN jsonb_build_object('ok',true,'mode','SHADOW_ONLY','status',next_status);
END $f$;
REVOKE ALL ON FUNCTION public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamptz,timestamptz) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
