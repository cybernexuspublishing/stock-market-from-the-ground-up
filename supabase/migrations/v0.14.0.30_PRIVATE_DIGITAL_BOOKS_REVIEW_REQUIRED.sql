-- The Stock Market: From the Ground Up — v0.14.0.30
-- STAGING FIRST / OWNER REVIEW REQUIRED. DOES NOT publish or sell any ebook.
-- Each published title begins with digital checkout/download disabled.
-- KDP Select remains active until the Owner verifies Amazon enrollment has actually ended.
BEGIN;
DO $preflight$ BEGIN
 IF to_regclass('public.catalog_products') IS NULL
    OR to_regclass('public.checkout_intents') IS NULL
    OR to_regclass('public.site_orders') IS NULL
    OR to_regclass('public.site_settings') IS NULL
    OR to_regclass('public.site_order_items') IS NULL
    OR to_regclass('public.admin_audit_log') IS NULL
    OR to_regclass('public.profiles') IS NULL
    OR to_regclass('public.admin_user_roles') IS NULL
    OR to_regclass('public.admin_user_flags') IS NULL
    OR to_regclass('storage.buckets') IS NULL
    OR to_regclass('storage.objects') IS NULL
 THEN RAISE EXCEPTION 'v014030 missing prerequisites — no changes permitted'; END IF;
 IF EXISTS(SELECT 1 FROM (VALUES
  ('catalog_products','product_code'),('catalog_products','product_type'),
  ('catalog_products','kdp_select'),('catalog_products','direct_digital_enabled'),
  ('catalog_products','website_checkout_enabled'),('catalog_products','sales_status'),
  ('catalog_products','store_visible'),('catalog_products','active'),
  ('catalog_products','updated_at'),('catalog_products','metadata'),
  ('site_orders','id'),('site_orders','user_id'),('site_orders','status'),
  ('site_orders','provider'),('site_orders','metadata'),('site_order_items','order_id'),
  ('site_order_items','product_code'),('checkout_intents','user_id'),
  ('checkout_intents','intent_id'),('checkout_intents','metadata'),
  ('checkout_intents','item_type'),('checkout_intents','item_code'),('checkout_intents','status'),
  ('profiles','id'),('profiles','account_kind'),
  ('admin_user_roles','user_id'),('admin_user_roles','role_code'),('admin_user_roles','expires_at'),
  ('admin_user_flags','user_id'),('admin_user_flags','status'),
  ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
  ('admin_audit_log','target_type'),('admin_audit_log','target_id'),('admin_audit_log','details')
 ) r(tab,col) WHERE NOT EXISTS (
 SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
 AND c.table_name=r.tab AND c.column_name=r.col))
 THEN RAISE EXCEPTION 'v014030 missing critical checkout/catalog/audit columns'; END IF;
END $preflight$;

CREATE TABLE IF NOT EXISTS public.gu_digital_books_v01430 (
 product_code text PRIMARY KEY REFERENCES public.catalog_products(product_code),
 sales_enabled boolean NOT NULL DEFAULT false,
 downloads_enabled boolean NOT NULL DEFAULT false,
 -- Observed Amazon KDP Select end time, subject to manual re-verification.
 exclusive_until timestamptz,
 rights_attested_at timestamptz,
 rights_attested_by uuid,
 asset_path text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid,
 CONSTRAINT gu_v01430_asset_path CHECK (asset_path IS NULL OR
   asset_path ~ ('^[A-Z0-9_]{3,90}/[a-f0-9-]{36}[.](epub|pdf)$'))
);
ALTER TABLE public.gu_digital_books_v01430 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_digital_books_v01430 FROM PUBLIC,anon,authenticated;

-- Dedicated private bucket. Existing public bucket configuration is not silently changed.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('gu-digital-ebooks','gu-digital-ebooks',false,52428800,
 ARRAY['application/epub+zip','application/pdf']) ON CONFLICT (id) DO NOTHING;
DO $bucketguard$ BEGIN
 IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='gu-digital-ebooks' AND public=true)
 THEN RAISE EXCEPTION 'DIGITAL_BUCKET_MUST_BE_PRIVATE'; END IF;
END $bucketguard$;

-- Owner-only uploaded originals. Anonymous/member roles get no Storage SELECT.
CREATE OR REPLACE FUNCTION public.gu_digital_upload_allowed_v01430()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT auth.uid() IS NOT NULL AND coalesce(auth.jwt()->>'aal','')='aal2'
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
 AND EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
 AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid()
 AND lower(f.status) IN ('restricted','suspended'))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
 AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()));
$fn$;
REVOKE ALL ON FUNCTION public.gu_digital_upload_allowed_v01430() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_digital_upload_allowed_v01430() TO authenticated;

