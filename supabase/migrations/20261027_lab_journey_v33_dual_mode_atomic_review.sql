-- V3.3 additive hardening: keep Guided and Practice under ONE existing
-- site_lab_progress.responses.learning_journey_v33 record. Preserves any old
-- flat v1 checkpoint on the first save, no member records or grades deleted.
-- RUN AFTER checking production function SHA/source and read-only preflight.
-- Do NOT rerun historic migrations or touch LIVE billing.
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
 v_prior jsonb;
 v_modes jsonb;
 v_wrapper jsonb;
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
 SELECT responses->'learning_journey_v33',
        coalesce((responses->'learning_journey_v33'->>'rev')::bigint,0)
 INTO v_prior,v_current_revision
 FROM public.site_lab_progress
 WHERE user_id=v_member AND lab_id=p_lab
 FOR UPDATE;
 IF coalesce(v_current_revision,0)<>p_expected_revision THEN
  RAISE EXCEPTION 'Another device has a newer checkpoint; reload before saving'
   USING ERRCODE='40001';
 END IF;
 -- Preserve the opposite mode inside the SAME authoritative JSON namespace.
 -- First v2 save lifts a legacy flat v1 checkpoint into its original mode.
 v_modes:=CASE WHEN jsonb_typeof(v_prior->'modes')='object'
   THEN v_prior->'modes'
   WHEN v_prior->>'mode' IN ('guided','practice')
   THEN jsonb_build_object(v_prior->>'mode',v_prior-'rev')
   ELSE '{}'::jsonb END;
 v_wrapper:=jsonb_build_object('version',2,'rev',p_expected_revision+1,
   'modes',jsonb_set(v_modes,ARRAY[p_checkpoint->>'mode'],p_checkpoint,true));
 -- Never accept impossible "completed" journeys on direct RPC writes.
 -- This is an ungraded process-integrity check, NOT a mastery assertion.
 IF ( (p_checkpoint->>'stage')::int>=4 AND
       ((p_checkpoint->>'predictionLocked')::boolean IS DISTINCT FROM true
         OR length(btrim(p_checkpoint->>'prediction'))<15))
    OR ((p_checkpoint->>'stage')::int>=5 AND
       ((p_checkpoint->>'practiceResolved')::boolean IS DISTINCT FROM true
         OR length(btrim(p_checkpoint->>'practice'))=0))
    OR ((p_checkpoint->>'stage')::int>=7 AND
       ((p_checkpoint->>'selfReview')::boolean IS DISTINCT FROM true
         OR length(btrim(p_checkpoint->>'reflection'))<15))
    OR ((p_checkpoint->>'stage')::int=8 AND
       ((p_checkpoint->>'transferResolved')::boolean IS DISTINCT FROM true
         OR length(btrim(p_checkpoint->>'transfer'))=0))
 THEN RAISE EXCEPTION 'Study stage evidence is incomplete; no grade was awarded'
   USING ERRCODE='22023';
 END IF;
 INSERT INTO public.site_lab_progress
  (user_id,lab_id,status,responses,started_at,updated_at)
 VALUES
  (v_member,p_lab,'in_progress',
   jsonb_build_object('learning_journey_v33',v_wrapper),
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
