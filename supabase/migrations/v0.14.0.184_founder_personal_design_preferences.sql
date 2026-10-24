-- v0.14.0.184 — Optional private Founders Personal Design Studio preferences.
-- Source-of-truth is server-side Founders access; not a paid entitlement or checkout change.
CREATE TABLE IF NOT EXISTS public.gu_founder_design_preferences_v014184 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 theme_code text NOT NULL DEFAULT 'midnight' CHECK(theme_code IN ('midnight','graphite','aurora')),
 layout_density text NOT NULL DEFAULT 'comfortable' CHECK(layout_density IN ('comfortable','compact')),
 tutor_side text NOT NULL DEFAULT 'right' CHECK(tutor_side IN ('left','right')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_founder_design_preferences_v014184 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_design_preferences_v014184 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_founder_design_preferences_v014184 TO authenticated;
GRANT ALL ON public.gu_founder_design_preferences_v014184 TO service_role;
DROP POLICY IF EXISTS founder_own_design_read_v014184 ON public.gu_founder_design_preferences_v014184;
CREATE POLICY founder_own_design_read_v014184 ON public.gu_founder_design_preferences_v014184
FOR SELECT TO authenticated USING (
 user_id=(select auth.uid()) AND public.gu_founder_commons_access_v014174('shared')
);
CREATE OR REPLACE FUNCTION public.gu_founder_design_preferences_get_v014184()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $get$
DECLARE uid uuid:=auth.uid();pref public.gu_founder_design_preferences_v014184%rowtype;
BEGIN
 IF uid IS NULL OR NOT public.gu_founder_commons_access_v014174('shared')
 THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_ACCESS_REQUIRED');END IF;
 SELECT * INTO pref FROM public.gu_founder_design_preferences_v014184 WHERE user_id=uid;
 RETURN jsonb_build_object('ok',true,'theme',coalesce(pref.theme_code,'midnight'),
 'density',coalesce(pref.layout_density,'comfortable'),'tutorSide',coalesce(pref.tutor_side,'right'),
 'enhanced',public.gu_founder_commons_access_v014174('council'));
END $get$;
REVOKE ALL ON FUNCTION public.gu_founder_design_preferences_get_v014184() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_design_preferences_get_v014184() TO authenticated;
CREATE OR REPLACE FUNCTION public.gu_founder_design_preferences_set_v014184(p_theme text,p_density text,p_tutor_side text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $set$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR NOT public.gu_founder_commons_access_v014174('shared')
 THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_ACCESS_REQUIRED');END IF;
 IF p_theme IS NULL OR p_theme NOT IN ('midnight','graphite','aurora')
 OR p_density IS NULL OR p_density NOT IN ('comfortable','compact')
 OR p_tutor_side IS NULL OR p_tutor_side NOT IN ('left','right')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_DESIGN');END IF;
 IF p_theme='aurora' AND NOT public.gu_founder_commons_access_v014174('council')
 THEN RETURN jsonb_build_object('ok',false,'error','EXTENDED_REQUIRED');END IF;
 INSERT INTO public.gu_founder_design_preferences_v014184(user_id,theme_code,layout_density,tutor_side)
 VALUES(uid,p_theme,p_density,p_tutor_side)
 ON CONFLICT(user_id) DO UPDATE SET theme_code=excluded.theme_code,
 layout_density=excluded.layout_density,tutor_side=excluded.tutor_side,updated_at=now();
 RETURN jsonb_build_object('ok',true,'theme',p_theme,'density',p_density,'tutorSide',p_tutor_side);
END $set$;
REVOKE ALL ON FUNCTION public.gu_founder_design_preferences_set_v014184(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_design_preferences_set_v014184(text,text,text) TO authenticated;
