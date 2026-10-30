-- Stripe TEST mixed-Lumen acceptance: isolated, noncommercial shadow wallet and grants.
-- No production credits, membership rights, or LIVE billing objects are modified.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_mixed_qa_wallet_v1 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 available integer NOT NULL DEFAULT 0 CHECK (available BETWEEN 0 AND 1000000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_mixed_qa_intents_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 sku text NOT NULL DEFAULT 'tool:MIXED_CHECKOUT_QA' CHECK (sku='tool:MIXED_CHECKOUT_QA'),
 original_cents integer NOT NULL DEFAULT 1999 CHECK (original_cents=1999),
 lumens_reserved integer NOT NULL CHECK (lumens_reserved BETWEEN 0 AND 286),
 discount_cents integer NOT NULL CHECK (discount_cents BETWEEN 0 AND 1999),
 cash_due_cents integer NOT NULL CHECK (cash_due_cents=0 OR cash_due_cents>=50),
 status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','bound','fulfilled','released','refunded','disputed','review')),
 stripe_session_id text UNIQUE CHECK (stripe_session_id IS NULL OR stripe_session_id ~ '^cs_test_[A-Za-z0-9_]+$'),
 stripe_payment_intent_id text UNIQUE CHECK (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'),
 settled_event_id text UNIQUE CHECK (settled_event_id IS NULL OR settled_event_id ~ '^evt_[A-Za-z0-9_]+$'),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 minutes'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id),
 CHECK (discount_cents+cash_due_cents=original_cents),
 CHECK (discount_cents=least(original_cents,lumens_reserved*7))
);
CREATE UNIQUE INDEX IF NOT EXISTS gu_mixed_qa_one_open_per_user_v1
 ON public.gu_mixed_qa_intents_v1(user_id)
 WHERE status IN ('reserved','bound','disputed','review');
CREATE TABLE IF NOT EXISTS public.gu_mixed_qa_access_v1 (
 intent_id uuid PRIMARY KEY REFERENCES public.gu_mixed_qa_intents_v1(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 active boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_mixed_qa_events_v1 (
 event_id text PRIMARY KEY CHECK (event_id ~ '^evt_[A-Za-z0-9_]+$'),
 intent_id uuid NOT NULL REFERENCES public.gu_mixed_qa_intents_v1(id) ON DELETE CASCADE,
 action text NOT NULL CHECK (action IN ('paid','expired','failed','refunded','disputed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_mixed_qa_wallet_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_mixed_qa_intents_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_mixed_qa_access_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_mixed_qa_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_mixed_qa_wallet_v1,public.gu_mixed_qa_intents_v1,
 public.gu_mixed_qa_access_v1,public.gu_mixed_qa_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_mixed_qa_wallet_v1,public.gu_mixed_qa_intents_v1,
 public.gu_mixed_qa_access_v1,public.gu_mixed_qa_events_v1 TO service_role;

-- All privileged RPCs are service-only; the HTTP handler independently validates
-- a current Owner session and recent password step-up before enabling QA flows.
CREATE OR REPLACE FUNCTION public.gu_mixed_qa_seed_v1(p_user uuid,p_balance integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
BEGIN
 IF p_user IS NULL OR p_balance IS NULL OR p_balance NOT BETWEEN 0 AND 1000
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_SEED');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 IF EXISTS(SELECT 1 FROM public.gu_mixed_qa_intents_v1
   WHERE user_id=p_user AND status IN ('reserved','bound','disputed','review'))
 THEN RETURN jsonb_build_object('ok',false,'error','OPEN_TEST_INTENT');END IF;
 INSERT INTO public.gu_mixed_qa_wallet_v1(user_id,available) VALUES(p_user,p_balance)
 ON CONFLICT(user_id) DO UPDATE SET available=EXCLUDED.available,updated_at=now();
 RETURN jsonb_build_object('ok',true,'available',p_balance,'shadowOnly',true);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_mixed_qa_reserve_v1(p_user uuid,p_request uuid,p_lumens integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
DECLARE prior record; current_balance integer; disc integer; cash integer; new_id uuid;
BEGIN
 IF p_user IS NULL OR p_request IS NULL OR p_lumens IS NULL OR
    p_lumens NOT BETWEEN 0 AND 286
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_SELECTION'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu39_sandbox_settings WHERE id=true AND enabled=true)
   OR NOT EXISTS(SELECT 1 FROM public.gu_lumen_value_settings_v1
       WHERE singleton=true AND active_cents=7 AND mixed_checkout_enabled=false)
 THEN RETURN jsonb_build_object('ok',false,'error','QA_SWITCH_DISABLED');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 SELECT * INTO prior FROM public.gu_mixed_qa_intents_v1
 WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
   IF prior.lumens_reserved<>p_lumens THEN
     RETURN jsonb_build_object('ok',false,'error','REQUEST_REUSED');END IF;
   RETURN jsonb_build_object('ok',true,'id',prior.id,'status',prior.status,
     'cashCents',prior.cash_due_cents,'lumens',prior.lumens_reserved,
     'discountCents',prior.discount_cents,'alreadyReserved',true,
     'sessionId',prior.stripe_session_id);
 END IF;
 IF EXISTS(SELECT 1 FROM public.gu_mixed_qa_intents_v1
    WHERE user_id=p_user AND status IN ('reserved','bound','disputed','review'))
 THEN RETURN jsonb_build_object('ok',false,'error','EXISTING_TEST_INTENT');END IF;
 disc:=least(1999,p_lumens*7);cash:=1999-disc;
 IF cash BETWEEN 1 AND 49 THEN
  RETURN jsonb_build_object('ok',false,'error','BELOW_USD_MINIMUM','cashCents',cash);
 END IF;
 SELECT available INTO current_balance FROM public.gu_mixed_qa_wallet_v1
 WHERE user_id=p_user FOR UPDATE;
 IF current_balance IS NULL OR current_balance<p_lumens THEN
   RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_TEST_LUMENS',
      'available',coalesce(current_balance,0));END IF;
 UPDATE public.gu_mixed_qa_wallet_v1
 SET available=available-p_lumens,updated_at=now() WHERE user_id=p_user;
 INSERT INTO public.gu_mixed_qa_intents_v1(user_id,request_id,lumens_reserved,discount_cents,cash_due_cents)
 VALUES(p_user,p_request,p_lumens,disc,cash) RETURNING id INTO new_id;
 RETURN jsonb_build_object('ok',true,'id',new_id,'status','reserved',
   'cashCents',cash,'lumens',p_lumens,'discountCents',disc,'alreadyReserved',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_mixed_qa_bind_v1(p_id uuid,p_user uuid,p_session text,p_cash integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
DECLARE i public.gu_mixed_qa_intents_v1%rowtype;
BEGIN
 IF p_id IS NULL OR p_user IS NULL OR p_session !~ '^cs_test_[A-Za-z0-9_]+$'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_BIND');END IF;
 SELECT * INTO i FROM public.gu_mixed_qa_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR i.user_id<>p_user THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 IF i.status='bound' AND i.stripe_session_id=p_session AND i.cash_due_cents=p_cash
 THEN RETURN jsonb_build_object('ok',true,'duplicate',true);END IF;
 IF i.status<>'reserved' OR i.cash_due_cents<>p_cash OR p_cash<50 OR i.expires_at<=now()
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_BINDABLE');END IF;
 UPDATE public.gu_mixed_qa_intents_v1 SET stripe_session_id=p_session,
 status='bound',updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true,'duplicate',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_mixed_qa_zero_v1(p_id uuid,p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
DECLARE i public.gu_mixed_qa_intents_v1%rowtype;
BEGIN
 SELECT * INTO i FROM public.gu_mixed_qa_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR i.user_id<>p_user THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 IF i.status='fulfilled' AND i.cash_due_cents=0
 THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 IF i.status<>'reserved' OR i.cash_due_cents<>0 OR i.expires_at<=now()
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_ZERO_PAYABLE');END IF;
 UPDATE public.gu_mixed_qa_intents_v1 SET status='fulfilled',updated_at=now() WHERE id=p_id;
 INSERT INTO public.gu_mixed_qa_access_v1(intent_id,user_id,active)
 VALUES(p_id,p_user,true) ON CONFLICT(intent_id) DO UPDATE SET active=true,updated_at=now();
 RETURN jsonb_build_object('ok',true,'shadowAccess',true,'cashCents',0,'duplicate',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_mixed_qa_reconcile_v1(
 p_id uuid,p_event text,p_action text,p_session text DEFAULT NULL,
 p_pi text DEFAULT NULL,p_paid integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
DECLARE i public.gu_mixed_qa_intents_v1%rowtype; existing record;
BEGIN
 IF p_id IS NULL OR p_event !~ '^evt_[A-Za-z0-9_]+$' OR
 p_action NOT IN ('paid','expired','failed','refunded','disputed') THEN
   RETURN jsonb_build_object('ok',false,'error','INVALID_RECONCILIATION');END IF;
 SELECT user_id INTO existing FROM public.gu_mixed_qa_intents_v1 WHERE id=p_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(existing.user_id::text,489301));
 SELECT * INTO i FROM public.gu_mixed_qa_intents_v1 WHERE id=p_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.gu_mixed_qa_events_v1 WHERE event_id=p_event)
 THEN RETURN jsonb_build_object('ok',true,'duplicate',true,'status',i.status);END IF;
 IF p_action='paid' THEN
   IF i.status='fulfilled' AND i.stripe_session_id=p_session AND i.stripe_payment_intent_id=p_pi
   THEN RETURN jsonb_build_object('ok',true,'duplicate',true,'status','fulfilled');END IF;
   IF i.status<>'bound' OR i.stripe_session_id<>p_session OR
     p_session !~ '^cs_test_[A-Za-z0-9_]+$' OR p_pi !~ '^pi_[A-Za-z0-9_]+$' OR
     i.cash_due_cents<>p_paid OR p_paid<50 THEN
      RETURN jsonb_build_object('ok',false,'error','PAYMENT_MISMATCH');END IF;
   UPDATE public.gu_mixed_qa_intents_v1 SET status='fulfilled',
     stripe_payment_intent_id=p_pi,settled_event_id=p_event,updated_at=now() WHERE id=p_id;
   INSERT INTO public.gu_mixed_qa_access_v1(intent_id,user_id,active)
   VALUES(p_id,i.user_id,true)
   ON CONFLICT(intent_id) DO UPDATE SET active=true,updated_at=now();
 ELSIF p_action IN ('expired','failed') THEN
   IF i.status NOT IN ('reserved','bound') OR
    (i.stripe_session_id IS NOT NULL AND i.stripe_session_id IS DISTINCT FROM p_session) THEN
     RETURN jsonb_build_object('ok',false,'error','CANNOT_RELEASE_PAID_OR_UNVERIFIED');END IF;
   UPDATE public.gu_mixed_qa_wallet_v1
     SET available=available+i.lumens_reserved,updated_at=now() WHERE user_id=i.user_id;
   UPDATE public.gu_mixed_qa_intents_v1 SET status='released',updated_at=now() WHERE id=p_id;
 ELSIF p_action='refunded' THEN
   IF i.status<>'fulfilled' OR i.cash_due_cents=0 OR i.stripe_payment_intent_id<>p_pi
   THEN RETURN jsonb_build_object('ok',false,'error','REFUND_NEEDS_REVIEW');END IF;
   UPDATE public.gu_mixed_qa_wallet_v1
     SET available=available+i.lumens_reserved,updated_at=now() WHERE user_id=i.user_id;
   UPDATE public.gu_mixed_qa_access_v1 SET active=false,updated_at=now() WHERE intent_id=p_id;
   UPDATE public.gu_mixed_qa_intents_v1 SET status='refunded',updated_at=now() WHERE id=p_id;
 ELSE
   IF i.status NOT IN ('fulfilled','disputed') OR i.stripe_payment_intent_id<>p_pi
   THEN RETURN jsonb_build_object('ok',false,'error','DISPUTE_NEEDS_REVIEW');END IF;
   UPDATE public.gu_mixed_qa_access_v1 SET active=false,updated_at=now() WHERE intent_id=p_id;
   UPDATE public.gu_mixed_qa_intents_v1 SET status='disputed',updated_at=now() WHERE id=p_id;
 END IF;
 INSERT INTO public.gu_mixed_qa_events_v1(event_id,intent_id,action)
 VALUES(p_event,p_id,p_action);
 RETURN jsonb_build_object('ok',true,'duplicate',false,'status',
   (SELECT status FROM public.gu_mixed_qa_intents_v1 WHERE id=p_id),'shadowOnly',true);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_mixed_qa_seed_v1(uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_mixed_qa_reserve_v1(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_mixed_qa_bind_v1(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_mixed_qa_zero_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_mixed_qa_reconcile_v1(uuid,text,text,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_mixed_qa_seed_v1(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_mixed_qa_reserve_v1(uuid,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_mixed_qa_bind_v1(uuid,uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_mixed_qa_zero_v1(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_mixed_qa_reconcile_v1(uuid,text,text,text,text,integer) TO service_role;
COMMIT;