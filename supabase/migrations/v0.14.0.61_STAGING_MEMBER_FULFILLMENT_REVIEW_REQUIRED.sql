-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.61
-- Production membership entitlement adapter. REVIEW REQUIRED, NOT AUTO-APPLIED.
-- Apply only after schema preflight, rollback drill, provider acceptance and Owner approval.
-- New staging tables are SEPARATE from the tested GU39 sandbox and v38 staging models.
-- Run once on approved production Supabase; SQL is deliberately not in the build workflow.
-- Service-only signed webhook controls all writes. Direct eBook sales remain unchanged.
BEGIN;
DO $pre$ BEGIN
 IF EXISTS(SELECT 1 FROM (VALUES
  ('public.platform_plans'),('public.platform_tools'),('public.site_subscriptions'),
  ('public.user_plan_grants'),('public.user_tool_passes'),('public.profiles'),('public.admin_user_flags'),
  ('public.admin_user_roles'),('public.gu_digital_payment_route_v01432r2'),('public.site_orders')
 ) as x(name) WHERE to_regclass(x.name) IS NULL)
 THEN RAISE EXCEPTION 'GU38_DEPENDENCIES_MISSING'; END IF;
END $pre$;
CREATE TABLE IF NOT EXISTS public.gu61_staging_checkout_intents (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id),
 sku_kind text NOT NULL CHECK(sku_kind IN ('plan','tool')),
 sku_code text NOT NULL CHECK(sku_code ~ '^[A-Z0-9_]{3,90}$'),
 price_id text NOT NULL CHECK(price_id ~ '^price_[A-Za-z0-9_]{6,}$'),
 quoted_amount_cents integer NOT NULL CHECK(quoted_amount_cents>0),
 currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
 stripe_session_id text UNIQUE CHECK(stripe_session_id IS NULL OR stripe_session_id ~ '^cs_test_[A-Za-z0-9_]+$'),
 stripe_subscription_id text UNIQUE CHECK(stripe_subscription_id IS NULL OR stripe_subscription_id ~ '^sub_[A-Za-z0-9_]+$'),
 stripe_payment_intent_id text UNIQUE CHECK(stripe_payment_intent_id IS NULL OR stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'),
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','checkout_created','paid','active','past_due','canceled','refunded','disputed','failed')),
 last_event_created timestamptz,
 created_grant_id bigint,
 last_invoice_id text, refund_hold_invoice_id text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu61_staging_intents_member ON public.gu61_staging_checkout_intents(user_id,created_at DESC);
-- A second click must NOT create two simultaneously open sessions for one SKU.
-- If Stripe creation times out, preserve the prepared intent until provider
-- session reconciliation; do not remove this bound unconfirmed safeguard.
CREATE UNIQUE INDEX IF NOT EXISTS gu61_one_unresolved_per_member_sku
 ON public.gu61_staging_checkout_intents(user_id,sku_kind,sku_code)
 WHERE status IN ('prepared','checkout_created');

ALTER TABLE public.gu61_staging_checkout_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu61_staging_checkout_intents FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.gu61_staging_stripe_events (
 event_id text PRIMARY KEY CHECK(event_id ~ '^evt_[A-Za-z0-9_]{4,150}$'),
 event_type text NOT NULL, intent_id uuid REFERENCES public.gu61_staging_checkout_intents(id),
 processed_at timestamptz NOT NULL DEFAULT now(), outcome text NOT NULL
);
ALTER TABLE public.gu61_staging_stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu61_staging_stripe_events FROM PUBLIC,anon,authenticated;
-- API service role is the sole writer of isolated STAGING checkout intents/events.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gu61_staging_checkout_intents TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.gu61_staging_stripe_events TO service_role;
-- Recover a Stripe STAGING Checkout Session created before a server/network failure
-- prevented its initial PostgREST PATCH. Only a verified provider-bound webhook
-- may call this service-only function; it NEVER grants user entitlements.
CREATE OR REPLACE FUNCTION public.gu61_staging_bind_verified_checkout(
 p_intent_id uuid,p_user_id uuid,p_session_id text,p_price_id text,p_expected_cents integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $bind$
DECLARE changed uuid; prior uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVER_ONLY' USING ERRCODE='42501'; END IF;
 IF p_intent_id IS NULL OR p_user_id IS NULL OR p_session_id IS NULL
   OR p_session_id !~ '^cs_test_[A-Za-z0-9_]{6,}$'
   OR p_price_id IS NULL OR p_price_id !~ '^price_[A-Za-z0-9_]{6,}$'
   OR p_expected_cents IS NULL OR p_expected_cents<=0 THEN
   RAISE EXCEPTION 'INVALID_STAGING_BINDING' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gu61:bind:'||p_intent_id::text,0));
 SELECT id INTO prior FROM public.gu61_staging_checkout_intents
 WHERE id=p_intent_id AND user_id=p_user_id
   AND stripe_session_id=p_session_id AND price_id=p_price_id
   AND quoted_amount_cents=p_expected_cents
   AND status IN ('checkout_created','paid','active','past_due','canceled','refunded','disputed')
 FOR UPDATE;
 IF prior IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'alreadyBound',true); END IF;
 UPDATE public.gu61_staging_checkout_intents SET
   stripe_session_id=p_session_id,status='checkout_created',updated_at=now()
 WHERE id=p_intent_id AND user_id=p_user_id AND price_id=p_price_id
   AND quoted_amount_cents=p_expected_cents
   AND stripe_session_id IS NULL AND status='prepared'
 RETURNING id INTO changed;
 IF changed IS NULL THEN
  RAISE EXCEPTION 'STAGING_BINDING_CONFLICT' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('ok',true,'bound',true);
END $bind$;
REVOKE ALL ON FUNCTION public.gu61_staging_bind_verified_checkout(uuid,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu61_staging_bind_verified_checkout(uuid,uuid,text,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.gu61_staging_stripe_apply_event(
 p_event_id text, p_action text, p_session_id text, p_subscription_id text,
 p_payment_intent_id text,p_price_id text,p_amount_cents integer,p_currency text,
 p_period_end timestamptz,p_stripe_created timestamptz,p_invoice_id text,p_cancel_at_period_end boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE i public.gu61_staging_checkout_intents%ROWTYPE;
        evt_status text; refid text; g_id bigint; existing_id bigint;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVER_ONLY' USING ERRCODE='42501'; END IF;
 IF p_event_id !~ '^evt_[A-Za-z0-9_]{4,150}$' OR p_action NOT IN
   ('lifetime_paid','subscription_active','subscription_past_due','subscription_canceled','subscription_refunded','subscription_disputed','payment_refunded','payment_disputed')
   OR p_stripe_created IS NULL OR p_stripe_created>now()+interval '5 minutes' OR p_currency IS DISTINCT FROM 'usd'
 THEN RAISE EXCEPTION 'INVALID_STRIPE_EVENT'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gu61:event:'||p_event_id,0));
 IF EXISTS(SELECT 1 FROM public.gu61_staging_stripe_events WHERE event_id=p_event_id)
 THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 IF p_session_id IS NOT NULL THEN
   SELECT * INTO i FROM public.gu61_staging_checkout_intents WHERE stripe_session_id=p_session_id FOR UPDATE;
 ELSIF p_subscription_id IS NOT NULL THEN
   SELECT * INTO i FROM public.gu61_staging_checkout_intents WHERE stripe_subscription_id=p_subscription_id FOR UPDATE;
 ELSIF p_payment_intent_id IS NOT NULL THEN
   SELECT * INTO i FROM public.gu61_staging_checkout_intents WHERE stripe_payment_intent_id=p_payment_intent_id FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'UNKNOWN_STRIPE_CHECKOUT'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gu61:intent:'||i.id::text,0));
 IF i.stripe_session_id IS NULL OR i.status='prepared' THEN RAISE EXCEPTION 'UNBOUND_STRIPE_CHECKOUT'; END IF;
 IF p_price_id IS DISTINCT FROM i.price_id OR p_currency IS DISTINCT FROM i.currency
 THEN RAISE EXCEPTION 'STRIPE_PRICE_CONFLICT'; END IF;
 IF i.last_event_created IS NOT NULL AND p_stripe_created<i.last_event_created AND
    p_action IN ('subscription_active','subscription_past_due','subscription_canceled') THEN
    INSERT INTO public.gu61_staging_stripe_events(event_id,event_type,intent_id,outcome)
    VALUES(p_event_id,p_action,i.id,'stale_ignored');
    RETURN jsonb_build_object('ok',true,'ignored','stale');
 END IF;
 -- Charge amount must equal configured price for first purchase. Discounts not supported at V1.
 IF p_action IN ('lifetime_paid','subscription_active') AND (p_amount_cents IS NULL OR p_amount_cents<i.quoted_amount_cents)
 THEN RAISE EXCEPTION 'PAYMENT_NOT_VERIFIED'; END IF;
 IF p_action IN ('subscription_active','subscription_past_due','subscription_canceled','subscription_refunded','subscription_disputed') THEN
   IF i.sku_kind='plan' AND i.sku_code='LIFETIME' THEN RAISE EXCEPTION 'SUBSCRIPTION_FOR_LIFETIME'; END IF;
   IF p_subscription_id !~ '^sub_[A-Za-z0-9_]+$' OR
      (i.stripe_subscription_id IS NOT NULL AND i.stripe_subscription_id<>p_subscription_id)
   THEN RAISE EXCEPTION 'SUBSCRIPTION_ID_CONFLICT'; END IF;
   IF p_invoice_id !~ '^in_[A-Za-z0-9_]+$' THEN RAISE EXCEPTION 'SUBSCRIPTION_INVOICE_REQUIRED'; END IF;
   IF p_action='subscription_active' AND (p_period_end IS NULL OR p_period_end<=now()) THEN
     RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PERIOD'; END IF;
   IF p_action='subscription_active' AND i.refund_hold_invoice_id IS NOT NULL AND i.refund_hold_invoice_id=p_invoice_id THEN
     INSERT INTO public.gu61_staging_stripe_events(event_id,event_type,intent_id,outcome)
       VALUES(p_event_id,p_action,i.id,'refunded_invoice_cannot_regrant');
     RETURN jsonb_build_object('ok',true,'ignored','refunded_invoice');
   END IF;
   evt_status:=CASE p_action WHEN 'subscription_active' THEN 'active' WHEN 'subscription_past_due' THEN 'past_due'
          WHEN 'subscription_refunded' THEN 'paused' WHEN 'subscription_disputed' THEN 'paused' ELSE 'canceled' END;
   IF i.sku_kind='plan' THEN
     IF NOT EXISTS(SELECT 1 FROM public.platform_plans WHERE plan_code=i.sku_code AND active=true)
        THEN RAISE EXCEPTION 'INACTIVE_PLAN'; END IF;
     INSERT INTO public.site_subscriptions(user_id,provider,provider_subscription_id,plan_code,status,
        current_period_end,cancel_at_period_end,updated_at,metadata)
     VALUES(i.user_id,'STRIPE_MANAGED',p_subscription_id,i.sku_code,evt_status,p_period_end,coalesce(p_cancel_at_period_end,false),now(),
        jsonb_build_object('checkoutIntent',i.id,'source','gu61_staging_signed_stripe'))
     ON CONFLICT(provider,provider_subscription_id) WHERE provider_subscription_id IS NOT NULL DO UPDATE SET
       status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now()
     WHERE public.site_subscriptions.user_id=excluded.user_id AND public.site_subscriptions.plan_code=excluded.plan_code;
   ELSE
     IF NOT EXISTS(SELECT 1 FROM public.platform_tools WHERE tool_code=i.sku_code AND status='staging' AND active=true)
        THEN RAISE EXCEPTION 'INACTIVE_TOOL'; END IF;
     INSERT INTO public.user_tool_passes(user_id,tool_code,status,provider,provider_subscription_id,current_period_end,cancel_at_period_end,metadata)
     -- user_tool_passes status CHECK excludes 'past_due'; use paused to deny
     -- access while retaining past_due in the payment-intent ledger for audit.
     VALUES(i.user_id,i.sku_code,CASE WHEN evt_status='past_due' THEN 'paused' ELSE evt_status END,
       'STRIPE_MANAGED',p_subscription_id,p_period_end,coalesce(p_cancel_at_period_end,false),
         jsonb_build_object('checkoutIntent',i.id,'source','gu61_staging_signed_stripe'))
     ON CONFLICT(provider,provider_subscription_id) WHERE provider_subscription_id IS NOT NULL DO UPDATE SET
        status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now()
     WHERE public.user_tool_passes.user_id=excluded.user_id AND public.user_tool_passes.tool_code=excluded.tool_code;
   END IF;
   UPDATE public.gu61_staging_checkout_intents SET stripe_subscription_id=p_subscription_id,
     status=CASE WHEN p_action='subscription_refunded' THEN 'refunded' WHEN p_action='subscription_disputed' THEN 'disputed' ELSE evt_status END,
     last_invoice_id=p_invoice_id,
     refund_hold_invoice_id=CASE WHEN p_action IN ('subscription_refunded','subscription_disputed') THEN p_invoice_id
       WHEN p_action='subscription_active' THEN NULL ELSE refund_hold_invoice_id END,
     last_event_created=greatest(coalesce(last_event_created,p_stripe_created),p_stripe_created),updated_at=now()
     WHERE id=i.id;
 ELSIF p_action='lifetime_paid' THEN
   IF i.sku_code<>'LIFETIME' OR i.sku_kind<>'plan' OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
     THEN RAISE EXCEPTION 'UNSUPPORTED_ONE_TIME_PURCHASE'; END IF;
   IF i.status IN ('refunded','disputed') THEN RAISE EXCEPTION 'REFUND_CANNOT_REGRANT'; END IF;
   IF i.created_grant_id IS NULL AND NOT EXISTS(
     SELECT 1 FROM public.user_plan_grants WHERE user_id=i.user_id AND plan_code='LIFETIME'
        AND status='active' AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now())) THEN
     INSERT INTO public.user_plan_grants(user_id,plan_code,status,starts_at,source,source_reference,metadata)
       VALUES(i.user_id,'LIFETIME','active',now(),'payment_webhook',p_payment_intent_id,
        jsonb_build_object('provider','STRIPE_MANAGED','checkoutIntent',i.id)) RETURNING id INTO g_id;
   END IF;
   UPDATE public.gu61_staging_checkout_intents SET stripe_payment_intent_id=p_payment_intent_id,
     created_grant_id=coalesce(created_grant_id,g_id),status='paid',updated_at=now() WHERE id=i.id;
   INSERT INTO public.site_orders(user_id,provider,provider_order_id,status,currency,subtotal_cents,total_cents,paid_at,metadata)
   VALUES(i.user_id,'STRIPE_MANAGED',p_payment_intent_id,'paid','USD',i.quoted_amount_cents,i.quoted_amount_cents,now(),
     jsonb_build_object('checkoutIntent',i.id,'stripePaymentIntent',p_payment_intent_id))
   ON CONFLICT(provider,provider_order_id) WHERE provider_order_id IS NOT NULL DO NOTHING;
 ELSE
   -- Refund/dispute events only revoke an entitlement first created by this exact purchase.
   IF p_payment_intent_id IS DISTINCT FROM i.stripe_payment_intent_id OR i.sku_code<>'LIFETIME'
      THEN RAISE EXCEPTION 'NO_REFUND_MATCH'; END IF;
   IF i.created_grant_id IS NOT NULL THEN
     UPDATE public.user_plan_grants SET status='canceled',updated_at=now()
     WHERE id=i.created_grant_id AND user_id=i.user_id AND plan_code='LIFETIME'
       AND source_reference=i.stripe_payment_intent_id AND source='payment_webhook';
   END IF;
   UPDATE public.gu61_staging_checkout_intents SET status=CASE p_action WHEN 'payment_refunded' THEN 'refunded' ELSE 'disputed' END,updated_at=now() WHERE id=i.id;
   UPDATE public.site_orders SET status=CASE p_action WHEN 'payment_refunded' THEN 'refunded' ELSE 'canceled' END,
     refunded_at=now() WHERE provider='STRIPE_MANAGED' AND provider_order_id=p_payment_intent_id AND user_id=i.user_id;
 END IF;
 INSERT INTO public.gu61_staging_stripe_events(event_id,event_type,intent_id,outcome)
 VALUES(p_event_id,p_action,i.id,'applied');
 RETURN jsonb_build_object('ok',true,'intentId',i.id,'action',p_action);
END $fn$;
REVOKE ALL ON FUNCTION public.gu61_staging_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu61_staging_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
