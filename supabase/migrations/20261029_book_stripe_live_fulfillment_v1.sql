-- First-party Stripe LIVE book fulfillment v1. Reviewable production migration.
-- No checkout or publication switch is enabled by this migration.
BEGIN;
DO $prereq$ BEGIN
 IF to_regclass('public.gu_digital_books_v01430') IS NULL
 OR to_regclass('public.gu_digital_versions_v014303') IS NULL
 OR to_regprocedure('public.gu_digital_paid_owned_v01430(text,uuid)') IS NULL
 THEN RAISE EXCEPTION 'BOOK_LIVE_PREREQUISITES_MISSING'; END IF;
END $prereq$;
CREATE TABLE IF NOT EXISTS public.gu_book_live_intents_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 product_code text NOT NULL REFERENCES public.catalog_products(product_code),
 format text NOT NULL DEFAULT 'epub' CHECK (format='epub'),
 price_id text NOT NULL CHECK(price_id ~ '^price_[A-Za-z0-9_]{6,}$'),
 quoted_amount_cents integer NOT NULL CHECK(quoted_amount_cents>0),
 currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 status text NOT NULL DEFAULT 'prepared'
  CHECK(status IN ('prepared','checkout_created','paid','refunded','disputed','expired','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz, reversed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS gu_book_live_pending_unique_v1
 ON public.gu_book_live_intents_v1(user_id,product_code)
 WHERE status IN ('prepared','checkout_created');
CREATE TABLE IF NOT EXISTS public.gu_book_live_events_v1(
 event_id text PRIMARY KEY,
 intent_id uuid NOT NULL REFERENCES public.gu_book_live_intents_v1(id),
 kind text NOT NULL CHECK(kind IN ('paid','refunded','disputed','expired','failed')),
 applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_book_live_intents_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_book_live_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_book_live_intents_v1,public.gu_book_live_events_v1 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_book_live_intents_v1,public.gu_book_live_events_v1 TO service_role;
-- Protected purchase flow requires an authorized book and verifiable current private edition.
CREATE OR REPLACE FUNCTION public.gu_book_live_reserve_v1(p_user uuid,p_code text,p_price text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE r public.gu_book_live_intents_v1%ROWTYPE;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'SERVICE_ONLY' USING ERRCODE='42501'; END IF;
 IF p_user IS NULL OR p_code<>'FOUNDATION_BOOK_1'
 OR p_price<>'price_1UVBsDJL0O4GGVBHdqAaP15z' OR p_amount<>1099
 THEN RAISE EXCEPTION 'UNAPPROVED_BOOK_PRICE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_user AND p.account_kind='member'
  AND p.deleted_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_user
  AND lower(f.status) IN ('restricted','suspended'))
 OR EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_user
  AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RAISE EXCEPTION 'BOOK_MEMBER_NOT_ELIGIBLE'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.catalog_products p
  JOIN public.gu_digital_books_v01430 d ON d.product_code=p.product_code
  JOIN storage.objects s ON s.bucket_id='gu-digital-ebooks' AND s.name=d.asset_path
  WHERE p.product_code=p_code AND p.product_type='book' AND p.active AND p.store_visible
  AND p.sales_status='published' AND p.kdp_select=false
  AND p.direct_digital_enabled AND p.website_checkout_enabled
  AND p.metadata->'website_price_by_format_cents_v135'->>'digital'='1099'
  AND d.sales_enabled AND d.downloads_enabled AND d.rights_attested_at IS NOT NULL
  AND d.exclusive_until IS NOT NULL AND d.exclusive_until<=now()
  AND d.asset_path ~ '^FOUNDATION_BOOK_1/[a-f0-9-]{36}[.]epub$'
 ) THEN RAISE EXCEPTION 'BOOK_RIGHTS_OR_EDITION_NOT_READY'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_settings s WHERE s.setting_key='commerce.checkout_enabled'
  AND s.value='true'::jsonb)
 OR NOT EXISTS(SELECT 1 FROM public.site_settings s WHERE s.setting_key='commerce.provider'
  AND s.value='"STRIPE_MANAGED"'::jsonb)
 THEN RAISE EXCEPTION 'BOOK_PROVIDER_NOT_APPROVED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_code,20261029));
 IF public.gu_digital_paid_owned_v01430(p_code,p_user) OR
  public.gu_lifetime_ebook_eligible_v01435(p_user,p_code)
 THEN RAISE EXCEPTION 'BOOK_ALREADY_OWNED'; END IF;
 SELECT * INTO r FROM public.gu_book_live_intents_v1
 WHERE user_id=p_user AND product_code=p_code AND status IN ('prepared','checkout_created')
 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'id',r.id,'existing',true,
  'status',r.status,'session',r.stripe_session_id); END IF;
 INSERT INTO public.gu_book_live_intents_v1(user_id,product_code,price_id,quoted_amount_cents)
 VALUES(p_user,p_code,p_price,p_amount) RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'existing',false,'status',r.status);
