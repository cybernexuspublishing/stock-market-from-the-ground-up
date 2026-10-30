-- Crownlight Chart Studio: preserve saved premium workspace when tier access lapses.
-- Service-role-only; caller supplies a freshly verified server tier, never a
-- browser-supplied entitlement. Existing workspace data is not rewritten here.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_crownlight_chart_workspace_save_v4(
 p_user uuid, p_settings jsonb, p_expected timestamptz, p_max_tier text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','pg_temp'
AS $fn$
DECLARE previous public.crownlight_chart_workspaces_v1%ROWTYPE;
        saved_at timestamptz;
        permitted_rank integer;
        stored_rank integer;
        requested_rank integer;
BEGIN
 IF p_user IS NULL OR p_settings IS NULL OR jsonb_typeof(p_settings)<>'object'
    OR octet_length(p_settings::text)>16000
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_WORKSPACE');END IF;
 permitted_rank:=CASE p_max_tier WHEN 'STANDARD' THEN 0 WHEN 'ADVANCED' THEN 1
                               WHEN 'PROFESSIONAL' THEN 2 ELSE NULL END;
 requested_rank:=CASE p_settings->>'selected' WHEN 'STANDARD' THEN 0
                      WHEN 'ADVANCED' THEN 1 WHEN 'PROFESSIONAL' THEN 2 ELSE NULL END;
 IF permitted_rank IS NULL OR requested_rank IS NULL OR requested_rank>permitted_rank
 THEN RETURN jsonb_build_object('ok',false,'error','TIER_NOT_AUTHORIZED');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,91827));
 SELECT * INTO previous FROM public.crownlight_chart_workspaces_v1
  WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN
  IF p_expected IS NOT NULL THEN
   RETURN jsonb_build_object('ok',false,'error','WORKSPACE_CHANGED');END IF;
  INSERT INTO public.crownlight_chart_workspaces_v1(user_id,settings,updated_at)
   VALUES(p_user,p_settings,clock_timestamp())
   RETURNING updated_at INTO saved_at;
 ELSE
  IF p_expected IS NULL OR previous.updated_at IS DISTINCT FROM p_expected THEN
   RETURN jsonb_build_object('ok',false,'error','WORKSPACE_CHANGED',
      'updatedAt',previous.updated_at);END IF;
  stored_rank:=CASE previous.settings->>'selected'
   WHEN 'STANDARD' THEN 0 WHEN 'ADVANCED' THEN 1
   WHEN 'PROFESSIONAL' THEN 2 ELSE 0 END;
  -- A lapsed entitlement must not destroy richer layouts and drawings. A
  -- freshly verified eligible higher-tier member may freely change layouts.
  IF stored_rank>permitted_rank THEN
   RETURN jsonb_build_object('ok',false,'error','PREMIUM_WORKSPACE_PRESERVED',
      'savedTier',previous.settings->>'selected',
      'updatedAt',previous.updated_at);
  END IF;
  UPDATE public.crownlight_chart_workspaces_v1
   SET settings=p_settings,
       updated_at=greatest(clock_timestamp(),previous.updated_at+interval '1 microsecond')
   WHERE user_id=p_user RETURNING updated_at INTO saved_at;
 END IF;
 RETURN jsonb_build_object('ok',true,'updatedAt',saved_at,
    'saved',true,'memberPrivate',true,'entitlementRechecked',true);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_crownlight_chart_workspace_save_v4(uuid,jsonb,timestamptz,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_crownlight_chart_workspace_save_v4(uuid,jsonb,timestamptz,text)
 TO service_role;
COMMIT;