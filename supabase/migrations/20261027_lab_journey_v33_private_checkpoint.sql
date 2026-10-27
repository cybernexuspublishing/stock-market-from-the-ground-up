-- ADDITIVE: reuse public.site_lab_progress.responses, no new progress table.
-- Guided/practice checkpoints are private, fictional/ungraded learning state.
-- Official lab_progress, lab_attempts, training attempts and mastery are untouched.
-- Supabase Postgres 15+, approved main-only stock-market project.
CREATE OR REPLACE FUNCTION public.gu_v33_save_lab_journey(
 p_lab text, p_checkpoint jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
 v_member uuid := (select auth.uid());
 v_result jsonb;
 v_allowed text[] := ARRAY[
  'version','mode','stage','observations','prediction','predictionLocked',
  'practice','practiceCount','practiceResolved','practiceAssisted',
  'transfer','transferCount','transferResolved','selfReview','reflection',
  'learnerReplies'
 ];
BEGIN
 IF v_member IS NULL THEN
  RAISE EXCEPTION 'Authenticated member required' USING ERRCODE='28000';
 END IF;
 IF p_lab IS NULL OR length(p_lab)>90 OR p_lab !~ '^[A-Za-z0-9_-]{3,90}$' THEN
  RAISE EXCEPTION 'Invalid canonical Lab identifier' USING ERRCODE='22023';
 END IF;
 IF p_checkpoint IS NULL OR jsonb_typeof(p_checkpoint)<>'object'
  OR octet_length(p_checkpoint::text)>12500 THEN
  RAISE EXCEPTION 'Invalid checkpoint payload' USING ERRCODE='22023';
 END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_object_keys(p_checkpoint) k
  WHERE NOT(k = ANY(v_allowed))
 ) THEN
  RAISE EXCEPTION 'Only ungraded journey fields can be stored' USING ERRCODE='22023';
 END IF;
 IF p_checkpoint->>'version'<>'1'
  OR p_checkpoint->>'mode' NOT IN ('guided','practice')
  OR coalesce(p_checkpoint->>'stage','') !~ '^[0-8]$'
  OR jsonb_typeof(p_checkpoint->'learnerReplies') IS DISTINCT FROM 'array'
  OR jsonb_array_length(p_checkpoint->'learnerReplies')>9 THEN
  RAISE EXCEPTION 'Invalid journey stage or learning mode' USING ERRCODE='22023';
 END IF;
 IF EXISTS (
  SELECT 1 FROM (VALUES
   ('observations',1600),('prediction',1600),('practice',1600),
   ('transfer',1600),('reflection',1600)) f(k,limit_bytes)
  WHERE jsonb_typeof(p_checkpoint->f.k) IS DISTINCT FROM 'string'
     OR octet_length(p_checkpoint->>f.k)>f.limit_bytes
 ) THEN
  RAISE EXCEPTION 'Invalid learner-authored explanation size' USING ERRCODE='22023';
 END IF;
 IF EXISTS (
  SELECT 1 FROM (VALUES
   ('predictionLocked'),('practiceResolved'),('practiceAssisted'),
   ('transferResolved'),('selfReview')) f(k)
  WHERE jsonb_typeof(p_checkpoint->f.k) IS DISTINCT FROM 'boolean'
 ) OR EXISTS (
  SELECT 1 FROM (VALUES('practiceCount'),('transferCount')) f(k)
  WHERE coalesce(p_checkpoint->>f.k,'') !~ '^(0|[1-9][0-9]{0,2})$'
 ) THEN
  RAISE EXCEPTION 'Invalid checkpoint flags' USING ERRCODE='22023';
 END IF;
 -- Check the EXISTING canonical registry and member account. This data must
 -- never be confused with an authenticated reviewed assessment or grade.
 IF NOT EXISTS(SELECT 1 FROM public.platform_labs l
   WHERE l.lab_id=p_lab AND l.active=true AND l.registry_visible=true)
  OR NOT EXISTS(SELECT 1 FROM public.profiles p
   WHERE p.id=v_member AND p.account_kind='member') THEN
  RAISE EXCEPTION 'Canonical member Lab unavailable' USING ERRCODE='42501';
 END IF;
 -- SECURITY INVOKER: existing per-user SELECT/INSERT/UPDATE RLS applies.
 -- jsonb_set atomically preserves site-lab responses and other metadata.
 INSERT INTO public.site_lab_progress
  (user_id,lab_id,status,responses,started_at,updated_at)
 VALUES
  (v_member,p_lab,'in_progress',
   jsonb_build_object('learning_journey_v33',p_checkpoint),
   now(),now())
 ON CONFLICT (user_id,lab_id) DO UPDATE SET
  responses=jsonb_set(
   coalesce(public.site_lab_progress.responses,'{}'::jsonb),
   '{learning_journey_v33}',
   EXCLUDED.responses->'learning_journey_v33',true
  ),
  updated_at=now()
 RETURNING responses->'learning_journey_v33' INTO v_result;
 RETURN jsonb_build_object('ok',true,'saved',v_result);
END;
$$;
REVOKE ALL ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb) TO authenticated;
COMMENT ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb) IS
 'RLS-controlled, member-owned, ungraded nine-stage journey checkpoint; does not award lab_progress, scores, assessments or Sparks.';
