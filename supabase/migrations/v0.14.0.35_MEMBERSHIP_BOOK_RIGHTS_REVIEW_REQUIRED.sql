-- Cyber Nexus / The Stock Market: From the Ground Up
-- v0.14.0.35 | STAGING-REVIEW REQUIRED | explicitly approved membership benefits.
-- NO payment activation, no ebook file publication, no KDP Select flag changes.
-- REVIEW impact on pre-existing purchases before production execution.
BEGIN;
DO $guard$ BEGIN
 IF to_regclass('public.platform_plans') IS NULL
 OR to_regclass('public.user_plan_grants') IS NULL
 OR to_regclass('public.site_subscriptions') IS NULL
 OR to_regclass('public.catalog_products') IS NULL
 OR to_regclass('public.gu_digital_books_v01430') IS NULL
 OR to_regclass('public.user_plan_grants') IS NULL
 OR to_regclass('public.profiles') IS NULL
 OR to_regclass('public.admin_user_flags') IS NULL
 OR to_regclass('public.admin_user_roles') IS NULL
 OR to_regclass('storage.objects') IS NULL
 OR to_regprocedure('public.gu_digital_paid_owned_v01430(text,uuid)') IS NULL
 OR to_regprocedure('public.gu_digital_book_can_download_v01430(text)') IS NULL
 OR to_regprocedure('public.gu_my_digital_books_v01430()') IS NULL
 THEN RAISE EXCEPTION 'V01435_MISSING_PREREQUISITES'; END IF;
 IF (SELECT count(*) FROM public.platform_plans WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','PICK_WHAT_YOU_WANT')) <> 4
 THEN RAISE EXCEPTION 'V01435_MISSING_CANONICAL_PLANS'; END IF;
 IF (SELECT count(*) FROM public.catalog_products WHERE product_type='book' AND product_code IN
  ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE')) <> 5
 THEN RAISE EXCEPTION 'V01435_MISSING_FIVE_CANONICAL_BOOKS'; END IF;
END $guard$;

-- Only approved plan benefit and marketing-language fields are updated.
-- Do not change price, paid orders, provider routing, or checkout enablement.
UPDATE public.platform_plans SET
 includes_all_books=true,
 description='Full access to released first-party educational tools and all first-party book companion learning materials while the membership is active. Complete downloadable eBooks are sold separately. Monthly billing renews until canceled.',
 updated_at=now()
 WHERE plan_code='FULL_MONTHLY';
UPDATE public.platform_plans SET
 includes_all_books=true,
 description='Full access to released first-party educational tools and all first-party book companion learning materials while the membership is active. Complete downloadable eBooks are sold separately. Annual billing renews until canceled.',
 updated_at=now()
 WHERE plan_code='FULL_ANNUAL';
UPDATE public.platform_plans SET
 description='A one-time purchase of first-party platform access for as long as the platform operates and the account remains active and in good standing, subject to published Terms. Includes first-party book companions and the five designated downloadable eBooks only when their digital distribution rights permit. No guarantee of indefinite platform operation or third-party services.',
 metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{lifetime_designated_ebooks_v01435}',
 '["FOUNDATION_BOOK_1","FOUNDATION_BOOK_2","FOUNDATION_BOOK_3","DAY_TRADING_BOOK_1","READING_THE_TAPE"]'::jsonb,true),
 updated_at=now()
 WHERE plan_code='LIFETIME';
-- Pick What You Want is FREE to join; members independently purchase selected tools.
-- It MUST NOT grant full tools or book downloads automatically.
UPDATE public.platform_plans SET
 public_visible=true,
 includes_all_tools=false,
 includes_all_books=false,
 checkout_enabled=false,
 description='Choose only the released tools and services you want instead of a full membership. No base membership charge; each selected tool is billed separately and can be managed independently. Complete eBooks are separate purchases.',
 updated_at=now()
 WHERE plan_code='PICK_WHAT_YOU_WANT';

-- Approved proposed website eBook list prices (cents), prepared only.
-- Existing administrator-entered prices are preserved. Do NOT change KDP Select,
-- rights attestations, ebook asset, checkout_enabled, direct_digital_enabled, or sales status.
WITH desired(code,cents) AS (VALUES
 ('FOUNDATION_BOOK_1',999),('FOUNDATION_BOOK_2',1099),
 ('FOUNDATION_BOOK_3',1199),('DAY_TRADING_BOOK_1',1499),('READING_THE_TAPE',1499))
UPDATE public.catalog_products p SET
 metadata=jsonb_set(coalesce(p.metadata,'{}'::jsonb),'{website_price_by_format_cents_v135}',
     coalesce(p.metadata->'website_price_by_format_cents_v135','{}'::jsonb) || jsonb_build_object('digital',d.cents),true),
 updated_at=now()
FROM desired d WHERE p.product_code=d.code AND p.product_type='book'
 AND (p.metadata->'website_price_by_format_cents_v135'->>'digital') IS NULL;

-- Lifetime eBook eligibility is a narrow, account-bound benefit; no broad access
-- merely for being OWNER, a free trial, a book key, or a paid Full Monthly/Annual plan.
CREATE OR REPLACE FUNCTION public.gu_lifetime_ebook_eligible_v01435(p_user uuid,p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT p_user IS NOT NULL
 AND p_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
                'DAY_TRADING_BOOK_1','READING_THE_TAPE')
 AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=p_user AND p.account_kind='member')
 AND NOT EXISTS (SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_user
   AND lower(f.status) IN ('restricted','suspended'))
 AND NOT EXISTS (SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_user
   AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 AND (
   EXISTS (SELECT 1 FROM public.user_plan_grants g
     WHERE g.user_id=p_user AND g.plan_code='LIFETIME' AND g.status='active'
     AND g.starts_at<=now() AND (g.ends_at IS NULL OR g.ends_at>now()))
   OR EXISTS (SELECT 1 FROM public.site_subscriptions s
     WHERE s.user_id=p_user AND s.plan_code='LIFETIME' AND s.status='active'
     AND (s.current_period_end IS NULL OR s.current_period_end>now()))
 );
$fn$;
REVOKE ALL ON FUNCTION public.gu_lifetime_ebook_eligible_v01435(uuid,text)
 FROM PUBLIC,anon,authenticated;

-- Unlike the previous paid-only check, this checks verified paid order OR qualifying
-- Lifetime grant. Both remain subordinate to live ebook distribution-rights controls.
CREATE OR REPLACE FUNCTION public.gu_digital_book_can_download_v01430(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); p record; eligible boolean;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles pr WHERE pr.id=u AND pr.account_kind='member') OR
    EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=u
      AND lower(f.status) IN ('restricted','suspended')) OR
    EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u
      AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('allowed',false,'reason','account_ineligible'); END IF;
 SELECT cp.kdp_select,cp.active,d.* INTO p FROM public.catalog_products cp
 JOIN public.gu_digital_books_v01430 d ON d.product_code=cp.product_code
 WHERE cp.product_code=p_code AND cp.product_type='book';
 IF NOT FOUND OR p.kdp_select OR NOT p.downloads_enabled OR
    p.exclusive_until IS NULL OR p.exclusive_until>now() OR
    p.rights_attested_at IS NULL OR p.asset_path IS NULL OR NOT p.active OR
    NOT EXISTS(SELECT 1 FROM storage.objects so
      WHERE so.bucket_id='gu-digital-ebooks' AND so.name=p.asset_path)
 THEN RETURN jsonb_build_object('allowed',false,'reason','rights_or_file_unavailable'); END IF;
 eligible:=public.gu_digital_paid_owned_v01430(p_code,u)
      OR public.gu_lifetime_ebook_eligible_v01435(u,p_code);
 IF NOT eligible THEN RETURN jsonb_build_object('allowed',false,'reason','no_digital_purchase_or_lifetime_membership'); END IF;
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
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'code',p.product_code,'title',p.title,
   'accessSource',CASE WHEN public.gu_digital_paid_owned_v01430(p.product_code,u)
        THEN 'purchased' ELSE 'lifetime' END,
   'downloadEnabled',coalesce(d.downloads_enabled,false) AND NOT p.kdp_select
     AND p.active AND d.exclusive_until<=now() AND d.rights_attested_at IS NOT NULL
     AND d.asset_path IS NOT NULL
     AND EXISTS(SELECT 1 FROM storage.objects s
        WHERE s.bucket_id='gu-digital-ebooks' AND s.name=d.asset_path)
 ) ORDER BY p.title),'[]'::jsonb) INTO data
 FROM public.catalog_products p
 LEFT JOIN public.gu_digital_books_v01430 d ON d.product_code=p.product_code
 WHERE p.product_type='book'
 AND (public.gu_digital_paid_owned_v01430(p.product_code,u)
      OR public.gu_lifetime_ebook_eligible_v01435(u,p.product_code))
 AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id=u AND pr.account_kind='member')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=u
  AND lower(f.status) IN ('restricted','suspended'))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u
  AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()));
 RETURN jsonb_build_object('ok',true,'books',data);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_my_digital_books_v01430() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_my_digital_books_v01430() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
