-- SMFGU-LUMEN-LIVE-ACCOUNTING-001 v1.0 (2026-10-31)
-- A purchase uses the existing canonical groundup_question_pass_buckets wallet.
-- Do not enable customer LIVE bundle checkout without a separate approved sale gate.
-- A signed Stripe webhook independently validates the account, session, price,
-- PaymentIntent and paid/refunded charge before invoking this service-only function.
CREATE TABLE IF NOT EXISTS public.gu_lumen_live_orders_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 request_id uuid NOT NULL,
 sku text NOT NULL CHECK (sku ~ '^SPARKS_[0-9]+$'),
 quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100000),
 amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 50 AND 100000000),
 stripe_product_id text NOT NULL CHECK(stripe_product_id ~ '^prod_[A-Za-z0-9_]+$'),
 stripe_price_id text NOT NULL CHECK(stripe_price_id ~ '^price_[A-Za-z0-9_]+$'),
 stripe_session_id text UNIQUE CHECK(stripe_session_id ~ '^cs_live_[A-Za-z0-9_]+$'),
 stripe_payment_intent_id text UNIQUE CHECK(stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'),
 status text NOT NULL DEFAULT 'prepared' CHECK (status IN
   ('prepared','bound','paid','refunded','disputed','expired','failed')),
 paid_event_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 reversed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_live_events_v1 (
 event_id text PRIMARY KEY CHECK (event_id ~ '^evt_[A-Za-z0-9_]+$'),
 order_id uuid NOT NULL REFERENCES public.gu_lumen_live_orders_v1(id),
 event_type text NOT NULL CHECK(event_type IN('paid','refunded','disputed','expired','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_live_reversals_v1 (
 order_id uuid PRIMARY KEY REFERENCES public.gu_lumen_live_orders_v1(id),
 event_id text NOT NULL UNIQUE REFERENCES public.gu_lumen_live_events_v1(event_id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 initial_lumens integer NOT NULL CHECK(initial_lumens>0),
 unspent_reversed integer NOT NULL CHECK(unspent_reversed>=0),
 already_consumed integer NOT NULL CHECK(already_consumed>=0),
 review_required boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(initial_lumens=unspent_reversed+already_consumed)
);
ALTER TABLE public.gu_lumen_live_orders_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_live_events_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_live_reversals_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_live_orders_v1,
 public.gu_lumen_live_events_v1,public.gu_lumen_live_reversals_v1
 FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_lumen_live_orders_v1,
 public.gu_lumen_live_events_v1,public.gu_lumen_live_reversals_v1 TO service_role;
-- Exact order session binding. No public/customer EXECUTE access.
CREATE OR REPLACE FUNCTION public.gu_lumen_live_bind_v1(
 p_id uuid,p_user uuid,p_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp' AS $body$
DECLARE o public.gu_lumen_live_orders_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_ONLY' USING errcode='42501';END IF;
 IF p_id IS NULL OR p_user IS NULL OR p_session !~ '^cs_live_[A-Za-z0-9_]{6,}$'
 THEN RETURN jsonb_build_object('ok',false,'code','INVALID_ARGUMENT'); END IF;
 SELECT * INTO o FROM public.gu_lumen_live_orders_v1 WHERE id=p_id AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
 IF o.status='bound' AND o.stripe_session_id=p_session THEN
  RETURN jsonb_build_object('ok',true,'replayed',true); END IF;
 IF o.status<>'prepared' OR o.stripe_session_id IS NOT NULL THEN
  RETURN jsonb_build_object('ok',false,'code','NOT_BINDABLE');END IF;
 UPDATE public.gu_lumen_live_orders_v1 SET
  stripe_session_id=p_session,status='bound',updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true,'replayed',false);
END $body$;
-- Atomic credited, duplicated, refunded, or disputed accounting.
CREATE OR REPLACE FUNCTION public.gu_lumen_live_apply_v1(
 p_id uuid,p_event text,p_kind text,p_session text DEFAULT NULL,
 p_pi text DEFAULT NULL,p_amount integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp' AS $body$
DECLARE o public.gu_lumen_live_orders_v1%rowtype;
 existing public.gu_lumen_live_events_v1%rowtype;
 b public.groundup_question_pass_buckets%rowtype;
 revoked integer;consumed integer;wallet_total bigint;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_ONLY' USING errcode='42501';END IF;
 IF p_id IS NULL OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$' OR
  p_kind NOT IN('paid','refunded','disputed','expired','failed')
 THEN RETURN jsonb_build_object('ok',false,'code','INVALID_ARGUMENT');END IF;
 SELECT * INTO existing FROM public.gu_lumen_live_events_v1 WHERE event_id=p_event;
 IF FOUND THEN RETURN jsonb_build_object('ok',existing.order_id=p_id AND existing.event_type=p_kind,
  'duplicate',true);END IF;
 SELECT * INTO o FROM public.gu_lumen_live_orders_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','ORDER_NOT_FOUND');END IF;
 -- Shared per-member lock serializes against all canonical wallet spending and admin credits.
 PERFORM pg_advisory_xact_lock(hashtextextended(o.user_id::text,489301));
 IF p_kind='paid' THEN
   IF o.status NOT IN ('bound','paid') OR o.stripe_session_id IS DISTINCT FROM p_session
     OR p_pi !~ '^pi_[A-Za-z0-9_]{6,}$' OR o.amount_cents IS DISTINCT FROM p_amount
     OR (o.stripe_payment_intent_id IS NOT NULL AND o.stripe_payment_intent_id<>p_pi)
   THEN RETURN jsonb_build_object('ok',false,'code','PAYMENT_PROOF_MISMATCH');END IF;
   IF o.status='bound' THEN
     SELECT coalesce(sum(remaining_credits),0) INTO wallet_total
     FROM public.groundup_question_pass_buckets WHERE user_id=o.user_id;
     IF wallet_total+o.quantity>1000000000 THEN
      RETURN jsonb_build_object('ok',false,'code','WALLET_LIMIT');END IF;
     INSERT INTO public.groundup_question_pass_buckets
       (user_id,source,origin_key,initial_credits,remaining_credits,billing_period_ends_at,expires_at)
     VALUES(o.user_id,'purchased','lumen-live-order:'||o.id::text,o.quantity,o.quantity,NULL,NULL)
     ON CONFLICT(user_id,origin_key) DO NOTHING;
     IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','DUPLICATE_WALLET_ORIGIN');END IF;
     UPDATE public.gu_lumen_live_orders_v1 SET
       status='paid',stripe_payment_intent_id=p_pi,paid_event_id=p_event,
       paid_at=now(),updated_at=now() WHERE id=o.id;
   END IF;
 ELSIF p_kind IN ('refunded','disputed') THEN
   IF o.status NOT IN('paid','refunded','disputed')
      OR o.stripe_session_id IS DISTINCT FROM p_session
      OR o.stripe_payment_intent_id IS DISTINCT FROM p_pi
   THEN RETURN jsonb_build_object('ok',false,'code','REVERSAL_PROOF_MISMATCH');END IF;
   IF o.status='paid' THEN
     SELECT * INTO b FROM public.groundup_question_pass_buckets
     WHERE user_id=o.user_id AND origin_key='lumen-live-order:'||o.id::text FOR UPDATE;
     IF NOT FOUND OR b.source<>'purchased' OR b.initial_credits<>o.quantity
       OR b.expires_at IS NOT NULL
     THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_BUCKET_MISMATCH');END IF;
     revoked:=b.remaining_credits;consumed:=b.initial_credits-revoked;
     UPDATE public.groundup_question_pass_buckets SET remaining_credits=0 WHERE id=b.id;
     INSERT INTO public.gu_lumen_live_events_v1(event_id,order_id,event_type)
      VALUES(p_event,p_id,p_kind);
     INSERT INTO public.gu_lumen_live_reversals_v1(
       order_id,event_id,user_id,initial_lumens,unspent_reversed,already_consumed,review_required)
     VALUES(o.id,p_event,o.user_id,o.quantity,revoked,consumed,consumed>0);
     UPDATE public.gu_lumen_live_orders_v1
      SET status=p_kind,reversed_at=now(),updated_at=now() WHERE id=o.id;
     RETURN jsonb_build_object('ok',true,'duplicate',false,'status',p_kind,
      'unspentReversed',revoked,'alreadyConsumed',consumed,'reviewRequired',consumed>0);
   END IF;
 ELSE
   IF o.status NOT IN('prepared','bound','expired','failed')
    OR (p_session IS NOT NULL AND o.stripe_session_id IS DISTINCT FROM p_session)
   THEN RETURN jsonb_build_object('ok',false,'code','CANNOT_FAIL_PAID');END IF;
   IF o.status IN('prepared','bound') THEN
    UPDATE public.gu_lumen_live_orders_v1
     SET status=p_kind,updated_at=now() WHERE id=o.id;
   END IF;
 END IF;
 INSERT INTO public.gu_lumen_live_events_v1(event_id,order_id,event_type)
 VALUES(p_event,p_id,p_kind);
 RETURN jsonb_build_object('ok',true,'duplicate',false,'status',p_kind);
END $body$;
REVOKE ALL ON FUNCTION public.gu_lumen_live_bind_v1(uuid,uuid,text),
 public.gu_lumen_live_apply_v1(uuid,text,text,text,text,integer)
 FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_lumen_live_bind_v1(uuid,uuid,text),
 public.gu_lumen_live_apply_v1(uuid,text,text,text,text,integer)
 TO service_role;
