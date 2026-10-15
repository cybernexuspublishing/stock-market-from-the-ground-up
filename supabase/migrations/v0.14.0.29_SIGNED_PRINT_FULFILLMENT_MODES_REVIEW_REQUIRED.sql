-- Cyber Nexus / The Stock Market: From the Ground Up — v0.14.0.29
-- REVIEW REQUIRED — STAGING FIRST. This SQL is NOT run by a source ZIP upload.
-- Per-title SELLER OPTIONS ONLY. Does not create paid orders, order KDP author
-- copies, store shipping addresses, process payment, or grant digital downloads.
-- MANUAL SIGNED AUTHOR COPY is the Owner-preferred future fulfillment path.
-- Lulu is an independently Owner-controlled optional provider channel.
BEGIN;
DO $guard$
BEGIN
  IF to_regclass('public.catalog_products') IS NULL
    OR to_regclass('public.admin_audit_log') IS NULL
    OR to_regprocedure('public.gu_print_owner_guard_v01428()') IS NULL
    OR to_regprocedure('auth.jwt()') IS NULL THEN
    RAISE EXCEPTION 'v01429 missing required v01428 commerce/OWNER security infrastructure';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('catalog_products','product_code'),
      ('catalog_products','product_type'),('catalog_products','title'),
      ('catalog_products','metadata'),('catalog_products','updated_at'),
      ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
      ('admin_audit_log','target_type'),('admin_audit_log','target_id'),
      ('admin_audit_log','details')) AS required(t,c)
    WHERE NOT EXISTS(SELECT 1 FROM information_schema.columns x
      WHERE x.table_schema='public' AND x.table_name=required.t
        AND x.column_name=required.c)
  ) THEN RAISE EXCEPTION 'v01429 missing required commerce/audit columns'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='catalog_products'
      AND column_name='metadata' AND udt_name='jsonb') THEN
    RAISE EXCEPTION 'v01429 requires catalog_products.metadata jsonb';
  END IF;
  IF has_table_privilege('anon','public.catalog_products','UPDATE') OR
     has_table_privilege('authenticated','public.catalog_products','UPDATE') THEN
    RAISE EXCEPTION 'v01429: direct catalog UPDATE grants require a separate security review';
  END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.gu_owner_print_modes_get_v01429()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; products jsonb;
BEGIN
  actor := public.gu_print_owner_guard_v01428();
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'productCode',p.product_code, 'title',p.title,
    'updatedAt',p.updated_at,
    'signedAvailable',coalesce((p.metadata->'print_fulfillment_v01429'->>'signed_available')::boolean,false),
    'luluEnabled',coalesce(
      (p.metadata->'print_fulfillment_v01429'->>'lulu_enabled')::boolean,
      coalesce(p.direct_physical_enabled,false)),
    'hasPaperbackLulu',coalesce(nullif(p.metadata->'print_checkout_links_v01428'->>'paperback',''),'') <> '',
    'hasHardcoverLulu',coalesce(nullif(p.metadata->'print_checkout_links_v01428'->>'hardcover',''),'') <> ''
  ) ORDER BY p.title,p.product_code),'[]'::jsonb)
  INTO products FROM public.catalog_products p WHERE p.product_type='book';
  RETURN jsonb_build_object('ok',true,'products',products,
    'signedSalesCheckoutLive',false,
    'notice','Signed copy website payment and manual order queue are NOT active.');
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_print_modes_get_v01429() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_print_modes_get_v01429() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_owner_print_modes_save_v01429(
  p_product_code text,p_signed_available boolean,p_lulu_enabled boolean,
  p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; oldrow public.catalog_products%ROWTYPE;
  updated_at_value timestamptz; links jsonb; choice jsonb;
  paperback text; hardcover text;
BEGIN
  actor := public.gu_print_owner_guard_v01428();
  IF coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN
    RAISE EXCEPTION 'OWNER_MFA_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF p_product_code IS NULL OR p_product_code !~ '^[A-Z0-9_]{3,90}$'
     OR p_expected_updated_at IS NULL OR p_signed_available IS NULL
     OR p_lulu_enabled IS NULL THEN
    RAISE EXCEPTION 'INVALID_PRINT_MODE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO oldrow FROM public.catalog_products
    WHERE product_code=p_product_code AND product_type='book' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOK_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF oldrow.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'PRINT_SETTINGS_STALE_REFRESH' USING ERRCODE='40001'; END IF;
  links := coalesce(oldrow.metadata->'print_checkout_links_v01428','{}'::jsonb);
  paperback := coalesce(links->>'paperback','');
  hardcover := coalesce(links->>'hardcover','');
  IF p_lulu_enabled THEN
    IF paperback='' AND hardcover='' THEN
      RAISE EXCEPTION 'LULU_LINKS_REQUIRED' USING ERRCODE='22023'; END IF;
    IF (paperback<>'' AND paperback !~* '^https://([a-z0-9-]+\.)*lulu\.com(:443)?([/?#]|$)')
       OR (hardcover<>'' AND hardcover !~* '^https://([a-z0-9-]+\.)*lulu\.com(:443)?([/?#]|$)') THEN
      RAISE EXCEPTION 'INVALID_LULU_URL' USING ERRCODE='22023'; END IF;
  END IF;
  choice:=jsonb_build_object('signed_available',p_signed_available,
     'lulu_enabled',p_lulu_enabled,'default_fulfillment','manual_signed_kdp',
     'signed_checkout_live',false,'version','v0.14.0.29');
  UPDATE public.catalog_products
     SET metadata=jsonb_set(coalesce(oldrow.metadata,'{}'::jsonb),
       '{print_fulfillment_v01429}',choice,true),
       updated_at=clock_timestamp()
     WHERE product_code=p_product_code AND product_type='book'
     RETURNING updated_at INTO updated_at_value;
  INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
  VALUES(actor,'commerce.print.fulfillment.mode.v01429','catalog_product',p_product_code,
    jsonb_build_object('previous',coalesce(oldrow.metadata->'print_fulfillment_v01429','{}'::jsonb),
      'new',choice,'manualSignedPaymentReady',false));
  RETURN jsonb_build_object('ok',true,'productCode',p_product_code,'updatedAt',updated_at_value,
    'signedAvailable',p_signed_available,'luluEnabled',p_lulu_enabled,
    'signedCheckoutLive',false);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)
  TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
