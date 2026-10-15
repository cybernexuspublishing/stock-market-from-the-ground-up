-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.28
-- STAGING / OWNER REVIEW REQUIRED. Do not run automatically in production.
-- Enables owner-controlled paperback/hardcover Lulu Direct checkout URLs.
-- No payment, shipment, tax, download, user data or existing catalog rows are created.
-- Actual purchases are processed & fulfilled by Lulu Direct outside this database.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.catalog_products') IS NULL OR
    to_regclass('public.profiles') IS NULL OR
    to_regclass('public.admin_user_roles') IS NULL OR
    to_regclass('public.admin_user_flags') IS NULL OR
    to_regclass('public.admin_audit_log') IS NULL OR
    to_regprocedure('auth.uid()') IS NULL OR
    to_regprocedure('auth.jwt()') IS NULL THEN
   RAISE EXCEPTION 'v01428 missing required catalog/identity/audit objects';
 END IF;
 IF EXISTS (SELECT 1 FROM (VALUES
  ('catalog_products','product_code'),('catalog_products','product_type'),
  ('catalog_products','title'),('catalog_products','metadata'),
  ('catalog_products','direct_physical_enabled'),('catalog_products','updated_at'),
  ('profiles','id'),('profiles','account_kind'),
  ('admin_user_roles','user_id'),('admin_user_roles','role_code'),('admin_user_roles','expires_at'),
  ('admin_user_flags','user_id'),('admin_user_flags','status'),
  ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
  ('admin_audit_log','target_type'),('admin_audit_log','target_id'),
  ('admin_audit_log','details')
 ) AS required(t,c) WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns i
  WHERE i.table_schema='public' AND i.table_name=required.t AND i.column_name=required.c
 )) THEN RAISE EXCEPTION 'v01428 required database columns are missing'; END IF;
 -- Public browser roles must not have a direct UPDATE bypass for payment links.
 IF has_table_privilege('anon','public.catalog_products','UPDATE') OR
    has_table_privilege('authenticated','public.catalog_products','UPDATE') THEN
   RAISE EXCEPTION 'v01428 direct catalog UPDATE grant needs independent RLS/role review';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns i
   WHERE i.table_schema='public' AND i.table_name='catalog_products'
    AND i.column_name='metadata' AND i.udt_name='jsonb') THEN
   RAISE EXCEPTION 'v01428 catalog_products.metadata must be jsonb';
 END IF;
END $guard$;

-- Helper is private to these RPCs; never grant direct EXECUTE to browser roles.
CREATE OR REPLACE FUNCTION public.gu_print_owner_guard_v01428()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid := auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member'
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor
    AND lower(f.status) IN ('restricted','suspended')
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=actor
    AND r.role_code='SHOWCASE_VIEWER'
    AND (r.expires_at IS NULL OR r.expires_at>now())
 ) OR NOT EXISTS (
   SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=actor
    AND r.role_code='OWNER'
    AND (r.expires_at IS NULL OR r.expires_at>now())
 ) THEN RAISE EXCEPTION 'OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN actor;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_print_owner_guard_v01428() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gu_owner_print_catalog_get_v01428()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; products jsonb;
BEGIN
 actor := public.gu_print_owner_guard_v01428();
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'productCode',p.product_code,'title',p.title,'type',p.product_type,
    'updatedAt',p.updated_at,
    'printEnabled',coalesce(p.direct_physical_enabled,false),
    'paperback',coalesce(p.metadata->'print_checkout_links_v01428'->>'paperback',''),
    'hardcover',coalesce(p.metadata->'print_checkout_links_v01428'->>'hardcover','')
   ) ORDER BY p.title,p.product_code),'[]'::jsonb)
 INTO products FROM public.catalog_products p WHERE p.product_type='book';
 RETURN jsonb_build_object('ok',true,'products',products);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_print_catalog_get_v01428() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_print_catalog_get_v01428() TO authenticated;

-- Every metadata change and corresponding audit record are part of ONE transaction.
-- Optimistic lock prevents two Owner tabs silently overwriting each other.
CREATE OR REPLACE FUNCTION public.gu_owner_print_catalog_save_v01428(
 p_product_code text,p_paperback text,p_hardcover text,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; original public.catalog_products%ROWTYPE;
 paperback text:=btrim(coalesce(p_paperback,''));
 hardcover text:=btrim(coalesce(p_hardcover,''));
 modified timestamptz; links jsonb;
BEGIN
 actor := public.gu_print_owner_guard_v01428();
 -- Payment-destination changes are high risk: verify phishing-resistant staff MFA
 -- gate against the authenticated Supabase JWT, never a browser-provided flag.
 IF coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN
   RAISE EXCEPTION 'OWNER_MFA_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_expected_updated_at IS NULL OR p_product_code IS NULL OR
    p_product_code !~ '^[A-Z0-9_]{3,90}$' OR
    length(paperback)>1800 OR length(hardcover)>1800 THEN
   RAISE EXCEPTION 'INVALID_PRINT_CHANNEL' USING ERRCODE='22023'; END IF;
 -- Lulu Direct is a print-specific checkout processor; never route print through
 -- Lemon Squeezy, which does not permit physical goods.
 IF (paperback<>'' AND paperback !~* '^https://([a-z0-9-]+\.)*lulu\.com(:443)?([/?#]|$)') OR
    (hardcover<>'' AND hardcover !~* '^https://([a-z0-9-]+\.)*lulu\.com(:443)?([/?#]|$)') THEN
   RAISE EXCEPTION 'ONLY_LULU_HTTPS_LINKS' USING ERRCODE='22023'; END IF;
 SELECT * INTO original FROM public.catalog_products
  WHERE product_code=p_product_code AND product_type='book' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PRINT_TITLE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF original.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RAISE EXCEPTION 'PRINT_LINKS_STALE' USING ERRCODE='40001'; END IF;
 links := jsonb_build_object('paperback',paperback,'hardcover',hardcover);
 UPDATE public.catalog_products
 SET metadata=jsonb_set(coalesce(original.metadata,'{}'::jsonb),
    '{print_checkout_links_v01428}',links,true),
     direct_physical_enabled=(paperback<>'' OR hardcover<>''),
     updated_at=clock_timestamp()
 WHERE product_code=p_product_code AND product_type='book'
 RETURNING updated_at INTO modified;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.print.channels.v01428','catalog_product',p_product_code,
   jsonb_build_object('old',coalesce(original.metadata->'print_checkout_links_v01428','{}'::jsonb),
      'new',links,'previousEnabled',original.direct_physical_enabled,
      'newEnabled',(paperback<>'' OR hardcover<>''),'version','v0.14.0.28'));
 RETURN jsonb_build_object('ok',true,'productCode',p_product_code,
    'updatedAt',modified,'printEnabled',(paperback<>'' OR hardcover<>''));
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_print_catalog_save_v01428(text,text,text,timestamptz)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_print_catalog_save_v01428(text,text,text,timestamptz)
 TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
