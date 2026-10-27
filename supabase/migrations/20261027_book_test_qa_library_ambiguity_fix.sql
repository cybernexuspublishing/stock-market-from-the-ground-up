-- Fix ambiguous PL/pgSQL variable naming in isolated TEST ebook access.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_my_book_test_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE v_user uuid:=auth.uid(); books jsonb;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.gu_book_test_qa_v1 q
   JOIN public.profiles p ON p.id=q.user_id LEFT JOIN public.admin_user_flags f ON f.user_id=q.user_id
   WHERE q.user_id=v_user AND q.enabled AND p.account_kind='member' AND p.deleted_at IS NULL
   AND coalesce(f.status,'active')='active')
 THEN RETURN jsonb_build_object('ok',true,'books','[]'::jsonb); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',b.product_code,'format','epub','title',cp.title,'testOnly',true)),'[]'::jsonb)
 INTO books
 FROM (SELECT DISTINCT product_code FROM public.gu_book_test_intents_v1 WHERE user_id=v_user AND status='paid') b
 JOIN public.catalog_products cp ON cp.product_code=b.product_code
 WHERE EXISTS(SELECT 1 FROM public.gu_digital_versions_v014303 v
  JOIN storage.objects s ON s.bucket_id='gu-digital-ebooks' AND s.name=v.asset_path
  WHERE v.product_code=b.product_code AND v.format='epub' AND v.current);
 RETURN jsonb_build_object('ok',true,'books',books);
END $fn$;

CREATE OR REPLACE FUNCTION public.gu_book_test_file_v1(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE v_user uuid:=auth.uid(); fpath text;
BEGIN
 IF v_user IS NULL OR p_code<>'FOUNDATION_BOOK_1'
 OR NOT EXISTS(SELECT 1 FROM public.gu_book_test_qa_v1 q JOIN public.profiles p ON p.id=q.user_id
  LEFT JOIN public.admin_user_flags f ON f.user_id=q.user_id
  WHERE q.user_id=v_user AND q.enabled AND p.account_kind='member' AND p.deleted_at IS NULL
   AND coalesce(f.status,'active')='active')
 OR NOT EXISTS(SELECT 1 FROM public.gu_book_test_intents_v1
  WHERE user_id=v_user AND product_code=p_code AND status='paid')
 THEN RETURN jsonb_build_object('allowed',false); END IF;
 SELECT v.asset_path INTO fpath FROM public.gu_digital_versions_v014303 v
 JOIN storage.objects s ON s.name=v.asset_path AND s.bucket_id='gu-digital-ebooks'
 WHERE v.product_code=p_code AND v.format='epub' AND v.current
 ORDER BY v.version DESC LIMIT 1;
 RETURN CASE WHEN fpath IS NULL THEN jsonb_build_object('allowed',false)
   ELSE jsonb_build_object('allowed',true,'path',fpath,'format','epub') END;
END $fn$;


COMMIT;