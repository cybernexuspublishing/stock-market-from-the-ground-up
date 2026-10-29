-- Owner may read released licensed digital books without a paid purchase.
-- All original rights, KDP, attestation, asset, active and account checks stay.
BEGIN;
DO $owner$
DECLARE definition text;needle text;replacement text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='gu_digital_book_can_download_v01430'
 AND pg_get_function_identity_arguments(oid)='p_code text';
 IF definition IS NULL THEN RAISE EXCEPTION 'Book download guard missing';END IF;
 IF definition LIKE '%role_code=''OWNER''%OR public.gu_lifetime_ebook_eligible_v01435%' THEN
  RAISE EXCEPTION 'Unexpected book guard revision';END IF;
 needle:='OR public.gu_lifetime_ebook_eligible_v01435(u,p_code);';
 replacement:='OR public.gu_lifetime_ebook_eligible_v01435(u,p_code)'||
   E'\n      OR EXISTS(SELECT 1 FROM public.admin_user_roles own WHERE own.user_id=u'||
   E'\n       AND own.role_code=''OWNER'' AND (own.expires_at IS NULL OR own.expires_at>now()));';
 IF strpos(definition,needle)=0 OR strpos(definition,'rights_or_file_unavailable')=0
   OR strpos(definition,'p.kdp_select')=0 THEN
  RAISE EXCEPTION 'Rights checks changed; refusing Owner book patch';END IF;
 definition:=replace(definition,needle,replacement);
 EXECUTE definition;
END $owner$;
COMMIT;