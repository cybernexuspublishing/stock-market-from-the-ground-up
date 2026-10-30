-- Extension to the existing Stripe LIVE book contract. Fail-closed; no
-- publishing permissions, prices or entitlements are activated here.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_book_live_reserve_v1(p_user uuid,p_code text,p_price text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE r public.gu_book_live_intents_v1%ROWTYPE;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'SERVICE_ONLY' USING ERRCODE='42501'; END IF;
 IF p_user IS NULL OR NOT EXISTS (
  SELECT 1 FROM (VALUES ('FOUNDATION_BOOK_1','price_1UVBsDJL0O4GGVBHdqAaP15z',1099),
      ('FOUNDATION_BOOK_2','price_1UVBsFJL0O4GGVBHP75QJV4N',1099),
      ('FOUNDATION_BOOK_3','price_1UVBsLJL0O4GGVBH37PPBw4s',1199),
      ('DAY_TRADING_BOOK_1','price_1UVBsPJL0O4GGVBH1cdsLBT3',1499),
      ('READING_THE_TAPE','price_1UVBsSJL0O4GGVBHjElhhG8W',1499)) AS offer(code,price,amount)
  WHERE offer.code=p_code AND offer.price=p_price AND offer.amount=p_amount
 )
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
  AND p.metadata->'website_price_by_format_cents_v135'->>'digital'=p_amount::text
  AND d.sales_enabled AND d.downloads_enabled AND d.rights_attested_at IS NOT NULL
  AND d.exclusive_until IS NOT NULL AND d.exclusive_until<=now()
  AND d.asset_path ~ ('^'||p_code||'/[a-f0-9-]{36}[.]epub
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
)
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
 IF p_sales AND (
   CASE WHEN (SELECT s.value FROM public.site_settings s
      WHERE s.setting_key='commerce.provider') = '"STRIPE_MANAGED"'::jsonb
   THEN NOT EXISTS (
      SELECT 1 FROM (VALUES ('FOUNDATION_BOOK_1','price_1UVBsDJL0O4GGVBHdqAaP15z',1099),
      ('FOUNDATION_BOOK_2','price_1UVBsFJL0O4GGVBHP75QJV4N',1099),
      ('FOUNDATION_BOOK_3','price_1UVBsLJL0O4GGVBH37PPBw4s',1199),
      ('DAY_TRADING_BOOK_1','price_1UVBsPJL0O4GGVBH1cdsLBT3',1499),
      ('READING_THE_TAPE','price_1UVBsSJL0O4GGVBHjElhhG8W',1499)) AS offer(code,price,amount)
      WHERE offer.code=p_code AND (book.metadata->'website_price_by_format_cents_v135'->>'digital')=offer.amount::text
     )
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


REVOKE ALL ON FUNCTION public.gu_book_live_reserve_v1(uuid,text,text,integer),
 public.gu_owner_digital_books_save_v01430(text,boolean,timestamptz,boolean,boolean,boolean,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_book_live_reserve_v1(uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_books_save_v01430(text,boolean,timestamptz,boolean,boolean,boolean,text,timestamptz) TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
