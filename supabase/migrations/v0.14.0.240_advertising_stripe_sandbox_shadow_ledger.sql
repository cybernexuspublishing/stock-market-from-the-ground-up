-- v0.14.0.240: Sponsor sales Stripe TEST-only Checkout + signed-event shadow ledger.
-- No operation changes commercial ad campaigns, ad events, real invoices,
-- advertiser records or member entitlements. Independent gates default OFF.
CREATE TABLE IF NOT EXISTS public.gu_ad_sandbox_settings_v014240(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 testing_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_ad_sandbox_settings_v014240(singleton) VALUES(true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gu_ad_sandbox_prices_v014240(
 package_code text PRIMARY KEY REFERENCES public.gu_ad_packages_v014226(code),
 test_product_id text NOT NULL UNIQUE,
 test_price_id text NOT NULL UNIQUE,
 test_amount_cents integer NOT NULL DEFAULT 100 CHECK(test_amount_cents=100),
 test_currency text NOT NULL DEFAULT 'usd' CHECK(test_currency='usd'),
 CHECK(test_product_id ~ '^prod_[A-Za-z0-9_]{8,}$'),
 CHECK(test_price_id ~ '^price_[A-Za-z0-9_]{8,}$')
);
INSERT INTO public.gu_ad_sandbox_prices_v014240(package_code,test_product_id,test_price_id)
VALUES
 ('SITE_SPONSOR','prod_VVKT4YqjwCFGIM','price_1UUJoPJY9FI7byHBdkreckh7'),
 ('SECTION_SPONSOR','prod_VVKTDed4rNvv9D','price_1UUJoTJY9FI7byHBxzO6219X'),
 ('RESOURCE_SPONSOR','prod_VVKTtsKU4IzbwB','price_1UUJoXJY9FI7byHB69yCmwql')
ON CONFLICT(package_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gu_ad_sandbox_intents_v014240(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 package_code text NOT NULL REFERENCES public.gu_ad_sandbox_prices_v014240(package_code),
 status text NOT NULL DEFAULT 'created' CHECK(status IN
  ('created','checkout_open','paid','failed','refunded','disputed','expired')),
 checkout_session text UNIQUE,
 payment_intent text UNIQUE,
 customer_id text,
 amount_cents integer CHECK(amount_cents IS NULL OR amount_cents=100),
 event_count integer NOT NULL DEFAULT 0 CHECK(event_count>=0),
 paid_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(checkout_session IS NULL OR checkout_session ~ '^cs_test_[A-Za-z0-9_]{6,}$'),
 CHECK(payment_intent IS NULL OR payment_intent ~ '^pi_[A-Za-z0-9_]{6,}$')
);
CREATE INDEX IF NOT EXISTS gu_ad_sandbox_owner_v014240 ON
 public.gu_ad_sandbox_intents_v014240(owner_user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.gu_ad_sandbox_events_v014240(
 event_id text PRIMARY KEY CHECK(event_id ~ '^evt_[A-Za-z0-9_]{6,}$'),
 intent_id uuid NOT NULL REFERENCES public.gu_ad_sandbox_intents_v014240(id),
 session_id text NOT NULL,
 event_type text NOT NULL,
 result text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_ad_sandbox_events_intent_v014240 ON
 public.gu_ad_sandbox_events_v014240(intent_id,occurred_at DESC);

CREATE OR REPLACE FUNCTION public.gu_ad_sandbox_bind_v014240(
 p_intent uuid,p_owner uuid,p_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE q public.gu_ad_sandbox_intents_v014240%rowtype;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.gu_ad_sandbox_settings_v014240
  WHERE singleton AND testing_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','QA_DISABLED'); END IF;
 IF p_session !~ '^cs_test_[A-Za-z0-9_]{6,}$'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_SESSION');END IF;
 SELECT * INTO q FROM public.gu_ad_sandbox_intents_v014240
 WHERE id=p_intent FOR UPDATE;
 IF NOT FOUND OR q.owner_user_id<>p_owner OR q.status<>'created' OR
 q.checkout_session IS NOT NULL
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_BINDABLE');END IF;
 UPDATE public.gu_ad_sandbox_intents_v014240
 SET status='checkout_open',checkout_session=p_session,updated_at=now()
 WHERE id=p_intent;
 RETURN jsonb_build_object('ok',true,'intentId',p_intent,'mode','SANDBOX');
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_ad_sandbox_apply_v014240(
 p_intent uuid,p_event text,p_session text,p_kind text,
 p_payment_intent text DEFAULT NULL,p_customer text DEFAULT NULL,p_amount integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE q public.gu_ad_sandbox_intents_v014240%rowtype;result text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.gu_ad_sandbox_settings_v014240
  WHERE singleton AND testing_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','QA_DISABLED'); END IF;
 IF p_event !~ '^evt_[A-Za-z0-9_]{6,}$' OR
 p_session !~ '^cs_test_[A-Za-z0-9_]{6,}$' OR
 p_kind NOT IN('paid','failed','expired','refunded','disputed') OR
 (p_payment_intent IS NOT NULL AND p_payment_intent !~ '^pi_[A-Za-z0-9_]{6,}$') OR
 (p_customer IS NOT NULL AND p_customer !~ '^cus_[A-Za-z0-9_]{6,}$')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROVIDER_EVENT'); END IF;
 SELECT * INTO q FROM public.gu_ad_sandbox_intents_v014240
 WHERE id=p_intent FOR UPDATE;
 IF NOT FOUND OR q.checkout_session<>p_session OR
 q.status='created' THEN RETURN jsonb_build_object('ok',false,'error','UNBOUND_TEST_SESSION'); END IF;
 IF EXISTS(SELECT 1 FROM public.gu_ad_sandbox_events_v014240 WHERE event_id=p_event)
 THEN RETURN jsonb_build_object('ok',true,'mode','SANDBOX','replayed',true); END IF;
 IF p_kind='paid' THEN
   IF p_amount<>100 OR p_payment_intent IS NULL OR q.status NOT IN('checkout_open','paid')
   THEN RETURN jsonb_build_object('ok',false,'error','INVALID_TEST_PAYMENT');END IF;
   UPDATE public.gu_ad_sandbox_intents_v014240
    SET status='paid',payment_intent=p_payment_intent,
    customer_id=p_customer,amount_cents=100,paid_at=coalesce(paid_at,now()),
    updated_at=now() WHERE id=p_intent;
 ELSIF p_kind IN('refunded','disputed') THEN
   IF q.status NOT IN('paid','refunded','disputed') OR
   q.payment_intent IS NULL OR q.payment_intent<>p_payment_intent
   THEN RETURN jsonb_build_object('ok',false,'error','MISSING_PAID_TEST_PAYMENT');END IF;
   UPDATE public.gu_ad_sandbox_intents_v014240
    SET status=p_kind,updated_at=now() WHERE id=p_intent;
 ELSIF p_kind IN('failed','expired') THEN
   IF q.status NOT IN('created','checkout_open','failed','expired')
   THEN RETURN jsonb_build_object('ok',false,'error','CANNOT_DOWNGRADE_PAID'); END IF;
   UPDATE public.gu_ad_sandbox_intents_v014240
    SET status=p_kind,updated_at=now() WHERE id=p_intent;
 END IF;
 INSERT INTO public.gu_ad_sandbox_events_v014240(event_id,intent_id,session_id,event_type,result)
 VALUES(p_event,p_intent,p_session,p_kind,'accepted');
 UPDATE public.gu_ad_sandbox_intents_v014240 SET event_count=event_count+1 WHERE id=p_intent;
 RETURN jsonb_build_object('ok',true,'mode','SANDBOX','replayed',false,'status',p_kind,
 'commercialAdActivated',false,'livePayment',false);
END $fn$;
ALTER TABLE public.gu_ad_sandbox_settings_v014240 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_sandbox_prices_v014240 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_sandbox_intents_v014240 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_sandbox_events_v014240 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_ad_sandbox_settings_v014240,
 public.gu_ad_sandbox_prices_v014240,public.gu_ad_sandbox_intents_v014240,
 public.gu_ad_sandbox_events_v014240 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_ad_sandbox_settings_v014240,
 public.gu_ad_sandbox_prices_v014240,public.gu_ad_sandbox_intents_v014240,
 public.gu_ad_sandbox_events_v014240 TO service_role;
REVOKE ALL ON FUNCTION public.gu_ad_sandbox_bind_v014240(uuid,uuid,text),
 public.gu_ad_sandbox_apply_v014240(uuid,text,text,text,text,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_ad_sandbox_bind_v014240(uuid,uuid,text),
 public.gu_ad_sandbox_apply_v014240(uuid,text,text,text,text,text,integer)
 TO service_role;
