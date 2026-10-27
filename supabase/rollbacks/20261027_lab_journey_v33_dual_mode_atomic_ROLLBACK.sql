-- Safe rollback for v3.3 dual-mode function.
-- HALT if any existing v2 checkpoints: downgrading old function would
-- overwrite the other mode on the member's next save.
DO $rollback$
BEGIN
 IF EXISTS (SELECT 1 FROM public.site_lab_progress
  WHERE responses->'learning_journey_v33'->>'version'='2')
 THEN RAISE EXCEPTION
   'Dual-mode member checkpoints exist. Preserve both modes; do not downgrade without an approved data migration.';
 END IF;
END
$rollback$;
-- ADDITIVE: the EXISTING site_lab_progress.responses JSONB is authoritative.
-- Guided/practice self-study checkpoints are not assessment/competency credit.
-- No other member records, historical attempts or LIVE commerce are altered.
CREATE OR REPLACE FUNCTION public.gu_v33_save_lab_journey(
 p_lab text, p_checkpoint jsonb, p_expected_revision bigint)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $body$
DECLARE
 v_member uuid := (select auth.uid());
 v_result jsonb;
 v_current_revision bigint;
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
 IF p_expected_revision IS NULL OR p_expected_revision<0 OR p_expected_revision>10000000 THEN
  RAISE EXCEPTION 'Invalid checkpoint revision' USING ERRCODE='22023';
 END IF;
 IF p_checkpoint IS NULL OR jsonb_typeof(p_checkpoint)<>'object'
   OR octet_length(p_checkpoint::text)>26000 THEN
  RAISE EXCEPTION 'Invalid checkpoint payload' USING ERRCODE='22023';
 END IF;
 IF EXISTS(
  SELECT 1 FROM jsonb_object_keys(p_checkpoint) AS x(key)
  WHERE NOT(x.key=ANY(v_allowed))
 ) THEN
  RAISE EXCEPTION 'Only ungraded journey fields can be stored' USING ERRCODE='22023';
 END IF;
 IF coalesce(p_checkpoint->>'version','')<>'1'
  OR coalesce(p_checkpoint->>'mode','') NOT IN ('guided','practice')
  OR coalesce(p_checkpoint->>'stage','') !~ '^[0-8]$'
  OR jsonb_typeof(p_checkpoint->'learnerReplies') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Invalid journey stage or learning mode' USING ERRCODE='22023';
 END IF;
 IF jsonb_array_length(p_checkpoint->'learnerReplies')>9 THEN
  RAISE EXCEPTION 'Too many private coaching replies' USING ERRCODE='22023';
 END IF;
 IF EXISTS(
  SELECT 1 FROM (VALUES
   ('observations',6000),('prediction',6000),('practice',6000),
   ('transfer',6000),('reflection',6000)
  ) AS limits(k,maximum_bytes)
  WHERE jsonb_typeof(p_checkpoint->limits.k) IS DISTINCT FROM 'string'
   OR octet_length(p_checkpoint->>limits.k)>limits.maximum_bytes
 ) THEN
  RAISE EXCEPTION 'Invalid learner-authored explanation size' USING ERRCODE='22023';
 END IF;
 IF EXISTS(
  SELECT 1 FROM (VALUES
   ('predictionLocked'),('practiceResolved'),('practiceAssisted'),
   ('transferResolved'),('selfReview')) AS flags(k)
  WHERE jsonb_typeof(p_checkpoint->flags.k) IS DISTINCT FROM 'boolean'
 ) OR EXISTS(
  SELECT 1 FROM (VALUES('practiceCount'),('transferCount')) AS counts(k)
  WHERE coalesce(p_checkpoint->>counts.k,'') !~ '^(0|[1-9][0-9]{0,2})$'
 ) THEN
  RAISE EXCEPTION 'Invalid checkpoint flags' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.platform_labs l
   WHERE l.lab_id=p_lab AND l.active=true AND l.registry_visible=true)
  OR NOT EXISTS(SELECT 1 FROM public.profiles p
   WHERE p.id=v_member AND p.account_kind='member') THEN
  RAISE EXCEPTION 'Canonical member Lab unavailable' USING ERRCODE='42501';
 END IF;
 -- SECURITY INVOKER keeps the existing member-owned site_lab_progress RLS.
 -- Explicit revision comparison rejects a stale tab/device without data loss.
 SELECT coalesce((responses->'learning_journey_v33'->>'rev')::bigint,0)
 INTO v_current_revision
 FROM public.site_lab_progress
 WHERE user_id=v_member AND lab_id=p_lab
 FOR UPDATE;
 IF coalesce(v_current_revision,0)<>p_expected_revision THEN
  RAISE EXCEPTION 'Another device has a newer checkpoint; reload before saving'
   USING ERRCODE='40001';
 END IF;
 INSERT INTO public.site_lab_progress
  (user_id,lab_id,status,responses,started_at,updated_at)
 VALUES
  (v_member,p_lab,'in_progress',
   jsonb_build_object('learning_journey_v33',
     p_checkpoint||jsonb_build_object('rev',p_expected_revision+1)),
   now(),now())
 ON CONFLICT (user_id,lab_id) DO UPDATE SET
  responses=jsonb_set(
   coalesce(public.site_lab_progress.responses,'{}'::jsonb),
   '{learning_journey_v33}',
   EXCLUDED.responses->'learning_journey_v33',true
  ),
  updated_at=now()
 WHERE coalesce(
  (public.site_lab_progress.responses->'learning_journey_v33'->>'rev')::bigint,0
 )=p_expected_revision
 RETURNING responses->'learning_journey_v33' INTO v_result;
 IF v_result IS NULL THEN
  RAISE EXCEPTION 'A concurrent checkpoint was saved; reload to reconcile'
   USING ERRCODE='40001';
 END IF;
 RETURN jsonb_build_object('ok',true,'saved',v_result);
END;
$body$;
REVOKE ALL ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb,bigint)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb,bigint)
 TO authenticated;
COMMENT ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb,bigint) IS
 'Private, ungraded RLS-invoker nine-stage checkpoint; no official grades, mastery or credit.';
