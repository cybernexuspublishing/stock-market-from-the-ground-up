-- Exact production function definitions captured pre-upgrade 2026-10-26.
-- No member records or reviewed rubrics may be touched by this rollback.
-- Restores prior binary grader and both existing knowledge-only reconciliation RPCs.
BEGIN;
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM public.lab_training_sets_v014 WHERE review_state='reviewed')
 OR EXISTS(SELECT 1 FROM public.lab_training_attempts_v014 WHERE completed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'ROLLBACK_REQUIRES_INDEPENDENT_GRADE_RECONCILIATION';
 END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

CREATE OR REPLACE FUNCTION public.gu_v014105_sync_reviewed_knowledge(p_actor uuid, p_attempt uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

CREATE OR REPLACE FUNCTION public.v014_training_answer(p_actor uuid, p_attempt uuid, p_answer text, p_expected_step integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare a record; s record; question jsonb; key jsonb; result_ok boolean; value_num numeric; key_num numeric; tolerance numeric; next_responses jsonb; n int; next_step int; scored int; final_report jsonb; prev jsonb;
begin
 select * into a from public.lab_training_attempts_v014 where id=p_attempt and user_id=p_actor for update;
 if not found then raise exception 'Attempt not found or unauthorized'; end if;
 if a.completed_at is not null then raise exception 'Attempt already completed'; end if;
 -- Mandatory CAS: concurrent/retried answer submissions cannot grade question N+1.
 if p_expected_step is distinct from a.step_index then raise exception 'Stale training step. Resume current attempt.'; end if;
 if not public.user_has_tool_access(p_actor,'ONDEMAND_TRAINING') then raise exception 'Training entitlement has expired'; end if;
 select * into s from public.lab_training_sets_v014 where lab_id=a.lab_id and version=a.set_version and review_state='reviewed';
 if not found then raise exception 'Reviewed answer key unavailable'; end if;
 n=jsonb_array_length(s.questions);if a.step_index>=n then raise exception 'Attempt is already at its final step';end if;
 question=s.questions->a.step_index;key=s.answer_key->(question->>'id');
 if key is null or length(trim(p_answer))=0 or length(p_answer)>600 then raise exception 'A valid response is required'; end if;
 if question->>'kind'='number' then
  if p_answer !~ '^[-+]?[0-9]{1,12}(\.[0-9]{1,8})?$' then raise exception 'Enter a numeric answer';end if;
  value_num=p_answer::numeric;key_num=(key #>> '{}')::numeric;
  tolerance=coalesce((question->>'tolerance')::numeric,0);
  result_ok=abs(value_num-key_num)<=tolerance;
 else result_ok=(upper(trim(p_answer))=upper(key #>> '{}'));
 end if;
 prev=jsonb_build_object('questionId',question->>'id','answer',trim(p_answer),'correct',result_ok);
 next_responses=a.responses||jsonb_build_array(prev);next_step=a.step_index+1;
 if next_step<n then
  update public.lab_training_attempts_v014 set responses=next_responses,step_index=next_step,updated_at=now() where id=p_attempt;
  return jsonb_build_object('ok',true,'complete',false,'correct',case when a.mode='guided' then to_jsonb(result_ok) else 'null'::jsonb end,
   'explanation',case when a.mode='guided' then to_jsonb(question->>'explanation') else 'null'::jsonb end,'stepIndex',next_step);
 end if;
 select count(*) into scored from jsonb_array_elements(next_responses) as item(answer) where (item.answer->>'correct')::boolean;
 final_report=jsonb_build_object('score',round((scored::numeric/n)*100),'correct',scored,'total',n,
  'sourceStatus',s.source_status,'note','Grade assesses authored mechanical answers, not verified historical market tape or live trading skill.',
  'details',(select jsonb_agg(jsonb_build_object('question',q->>'prompt','answer',s.answer_key->(q->>'id'),'submitted',next_responses->((ordinality-1)::integer)->>'answer','correct',next_responses->((ordinality-1)::integer)->'correct','explanation',q->>'explanation') order by ordinality) from jsonb_array_elements(s.questions) with ordinality as t(q,ordinality)));
 update public.lab_training_attempts_v014 set responses=next_responses,step_index=next_step,score=(final_report->>'score')::integer,report=final_report,completed_at=now(),updated_at=now() where id=p_attempt;
 return jsonb_build_object('ok',true,'complete',true,'report',final_report);
end;$function$;
COMMIT;