END $fn$;
CREATE OR REPLACE FUNCTION public.gu_book_live_bind_v1(p_id uuid,p_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE r public.gu_book_live_intents_v1%ROWTYPE;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'SERVICE_ONLY' USING ERRCODE='42501'; END IF;
 IF p_session !~ '^cs_live_[A-Za-z0-9_]+$' THEN RAISE EXCEPTION 'INVALID_BOOK_SESSION'; END IF;
 SELECT * INTO r FROM public.gu_book_live_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.status NOT IN ('prepared','checkout_created','paid') OR
 (r.stripe_session_id IS NOT NULL AND r.stripe_session_id<>p_session)
 THEN RAISE EXCEPTION 'BOOK_SESSION_BIND_DENIED'; END IF;
 UPDATE public.gu_book_live_intents_v1 SET stripe_session_id=p_session,
 status=CASE WHEN status='paid' THEN 'paid' ELSE 'checkout_created' END,updated_at=now()
 WHERE id=p_id;
 RETURN jsonb_build_object('ok',true);
END $fn$;
CREATE OR REPLACE FUNCTION public.gu_book_live_apply_v1(
 p_event text,p_id uuid,p_kind text,p_session text DEFAULT NULL,p_pi text DEFAULT NULL,
 p_price text DEFAULT NULL,p_amount integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE r public.gu_book_live_intents_v1%ROWTYPE; prev public.gu_book_live_events_v1%ROWTYPE;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'SERVICE_ONLY' USING ERRCODE='42501'; END IF;
 IF p_event !~ '^evt_[A-Za-z0-9_]+$' OR p_kind NOT IN ('paid','refunded','disputed','expired','failed')
 THEN RAISE EXCEPTION 'INVALID_BOOK_EVENT'; END IF;
 SELECT * INTO r FROM public.gu_book_live_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOOK_INTENT_NOT_FOUND'; END IF;
 SELECT * INTO prev FROM public.gu_book_live_events_v1 WHERE event_id=p_event;
 IF FOUND THEN
  IF prev.intent_id<>p_id OR prev.kind<>p_kind THEN RAISE EXCEPTION 'BOOK_EVENT_REPLAY_MISMATCH'; END IF;
  RETURN jsonb_build_object('ok',true,'duplicate',true,'status',r.status);
 END IF;
 IF p_kind='paid' THEN
  IF r.status NOT IN ('prepared','checkout_created','paid')
   OR p_session !~ '^cs_live_[A-Za-z0-9_]+$' OR p_pi !~ '^pi_[A-Za-z0-9_]+$'
   OR p_price IS DISTINCT FROM r.price_id OR p_amount IS DISTINCT FROM r.quoted_amount_cents
   OR (r.stripe_session_id IS NOT NULL AND r.stripe_session_id<>p_session)
   OR (r.stripe_payment_intent_id IS NOT NULL AND r.stripe_payment_intent_id<>p_pi)
  THEN RAISE EXCEPTION 'BOOK_PAID_PROOF_MISMATCH'; END IF;
  UPDATE public.gu_book_live_intents_v1 SET status='paid',
   stripe_session_id=p_session,stripe_payment_intent_id=p_pi,
   paid_at=coalesce(paid_at,now()),updated_at=now() WHERE id=p_id;
 ELSIF p_kind IN ('refunded','disputed') THEN
  IF r.status NOT IN ('paid','refunded','disputed') OR
   p_pi IS DISTINCT FROM r.stripe_payment_intent_id OR p_pi !~ '^pi_[A-Za-z0-9_]+$'
  THEN RAISE EXCEPTION 'BOOK_REVERSAL_PROOF_MISMATCH'; END IF;
  UPDATE public.gu_book_live_intents_v1 SET
   status=CASE WHEN status='disputed' THEN 'disputed' ELSE p_kind END,
   reversed_at=coalesce(reversed_at,now()),updated_at=now() WHERE id=p_id;
 ELSE
  IF r.status NOT IN ('prepared','checkout_created','expired','failed')
  THEN RAISE EXCEPTION 'BOOK_TERMINAL_EVENT_INVALID'; END IF;
  UPDATE public.gu_book_live_intents_v1 SET status=p_kind,updated_at=now() WHERE id=p_id;
 END IF;
 INSERT INTO public.gu_book_live_events_v1(event_id,intent_id,kind) VALUES(p_event,p_id,p_kind);
 RETURN jsonb_build_object('ok',true,'duplicate',false,
 'status',(SELECT status FROM public.gu_book_live_intents_v1 WHERE id=p_id));
END $fn$;
-- A member has LIVE eBook ownership ONLY after a provider-verified signed webhook.
CREATE OR REPLACE FUNCTION public.gu_book_live_paid_owned_v1(p_code text,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.gu_book_live_intents_v1 b
  WHERE b.user_id=p_user AND b.product_code=p_code AND b.status='paid'
   AND b.paid_at IS NOT NULL AND b.stripe_payment_intent_id IS NOT NULL
   AND b.stripe_session_id IS NOT NULL);
$fn$;
-- Preserve all existing Lemon Squeezy/legacy paid ownership and add verified Stripe LIVE books.
CREATE OR REPLACE FUNCTION public.gu_digital_paid_owned_v01430(p_code text,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT EXISTS(
 SELECT 1 FROM public.site_orders o
 JOIN public.checkout_intents i ON i.intent_id=(o.metadata->>'intent')
   AND i.user_id=o.user_id AND i.status='paid'
 JOIN public.site_order_items oi ON oi.order_id=o.id
 WHERE o.user_id=p_user AND o.provider='LEMON_SQUEEZY' AND o.status='paid'
   AND o.paid_at IS NOT NULL AND o.total_cents>0
   AND i.item_type='book' AND i.item_code=p_code
   AND oi.product_code=p_code AND coalesce(i.metadata->>'format','')='digital'
 ) OR public.gu_book_live_paid_owned_v1(p_code,p_user);
$fn$;
REVOKE ALL ON FUNCTION public.gu_book_live_reserve_v1(uuid,text,text,integer),
 public.gu_book_live_bind_v1(uuid,text),
 public.gu_book_live_apply_v1(text,uuid,text,text,text,text,integer),
 public.gu_book_live_paid_owned_v1(text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_book_live_reserve_v1(uuid,text,text,integer),
 public.gu_book_live_bind_v1(uuid,text),
 public.gu_book_live_apply_v1(text,uuid,text,text,text,text,integer)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_digital_paid_owned_v01430(text,uuid)
 TO service_role;
-- Allow an authorized Stripe Managed eBook sale to save WITHOUT a fictitious
-- Lemon Squeezy variant. The live Stripe Price is separately verified by the
-- strict Cloudflare quote/create path; rights dates and asset checks remain.
CREATE OR REPLACE FUNCTION public.gu_owner_digital_books_save_v01430(
 p_code text,p_kdp_select boolean,p_exclusive_until timestamptz,
 p_sales boolean,p_downloads boolean,p_rights_attested boolean,
 p_asset_path text,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid; book public.catalog_products%rowtype; path text;
BEGIN
 u:=public.gu_digital_owner_guard_v01430();
 IF p_code !~ '^[A-Z0-9_]{3,90}
-- gu_digital_book_can_download_v01430 now recognize signed Stripe LIVE ownership.
NOTIFY pgrst,'reload schema';
COMMIT;
 OR p_expected_updated_at IS NULL OR
    p_kdp_select IS NULL OR p_sales IS NULL OR p_downloads IS NULL
 THEN RAISE EXCEPTION 'INVALID_DIGITAL_CONFIGURATION'; END IF;
 SELECT * INTO book FROM public.catalog_products
 WHERE product_code=p_code AND product_type='book' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOOK_NOT_FOUND'; END IF;
 IF book.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RAISE EXCEPTION 'DIGITAL_SETTINGS_STALE'; END IF;
 path:=nullif(btrim(coalesce(p_asset_path,'')),'');
 IF path IS NOT NULL AND (path !~ '^[A-Z0-9_]{3,90}/[a-f0-9-]{36}[.](epub|pdf)
-- gu_digital_book_can_download_v01430 now recognize signed Stripe LIVE ownership.
NOTIFY pgrst,'reload schema';
COMMIT;
 OR
    split_part(path,'/',1)<>p_code OR NOT EXISTS (
     SELECT 1 FROM storage.objects o WHERE o.bucket_id='gu-digital-ebooks' AND o.name=path))
 THEN RAISE EXCEPTION 'PRIVATE_ASSET_NOT_VERIFIED'; END IF;
 IF p_sales OR p_downloads THEN
    IF p_kdp_select OR p_rights_attested IS DISTINCT FROM true OR
       p_exclusive_until IS NULL OR p_exclusive_until>now()
    THEN RAISE EXCEPTION 'KDP_EXCLUSIVITY_OR_RIGHTS_NOT_CLEARED'; END IF;
 END IF;
 IF (p_sales OR p_downloads) AND path IS NULL THEN RAISE EXCEPTION 'PRIVATE_EPUB_PDF_REQUIRED'; END IF;
 IF p_sales AND NOT p_downloads THEN RAISE EXCEPTION 'DIGITAL_SALE_REQUIRES_DOWNLOAD_FULFILLMENT'; END IF;
 IF p_sales AND (
   CASE WHEN (SELECT s.value FROM public.site_settings s
      WHERE s.setting_key='commerce.provider') = '"STRIPE_MANAGED"'::jsonb
   THEN p_code<>'FOUNDATION_BOOK_1'
      OR (book.metadata->'website_price_by_format_cents_v135'->>'digital') IS DISTINCT FROM '1099'
   ELSE nullif(book.metadata->'checkout_variants_v135'->>'digital','') IS NULL
      OR (book.metadata->'website_price_by_format_cents_v135'->>'digital') IS NULL
   END
 ) THEN
    RAISE EXCEPTION 'DIGITAL_PROVIDER_VARIANT_AND_PRICE_REQUIRED'; END IF;
 INSERT INTO public.gu_digital_books_v01430(product_code,sales_enabled,downloads_enabled,
 exclusive_until,rights_attested_at,rights_attested_by,asset_path,updated_by)
 VALUES(p_code,p_sales,p_downloads,p_exclusive_until,
    CASE WHEN p_rights_attested THEN now() ELSE NULL END,
    CASE WHEN p_rights_attested THEN u ELSE NULL END,path,u)
 ON CONFLICT(product_code) DO UPDATE SET
  sales_enabled=EXCLUDED.sales_enabled,downloads_enabled=EXCLUDED.downloads_enabled,
  exclusive_until=EXCLUDED.exclusive_until,rights_attested_at=EXCLUDED.rights_attested_at,
  rights_attested_by=EXCLUDED.rights_attested_by,asset_path=EXCLUDED.asset_path,
  updated_at=now(),updated_by=u;
 UPDATE public.catalog_products SET
  kdp_select=p_kdp_select,direct_digital_enabled=p_sales,
  website_checkout_enabled=p_sales,updated_at=clock_timestamp(),updated_by=u
 WHERE product_code=p_code;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(u,'commerce.digital.controls.v01430','catalog_product',p_code,
 jsonb_build_object('previousKdpFlag',book.kdp_select,'newKdpFlag',p_kdp_select,
  'sales',p_sales,'downloads',p_downloads,'exclusiveUntil',p_exclusive_until,
  'assetPathConfigured',path IS NOT NULL,'rightsAttestation',p_rights_attested));
 RETURN jsonb_build_object('ok',true,'code',p_code);
END $fn$;

-- Existing private, rights-gated gu_my_digital_books_v01430 and
-- gu_digital_book_can_download_v01430 now recognize signed Stripe LIVE ownership.
NOTIFY pgrst,'reload schema';
COMMIT;