DROP POLICY IF EXISTS "gu_v01430_owner_digital_upload" ON storage.objects;
CREATE POLICY "gu_v01430_owner_digital_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='gu-digital-ebooks'
 AND name ~ '^[A-Z0-9_]{3,90}/[a-f0-9-]{36}[.](epub|pdf)$'
 AND public.gu_digital_upload_allowed_v01430());
-- There is deliberately no member SELECT/UPDATE/DELETE storage policy.

CREATE OR REPLACE FUNCTION public.gu_digital_owner_guard_v01430()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL OR coalesce(auth.jwt()->>'aal','')<>'aal2' OR
    NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=u AND p.account_kind='member') OR
    NOT EXISTS (SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u
      AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now())) OR
    EXISTS (SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u
      AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now())) OR
    EXISTS (SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=u
      AND lower(f.status) IN ('restricted','suspended'))
 THEN RAISE EXCEPTION 'OWNER_AAL2_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN u;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_digital_owner_guard_v01430() FROM PUBLIC,anon,authenticated;

-- All controls are independently toggled. Turning off KDP Select on the WEBSITE
-- does not change Amazon's contractual enrollment. Owner must attest rights,
-- record a non-future exclusivity end, and complete Amazon unenrollment first.
CREATE OR REPLACE FUNCTION public.gu_owner_digital_books_get_v01430()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid; result jsonb;
BEGIN
 u:=public.gu_digital_owner_guard_v01430();
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'code',p.product_code,'title',p.title,'kdpSelect',p.kdp_select,
   'sales',coalesce(d.sales_enabled,false),'downloads',coalesce(d.downloads_enabled,false),
   'exclusiveUntil',d.exclusive_until,'rightsAttested',d.rights_attested_at IS NOT NULL,
   'asset',coalesce(d.asset_path,''),'version',p.updated_at,
   'fileExists',EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='gu-digital-ebooks' AND o.name=d.asset_path)
 ) ORDER BY p.title),'[]'::jsonb) INTO result FROM public.catalog_products p
 LEFT JOIN public.gu_digital_books_v01430 d ON d.product_code=p.product_code
 WHERE p.product_type='book';
 RETURN jsonb_build_object('ok',true,'products',result);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_digital_books_get_v01430() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_books_get_v01430() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_owner_digital_books_save_v01430(
 p_code text,p_kdp_select boolean,p_exclusive_until timestamptz,
 p_sales boolean,p_downloads boolean,p_rights_attested boolean,
 p_asset_path text,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid; book public.catalog_products%rowtype; path text;
BEGIN
 u:=public.gu_digital_owner_guard_v01430();
 IF p_code !~ '^[A-Z0-9_]{3,90}$' OR p_expected_updated_at IS NULL OR
    p_kdp_select IS NULL OR p_sales IS NULL OR p_downloads IS NULL
 THEN RAISE EXCEPTION 'INVALID_DIGITAL_CONFIGURATION'; END IF;
 SELECT * INTO book FROM public.catalog_products
 WHERE product_code=p_code AND product_type='book' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOOK_NOT_FOUND'; END IF;
 IF book.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RAISE EXCEPTION 'DIGITAL_SETTINGS_STALE'; END IF;
 path:=nullif(btrim(coalesce(p_asset_path,'')),'');
 IF path IS NOT NULL AND (path !~ '^[A-Z0-9_]{3,90}/[a-f0-9-]{36}[.](epub|pdf)$' OR
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
 IF p_sales AND (nullif(book.metadata->'checkout_variants_v135'->>'digital','') IS NULL OR
    (book.metadata->'website_price_by_format_cents_v135'->>'digital') IS NULL) THEN
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
REVOKE ALL ON FUNCTION public.gu_owner_digital_books_save_v01430(text,boolean,timestamptz,boolean,boolean,boolean,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_books_save_v01430(text,boolean,timestamptz,boolean,boolean,boolean,text,timestamptz) TO authenticated;

-- Public offer readiness checked again by Cloudflare BEFORE quote AND payment intent.
CREATE OR REPLACE FUNCTION public.gu_digital_offer_status_v01430(p_product_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT jsonb_build_object('available',EXISTS(
  SELECT 1 FROM public.catalog_products p
  JOIN public.gu_digital_books_v01430 d ON d.product_code=p.product_code
  WHERE p.product_code=p_product_code AND p.product_type='book'
   AND p.active AND p.store_visible AND p.sales_status='published'
   AND p.website_checkout_enabled AND p.direct_digital_enabled AND NOT p.kdp_select
   AND EXISTS(SELECT 1 FROM public.site_settings ss WHERE ss.setting_key='commerce.checkout_enabled' AND ss.value='true'::jsonb)
   AND d.sales_enabled AND d.downloads_enabled
   AND d.rights_attested_at IS NOT NULL AND d.exclusive_until<=now()
   AND d.asset_path IS NOT NULL AND EXISTS(
     SELECT 1 FROM storage.objects o WHERE o.bucket_id='gu-digital-ebooks' AND o.name=d.asset_path)
  ));
$fn$;
REVOKE ALL ON FUNCTION public.gu_digital_offer_status_v01430(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gu_digital_offer_status_v01430(text) TO anon,authenticated,service_role;


CREATE OR REPLACE FUNCTION public.gu_digital_public_catalog_v01430()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',p.product_code,'title',p.title)
  ORDER BY p.title),'[]'::jsonb)
 FROM public.catalog_products p WHERE p.product_type='book'
 AND (public.gu_digital_offer_status_v01430(p.product_code)->>'available')::boolean IS TRUE;
$fn$;
REVOKE ALL ON FUNCTION public.gu_digital_public_catalog_v01430() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gu_digital_public_catalog_v01430() TO anon,authenticated;

-- Buyer rights derived ONLY from already-paid, nonrefunded, signed-provider orders
-- matched to the digital checkout intent and item; never from the companion key,
-- Amazon external physical order, client-supplied order id, or subscription tier.
CREATE OR REPLACE FUNCTION public.gu_digital_paid_owned_v01430(p_code text,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT EXISTS(
 SELECT 1 FROM public.site_orders o
 JOIN public.checkout_intents i ON i.intent_id=(o.metadata->>'intent')
   AND i.user_id=o.user_id AND i.status='paid'
 JOIN public.site_order_items oi ON oi.order_id=o.id
 WHERE o.user_id=p_user AND o.provider='LEMON_SQUEEZY' AND o.status='paid'
   AND o.paid_at IS NOT NULL AND o.total_cents>0
   AND i.item_type='book' AND i.item_code=p_code
   AND oi.product_code=p_code AND coalesce(i.metadata->>'format','')='digital'
 );
$fn$;
REVOKE ALL ON FUNCTION public.gu_digital_paid_owned_v01430(text,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gu_digital_book_can_download_v01430(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); p record; allowed boolean;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles pr WHERE pr.id=u AND pr.account_kind='showcase') OR
    EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=u
      AND lower(f.status) IN ('restricted','suspended'))
    OR EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u
       AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('allowed',false,'reason','account_ineligible'); END IF;
 SELECT cp.kdp_select,cp.active,d.* INTO p FROM public.catalog_products cp
 JOIN public.gu_digital_books_v01430 d ON d.product_code=cp.product_code
 WHERE cp.product_code=p_code AND cp.product_type='book';
 IF NOT FOUND OR p.kdp_select OR NOT p.downloads_enabled OR
    p.exclusive_until IS NULL OR p.exclusive_until>now() OR
    p.rights_attested_at IS NULL OR p.asset_path IS NULL OR NOT p.active OR
    NOT EXISTS(SELECT 1 FROM storage.objects so WHERE so.bucket_id='gu-digital-ebooks' AND so.name=p.asset_path)
 THEN RETURN jsonb_build_object('allowed',false,'reason','rights_or_file_unavailable'); END IF;
 allowed:=public.gu_digital_paid_owned_v01430(p_code,u);
 IF NOT allowed THEN RETURN jsonb_build_object('allowed',false,'reason','no_verified_digital_purchase'); END IF;
 RETURN jsonb_build_object('allowed',true,'path',p.asset_path,'code',p_code);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_digital_book_can_download_v01430(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_digital_book_can_download_v01430(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_my_digital_books_v01430()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); data jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',p.product_code,'title',p.title,
  'downloadEnabled',coalesce(d.downloads_enabled,false) AND NOT p.kdp_select
  AND d.exclusive_until<=now() AND d.rights_attested_at IS NOT NULL
  AND d.asset_path IS NOT NULL
  AND EXISTS(SELECT 1 FROM storage.objects s WHERE s.bucket_id='gu-digital-ebooks' AND s.name=d.asset_path)
 ) ORDER BY p.title),'[]'::jsonb) INTO data
 FROM public.catalog_products p
 LEFT JOIN public.gu_digital_books_v01430 d ON d.product_code=p.product_code
 WHERE p.product_type='book' AND public.gu_digital_paid_owned_v01430(p.product_code,u)
 AND NOT EXISTS(SELECT 1 FROM public.profiles pr WHERE pr.id=u AND pr.account_kind='showcase')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=u AND lower(f.status) IN ('restricted','suspended'))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()));
 RETURN jsonb_build_object('ok',true,'books',data);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_my_digital_books_v01430() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_my_digital_books_v01430() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
