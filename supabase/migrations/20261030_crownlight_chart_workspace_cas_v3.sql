-- Crownlight Chart Studio coordinated acceptance: race-safe server-owned revision.
-- Existing RLS, membership tier decisions, Sparks pricing and workspaces unchanged.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_crownlight_chart_workspace_save_v3(
 p_user uuid,p_settings jsonb,p_expected timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path='pg_catalog','pg_temp'
AS $fn$
DECLARE v_previous public.crownlight_chart_workspaces_v1%ROWTYPE;
 DECLARE v_saved timestamptz;
BEGIN
 IF p_user IS NULL OR p_settings IS NULL OR jsonb_typeof(p_settings)<>'object'
   OR octet_length(p_settings::text)>16000
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_WORKSPACE');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,91827));
 SELECT * INTO v_previous FROM public.crownlight_chart_workspaces_v1
  WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN
  IF p_expected IS NOT NULL
  THEN RETURN jsonb_build_object('ok',false,'error','WORKSPACE_CHANGED');END IF;
  INSERT INTO public.crownlight_chart_workspaces_v1(user_id,settings,updated_at)
   VALUES(p_user,p_settings,clock_timestamp())
   RETURNING updated_at INTO v_saved;
 ELSE
  IF p_expected IS NULL OR v_previous.updated_at IS DISTINCT FROM p_expected
  THEN RETURN jsonb_build_object('ok',false,'error','WORKSPACE_CHANGED',
    'updatedAt',v_previous.updated_at);END IF;
  UPDATE public.crownlight_chart_workspaces_v1
   SET settings=p_settings,
    updated_at=greatest(clock_timestamp(),v_previous.updated_at+interval '1 microsecond')
   WHERE user_id=p_user RETURNING updated_at INTO v_saved;
 END IF;
 RETURN jsonb_build_object('ok',true,'updatedAt',v_saved,
  'saved',true,'memberPrivate',true);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_crownlight_chart_workspace_save_v3(uuid,jsonb,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_crownlight_chart_workspace_save_v3(uuid,jsonb,timestamptz)
 TO service_role;
COMMIT;