-- v0.14.0.187 Founding Legacy privacy control remains accessible after cancellation.
CREATE OR REPLACE FUNCTION public.gu_founder_legacy_my_status_v014187()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $status$
DECLARE uid uuid:=auth.uid();n smallint;label text;
BEGIN
 IF uid IS NULL THEN RETURN jsonb_build_object('eligible',false);END IF;
 SELECT founder_number INTO n FROM public.gu_founder_members_v014173 WHERE user_id=uid AND revoked_at IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false);END IF;
 SELECT display_label INTO label FROM public.gu_founder_legacy_optins_v014186 WHERE user_id=uid;
 RETURN jsonb_build_object('eligible',true,'founderNumber',n,'visible',(label IS NOT NULL),
 'displayLabel',label,'canOptIn',public.gu_founder_commons_access_v014174('shared'));
END $status$;
REVOKE ALL ON FUNCTION public.gu_founder_legacy_my_status_v014187() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_legacy_my_status_v014187() TO authenticated;
