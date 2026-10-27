-- GU Book Stripe TEST v1. Dedicated, fail-closed QA lane; NOT LIVE commerce.
BEGIN;
DO $pre$ BEGIN
 IF to_regclass('public.gu_digital_versions_v014303') IS NULL
 OR to_regclass('public.profiles') IS NULL THEN RAISE EXCEPTION 'GU_BOOK_TEST_PREREQUISITES_MISSING'; END IF;
END $pre$;
CREATE TABLE IF NOT EXISTS public.gu_book_test_qa_v1(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_book_test_intents_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 product_code text NOT NULL REFERENCES public.catalog_products(product_code),
 format text NOT NULL CHECK(format='epub'),
 price_id text NOT NULL CHECK(price_id ~ '^price_[A-Za-z0-9_]{6,}$'),
 quoted_amount_cents integer NOT NULL CHECK(quoted_amount_cents>0),
 currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 status text NOT NULL DEFAULT 'prepared'
   CHECK(status IN ('prepared','checkout_created','paid','refunded','disputed','expired','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 reversed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS gu_book_test_pending_unique_v1
 ON public.gu_book_test_intents_v1(user_id,product_code)
 WHERE status IN ('prepared','checkout_created');
CREATE TABLE IF NOT EXISTS public.gu_book_test_events_v1(
 event_id text PRIMARY KEY,
 intent_id uuid NOT NULL REFERENCES public.gu_book_test_intents_v1(id),
 kind text NOT NULL CHECK(kind IN ('paid','refunded','disputed','expired','failed')),
 applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_book_test_qa_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_book_test_intents_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_book_test_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_book_test_qa_v1,public.gu_book_test_intents_v1,public.gu_book_test_events_v1 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_book_test_qa_v1,public.gu_book_test_intents_v1,public.gu_book_test_events_v1 TO service_role;
INSERT INTO public.gu_book_test_qa_v1(user_id,enabled)
SELECT id,true FROM public.profiles WHERE username='QaPaid26' AND account_kind='member'
ON CONFLICT(user_id) DO NOTHING;

-- Privileged operations are service-only; browser JWTs cannot create paid records.
CREATE OR REPLACE FUNCTION public.gu_book_test_reserve_v1(
 p_user uuid,p_code text,p_price text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE result public.gu_book_test_intents_v1%ROWTYPE;
BEGIN
 IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY'; END IF;
 IF p_code <> 'FOUNDATION_BOOK_1' OR p_amount<>1099
 OR p_price !~ '^price_[A-Za-z0-9_]{6,}$' THEN RAISE EXCEPTION 'BOOK_TEST_SKU_UNAVAILABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu_book_test_qa_v1 q JOIN public.profiles p ON p.id=q.user_id
   LEFT JOIN public.admin_user_flags f ON f.user_id=q.user_id
   WHERE q.user_id=p_user AND q.enabled AND p.account_kind='member'
   AND p.deleted_at IS NULL AND coalesce(f.status,'active')='active')
 THEN RAISE EXCEPTION 'BOOK_TEST_QA_ONLY'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu_digital_versions_v014303 v
    JOIN storage.objects s ON s.bucket_id='gu-digital-ebooks' AND s.name=v.asset_path
    WHERE v.product_code=p_code AND v.format='epub' AND v.current)
 THEN RAISE EXCEPTION 'BOOK_TEST_FILE_UNAVAILABLE'; END IF;
 SELECT * INTO result FROM public.gu_book_test_intents_v1
 WHERE user_id=p_user AND product_code=p_code AND status IN ('prepared','checkout_created')
 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  RETURN jsonb_build_object('ok',true,'id',result.id,'existing',true,'session',result.stripe_session_id,'status',result.status);
 END IF;
 IF EXISTS(SELECT 1 FROM public.gu_book_test_intents_v1 WHERE user_id=p_user AND product_code=p_code AND status='paid')
 THEN RAISE EXCEPTION 'BOOK_TEST_ALREADY_OWNED'; END IF;
 INSERT INTO public.gu_book_test_intents_v1(user_id,product_code,format,price_id,quoted_amount_cents)
 VALUES(p_user,p_code,'epub',p_price,p_amount) RETURNING * INTO result;
 RETURN jsonb_build_object('ok',true,'id',result.id,'existing',false,'status',result.status);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_book_test_bind_v1(p_id uuid,p_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE r public.gu_book_test_intents_v1%ROWTYPE;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY'; END IF;
 IF p_session !~ '^cs_test_[A-Za-z0-9_]+$' THEN RAISE EXCEPTION 'INVALID_TEST_SESSION'; END IF;
 SELECT * INTO r FROM public.gu_book_test_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.status NOT IN ('prepared','checkout_created') OR
 (r.stripe_session_id IS NOT NULL AND r.stripe_session_id<>p_session) THEN RAISE EXCEPTION 'SESSION_BIND_DENIED'; END IF;
 UPDATE public.gu_book_test_intents_v1 SET stripe_session_id=p_session,status='checkout_created',updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_book_test_apply_v1(
 p_event text,p_id uuid,p_kind text,p_session text DEFAULT NULL,p_pi text DEFAULT NULL,
 p_price text DEFAULT NULL,p_amount integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE r public.gu_book_test_intents_v1%ROWTYPE; previous public.gu_book_test_events_v1%ROWTYPE;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY'; END IF;
 IF p_event !~ '^evt_[A-Za-z0-9_]+$' OR p_kind NOT IN ('paid','refunded','disputed','expired','failed')
 THEN RAISE EXCEPTION 'INVALID_TEST_EVENT'; END IF;
 SELECT * INTO r FROM public.gu_book_test_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'TEST_INTENT_MISSING'; END IF;
 SELECT * INTO previous FROM public.gu_book_test_events_v1 WHERE event_id=p_event;
 IF FOUND THEN
  IF previous.intent_id<>p_id OR previous.kind<>p_kind THEN RAISE EXCEPTION 'TEST_EVENT_REPLAY_MISMATCH'; END IF;
  RETURN jsonb_build_object('ok',true,'duplicate',true,'status',r.status);
 END IF;
 IF p_kind='paid' THEN
  IF r.status NOT IN ('prepared','checkout_created','paid') OR p_session !~ '^cs_test_[A-Za-z0-9_]+$'
   OR p_pi !~ '^pi_[A-Za-z0-9_]+$' OR p_price IS DISTINCT FROM r.price_id
   OR p_amount IS DISTINCT FROM r.quoted_amount_cents OR
   (r.stripe_session_id IS NOT NULL AND r.stripe_session_id<>p_session) OR
   (r.stripe_payment_intent_id IS NOT NULL AND r.stripe_payment_intent_id<>p_pi)
  THEN RAISE EXCEPTION 'TEST_PAID_BINDING_INVALID'; END IF;
  UPDATE public.gu_book_test_intents_v1 SET status='paid',stripe_session_id=p_session,stripe_payment_intent_id=p_pi,
    paid_at=coalesce(paid_at,now()),updated_at=now() WHERE id=p_id;
 ELSIF p_kind IN ('refunded','disputed') THEN
  IF r.status NOT IN ('paid','refunded','disputed') OR p_pi IS DISTINCT FROM r.stripe_payment_intent_id
   OR p_pi !~ '^pi_[A-Za-z0-9_]+$' THEN RAISE EXCEPTION 'TEST_REFUND_BINDING_INVALID'; END IF;
  UPDATE public.gu_book_test_intents_v1 SET status=CASE WHEN status='disputed' THEN 'disputed' ELSE p_kind END,
   reversed_at=coalesce(reversed_at,now()),updated_at=now() WHERE id=p_id;
 ELSE
  IF r.status NOT IN ('prepared','checkout_created','expired','failed') THEN RAISE EXCEPTION 'TEST_TERMINAL_INVALID'; END IF;
  UPDATE public.gu_book_test_intents_v1 SET status=p_kind,updated_at=now() WHERE id=p_id;
 END IF;
 INSERT INTO public.gu_book_test_events_v1(event_id,intent_id,kind) VALUES(p_event,p_id,p_kind);
 RETURN jsonb_build_object('ok',true,'duplicate',false,'status',(SELECT status FROM public.gu_book_test_intents_v1 WHERE id=p_id));
END $fn$;

-- Per-JWT test library: no grants to real My Books and no customer LIVE entitlement.
CREATE OR REPLACE FUNCTION public.gu_my_book_test_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE user_id uuid:=auth.uid(); books jsonb;
BEGIN
 IF user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.gu_book_test_qa_v1 q
   JOIN public.profiles p ON p.id=q.user_id LEFT JOIN public.admin_user_flags f ON f.user_id=q.user_id
   WHERE q.user_id=user_id AND q.enabled AND p.account_kind='member' AND p.deleted_at IS NULL
   AND coalesce(f.status,'active')='active')
 THEN RETURN jsonb_build_object('ok',true,'books','[]'::jsonb); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',b.product_code,'format','epub','title',cp.title,'testOnly',true)),'[]'::jsonb)
 INTO books
 FROM (SELECT DISTINCT product_code FROM public.gu_book_test_intents_v1 WHERE user_id=user_id AND status='paid') b
 JOIN public.catalog_products cp ON cp.product_code=b.product_code
 WHERE EXISTS(SELECT 1 FROM public.gu_digital_versions_v014303 v
  JOIN storage.objects s ON s.bucket_id='gu-digital-ebooks' AND s.name=v.asset_path
  WHERE v.product_code=b.product_code AND v.format='epub' AND v.current);
 RETURN jsonb_build_object('ok',true,'books',books);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_book_test_file_v1(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE user_id uuid:=auth.uid(); fpath text;
BEGIN
 IF user_id IS NULL OR p_code<>'FOUNDATION_BOOK_1'
 OR NOT EXISTS(SELECT 1 FROM public.gu_book_test_qa_v1 q JOIN public.profiles p ON p.id=q.user_id
  LEFT JOIN public.admin_user_flags f ON f.user_id=q.user_id
  WHERE q.user_id=user_id AND q.enabled AND p.account_kind='member' AND p.deleted_at IS NULL
   AND coalesce(f.status,'active')='active')
 OR NOT EXISTS(SELECT 1 FROM public.gu_book_test_intents_v1
  WHERE user_id=user_id AND product_code=p_code AND status='paid')
 THEN RETURN jsonb_build_object('allowed',false); END IF;
 SELECT v.asset_path INTO fpath FROM public.gu_digital_versions_v014303 v
 JOIN storage.objects s ON s.name=v.asset_path AND s.bucket_id='gu-digital-ebooks'
 WHERE v.product_code=p_code AND v.format='epub' AND v.current
 ORDER BY v.version DESC LIMIT 1;
 RETURN CASE WHEN fpath IS NULL THEN jsonb_build_object('allowed',false)
   ELSE jsonb_build_object('allowed',true,'path',fpath,'format','epub') END;
END $fn$;

REVOKE ALL ON FUNCTION public.gu_book_test_reserve_v1(uuid,text,text,integer),
 public.gu_book_test_bind_v1(uuid,text),
 public.gu_book_test_apply_v1(text,uuid,text,text,text,text,integer),
 public.gu_my_book_test_v1(),public.gu_book_test_file_v1(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_book_test_reserve_v1(uuid,text,text,integer),
 public.gu_book_test_bind_v1(uuid,text),
 public.gu_book_test_apply_v1(text,uuid,text,text,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_my_book_test_v1(),public.gu_book_test_file_v1(text) TO authenticated;
COMMIT;