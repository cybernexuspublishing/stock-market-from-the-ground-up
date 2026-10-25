-- v0.14.0.186 Founders Legacy Wall: private opt-in display-name recognition only.
-- Original founding numbers are permanent; no manufactured achievements or public indexing.
CREATE TABLE IF NOT EXISTS public.gu_founder_legacy_optins_v014186(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_label text NOT NULL CHECK(length(display_label) BETWEEN 3 AND 36),
 consented_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_founder_legacy_optins_v014186 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_legacy_optins_v014186 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_founder_legacy_optins_v014186 TO service_role;
-- Deliberately no direct member SELECT. The list RPC exposes only consented labels
-- and founding numbers, not user IDs, emails, payment state or profile data.
CREATE OR REPLACE FUNCTION public.gu_founder_legacy_list_v014186()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $list$
DECLARE list_json jsonb;
BEGIN
 IF NOT public.gu_founder_commons_access_v014174('shared')
 THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_ACCESS_REQUIRED');END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'founderNumber',m.founder_number,'displayLabel',o.display_label)
 ORDER BY m.founder_number),'[]'::jsonb) INTO list_json
 FROM public.gu_founder_legacy_optins_v014186 o
 JOIN public.gu_founder_members_v014173 m ON m.user_id=o.user_id
 WHERE m.revoked_at IS NULL;
 RETURN jsonb_build_object('ok',true,'members',list_json);
END $list$;
REVOKE ALL ON FUNCTION public.gu_founder_legacy_list_v014186() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_legacy_list_v014186() TO authenticated;
CREATE OR REPLACE FUNCTION public.gu_founder_legacy_consent_v014186(p_opt_in boolean,p_display_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $consent$
DECLARE uid uuid:=auth.uid();chosen text:=btrim(coalesce(p_display_label,''));
BEGIN
 IF uid IS NULL OR p_opt_in IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.gu_founder_members_v014173 m WHERE m.user_id=uid AND m.revoked_at IS NULL)
 THEN RETURN jsonb_build_object('ok',false,'error','FOUNDING_IDENTITY_REQUIRED');END IF;
 IF p_opt_in=false THEN
   -- Withdrawal is ALWAYS permitted after founding subscription cancellation.
   DELETE FROM public.gu_founder_legacy_optins_v014186 WHERE user_id=uid;
   RETURN jsonb_build_object('ok',true,'visible',false);
 END IF;
 IF NOT public.gu_founder_commons_access_v014174('shared')
 THEN RETURN jsonb_build_object('ok',false,'error','ACTIVE_MEMBERSHIP_REQUIRED');END IF;
 IF length(chosen) NOT BETWEEN 3 AND 36
 OR chosen LIKE '%@%' OR chosen ~* '(https?://|www[.])'
 OR chosen ~ '[[:cntrl:]]'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_DISPLAY_NAME');END IF;
 INSERT INTO public.gu_founder_legacy_optins_v014186(user_id,display_label)
 VALUES(uid,chosen) ON CONFLICT(user_id) DO UPDATE
 SET display_label=excluded.display_label,updated_at=now();
 RETURN jsonb_build_object('ok',true,'visible',true,'displayLabel',chosen);
END $consent$;
REVOKE ALL ON FUNCTION public.gu_founder_legacy_consent_v014186(boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_legacy_consent_v014186(boolean,text) TO authenticated;
