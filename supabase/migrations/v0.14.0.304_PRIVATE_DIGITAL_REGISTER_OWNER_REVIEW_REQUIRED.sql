-- Owner-only file registration into v303. No publication or entitlement changes.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_owner_digital_register_v014304(
 p_code text,p_path text,p_expected_version integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $body$
DECLARE u uuid;fmt text;mime text;bytes bigint;prev integer;nextv integer;
BEGIN
 u:=public.gu_digital_owner_guard_v01430();
 IF NOT public.gu_staff_stepup_active_v01432r1()
 THEN RAISE EXCEPTION 'PASSWORD_RECONFIRM_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_code !~ '^[A-Z0-9_]{3,90}$' OR
    p_path !~ '^[A-Z0-9_]{3,90}/[a-f0-9-]{36}[.](pdf|epub)$' OR
    split_part(p_path,'/',1)<>p_code
 THEN RAISE EXCEPTION 'INVALID_ASSET_PATH';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.catalog_products
 WHERE product_code=p_code AND product_type='book')
 THEN RAISE EXCEPTION 'NOT_A_BOOK';END IF;
 fmt:=split_part(p_path,'.',2);
 mime:=CASE WHEN fmt='pdf' THEN 'application/pdf' ELSE 'application/epub+zip' END;
 SELECT CASE WHEN metadata->>'size' ~ '^[0-9]{1,10}$'
 THEN (metadata->>'size')::bigint ELSE NULL END INTO bytes
 FROM storage.objects WHERE bucket_id='gu-digital-ebooks'
 AND name=p_path AND metadata->>'mimetype'=mime;
 IF NOT FOUND OR bytes IS NULL OR bytes<1 OR bytes>52428800
 THEN RAISE EXCEPTION 'FILE_TYPE_OR_SIZE_UNVERIFIED';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_code||':'||fmt,303));
 SELECT version INTO prev FROM public.gu_digital_versions_v014303
 WHERE product_code=p_code AND format=fmt AND current FOR UPDATE;
 IF p_expected_version IS NOT NULL AND p_expected_version<>coalesce(prev,0)
 THEN RAISE EXCEPTION 'STALE_EDITION_VERSION';END IF;
 SELECT coalesce(max(version),0)+1 INTO nextv
 FROM public.gu_digital_versions_v014303
 WHERE product_code=p_code AND format=fmt;
 UPDATE public.gu_digital_versions_v014303 SET current=false,replaced_at=now()
 WHERE product_code=p_code AND format=fmt AND current;
 INSERT INTO public.gu_digital_versions_v014303
  (product_code,format,version,asset_path,bytes,created_by)
 VALUES(p_code,fmt,nextv,p_path,bytes,u);
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(u,'commerce.digital.edition.register','catalog_product',p_code,
 jsonb_build_object('format',fmt,'version',nextv,'path',p_path,'bytes',bytes));
 RETURN jsonb_build_object('ok',true,'format',fmt,'version',nextv,
  'publicationUnchanged',true);
END $body$;
REVOKE ALL ON FUNCTION public.gu_owner_digital_register_v014304(text,text,integer)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_register_v014304(text,text,integer)
 TO authenticated;
CREATE OR REPLACE FUNCTION public.gu_owner_digital_history_v014304(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $body$
DECLARE actor uuid;history jsonb;
BEGIN
 actor:=public.gu_digital_owner_guard_v01430();
 IF NOT public.gu_staff_stepup_active_v01432r1()
 THEN RAISE EXCEPTION 'PASSWORD_RECONFIRM_REQUIRED' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'format',v.format,'version',v.version,'path',v.asset_path,
   'bytes',v.bytes,'current',v.current,'createdAt',v.created_at,
   'replacedAt',v.replaced_at,'fileExists',
    EXISTS(SELECT 1 FROM storage.objects o
      WHERE o.bucket_id='gu-digital-ebooks' AND o.name=v.asset_path))
   ORDER BY v.format,v.version DESC),'[]'::jsonb) INTO history
 FROM public.gu_digital_versions_v014303 v WHERE v.product_code=p_code;
 RETURN jsonb_build_object('ok',true,'versions',history);
END $body$;
REVOKE ALL ON FUNCTION public.gu_owner_digital_history_v014304(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_digital_history_v014304(text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
