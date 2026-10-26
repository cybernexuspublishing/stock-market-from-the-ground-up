-- Grading evidence-integrity guard | 2026-10-26
-- Project: The Stock Market: From the Ground Up
-- Source path: supabase/migrations/20261026_grading_assessment_mode_evidence_guard.sql
-- Purpose: Only completed Assessment-mode attempts with individually reviewed rubrics
-- and approved exact-version mappings may create official KNOWLEDGE evidence.
-- Existing graded attempts/history are neither overwritten nor deleted.
-- The other three skill dimensions remain unassessed by this procedure.
-- Requires verification of affected functions and zero pre-existing mismapped rows.
BEGIN;

DO $preflight$
BEGIN
 IF EXISTS (
  SELECT 1 FROM public.competency_evidence
  WHERE dimension='knowledge' AND metadata->>'evidence_kind'='reviewed_conceptual_quiz'
    AND (difficulty IS DISTINCT FROM 'assessment')
 ) THEN
  RAISE EXCEPTION 'Historical formative Knowledge evidence requires separate Owner audit before guard deployment';
 END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.gu_v014105_sync_reviewed_knowledge(
 p_actor uuid,p_attempt uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $function$
DECLARE a record; m record; d record; v_rows integer;
BEGIN
 IF p_actor IS NULL OR p_attempt IS NULL THEN
  RETURN jsonb_build_object('ok',false,'reason','invalid_attempt'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_attempt::text,140105));
 SELECT t.*,s.review_state AS rubric_state,s.reviewed_by AS rubric_reviewer,
        s.reviewed_at AS rubric_reviewed_at,s.source_status
 INTO a FROM public.lab_training_attempts_v014 t
 JOIN public.lab_training_sets_v014 s ON s.lab_id=t.lab_id AND s.version=t.set_version
 WHERE t.id=p_attempt AND t.user_id=p_actor;
 IF NOT FOUND OR a.completed_at IS NULL OR a.score IS NULL OR
    a.score NOT BETWEEN 0 AND 100 OR a.rubric_state<>'reviewed' OR
    a.rubric_reviewer IS NULL OR a.rubric_reviewed_at IS NULL THEN
   RETURN jsonb_build_object('ok',false,'reason','no_reviewed_completed_assessment');
 END IF;
 IF a.mode IS DISTINCT FROM 'assessment' THEN
   RETURN jsonb_build_object('ok',false,'reason','assessment_mode_required');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_actor AND p.account_kind='member')
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor
  AND lower(f.status) IN ('restricted','suspended')) THEN
  RETURN jsonb_build_object('ok',false,'reason','ineligible_member'); END IF;
 SELECT * INTO m FROM public.gu_lab_competency_knowledge_map_v014105
 WHERE lab_id=a.lab_id AND review_state='approved' AND rubric_version=a.set_version;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','topic_mapping_not_individually_approved'); END IF;
 SELECT * INTO d FROM public.competency_definitions
 WHERE competency_code=m.competency_code AND active=true;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','competency_not_active'); END IF;
 INSERT INTO public.competency_evidence
 (user_id,competency_code,source_type,source_id,dimension,score,passed,critical_error,difficulty,weight,metadata,assessed_at)
 VALUES(p_actor,d.competency_code,'quiz','v014-assessment:'||p_attempt::text,'knowledge',
        a.score,a.score>=d.pass_score,false,a.mode,1.0,
        jsonb_build_object('evidence_kind','reviewed_conceptual_quiz',
           'knowledge_only',true,'critical_error_not_assessed',true,
           'market_history_verified',false,'lab_id',a.lab_id,
           'rubric_version',a.set_version,'mapping_individually_reviewed',true,
           'assessment_mode',true),
        a.completed_at)
 ON CONFLICT(user_id,competency_code,source_type,source_id,dimension) DO NOTHING;
 GET DIAGNOSTICS v_rows = ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'knowledgeRecorded',v_rows=1,
  'alreadyRecorded',v_rows=0,'competencyCode',d.competency_code,
  'scope','knowledge_only_conceptual_quiz','masteryAwarded',false);
END $function$;

REVOKE ALL ON FUNCTION public.gu_v014105_sync_reviewed_knowledge(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014105_sync_reviewed_knowledge(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(
 p_actor uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $function$
DECLARE r record; v jsonb; v_scanned integer:=0; v_added integer:=0; v_eligible integer:=0;
BEGIN
 IF p_actor IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND account_kind='member')
 OR EXISTS(SELECT 1 FROM public.admin_user_flags WHERE user_id=p_actor
 AND lower(status) IN ('restricted','suspended'))
 THEN RETURN jsonb_build_object('ok',false,'reason','ineligible_member'); END IF;
 FOR r IN SELECT a.id FROM public.lab_training_attempts_v014 a
 JOIN public.gu_lab_competency_knowledge_map_v014105 m
 ON m.lab_id=a.lab_id AND m.review_state='approved' AND m.rubric_version=a.set_version
 WHERE a.user_id=p_actor AND a.mode='assessment'
   AND a.completed_at IS NOT NULL AND a.score BETWEEN 0 AND 100
 ORDER BY a.completed_at DESC,a.id DESC LIMIT 500 LOOP
  v_scanned:=v_scanned+1;
  v:=public.gu_v014105_sync_reviewed_knowledge(p_actor,r.id);
  IF coalesce((v->>'ok')::boolean,false) THEN
   v_eligible:=v_eligible+1;
   IF coalesce((v->>'knowledgeRecorded')::boolean,false) THEN
    v_added:=v_added+1; END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'attemptsInspected',v_scanned,
  'approvedEligible',v_eligible,'knowledgeRowsAdded',v_added,
  'reviewedLimit',500,'scope','knowledge_only','masteryAwarded',false);
END $function$;

REVOKE ALL ON FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(uuid) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
