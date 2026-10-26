-- Format-specific download selection; current purchased/Lifetime entitlement and
-- rights checks are always resolved by gu_digital_book_can_download_v01430.
-- This does not grant additional rights or change the legacy primary asset.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_digital_format_path_v014305(
 p_code text,p_format text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE authz jsonb;chosen text;primary_path text;
BEGIN
 IF p_code IS NULL OR p_code !~ '^[A-Z0-9_]{3,90}$' OR
 p_format IS NULL OR p_format NOT IN ('pdf','epub')
 THEN RETURN jsonb_build_object('allowed',false,'reason','invalid_format');END IF;
 authz:=public.gu_digital_book_can_download_v01430(p_code);
 IF coalesce(authz->>'allowed','false')<>'true'
 THEN RETURN jsonb_build_object('allowed',false,'reason','rights_or_purchase_unavailable');END IF;
 SELECT v.asset_path INTO chosen FROM public.gu_digital_versions_v014303 v
 WHERE v.product_code=p_code AND v.format=p_format AND v.current
 AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='gu-digital-ebooks'
 AND o.name=v.asset_path);
 primary_path:=authz->>'path';
 IF chosen IS NULL AND right(primary_path,length(p_format)+1)='.'||p_format
 THEN chosen:=primary_path;END IF;
 IF chosen IS NULL THEN
 RETURN jsonb_build_object('allowed',false,'reason','format_not_available');END IF;
 RETURN jsonb_build_object('allowed',true,'path',chosen,'format',p_format);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_digital_format_path_v014305(text,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_digital_format_path_v014305(text,text)
 TO authenticated;
CREATE OR REPLACE FUNCTION public.gu_digital_formats_v014305(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE a jsonb;v jsonb;
BEGIN
 a:=public.gu_digital_book_can_download_v01430(p_code);
 IF coalesce(a->>'allowed','false')<>'true'
 THEN RETURN jsonb_build_object('ok',true,'formats','[]'::jsonb);END IF;
 SELECT coalesce(jsonb_agg(x.fmt ORDER BY x.fmt),'[]'::jsonb) INTO v
 FROM (SELECT DISTINCT fmt FROM (
  SELECT format fmt FROM public.gu_digital_versions_v014303 d
  WHERE d.product_code=p_code AND d.current
  AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='gu-digital-ebooks'
    AND o.name=d.asset_path)
  UNION ALL
  SELECT CASE WHEN right(a->>'path',4)='.pdf' THEN 'pdf'
              WHEN right(a->>'path',5)='.epub' THEN 'epub' ELSE NULL END
 ) q WHERE fmt IS NOT NULL) x;
 RETURN jsonb_build_object('ok',true,'formats',v);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_digital_formats_v014305(text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_digital_formats_v014305(text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
