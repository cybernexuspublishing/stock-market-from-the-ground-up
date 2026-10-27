-- Restore exact original protected grader ONLY while no published reviewed
-- grading sets or completed member attempts depend on stricter validation.
-- Original SQL function obtained from live Supabase read-only introspection.
BEGIN;
DO $rollback_gate$
BEGIN
 IF EXISTS(SELECT 1 FROM public.lab_training_sets_v014 WHERE review_state='reviewed')
  OR EXISTS(SELECT 1 FROM public.lab_training_attempts_v014)
 THEN RAISE EXCEPTION 'B01_GRADER_ROLLBACK_REQUIRES_REVIEWED_ATTEMPT_RECONCILIATION'; END IF;
END $rollback_gate$;
CREATE OR REPLACE FUNCTION public.v014_training_answer(p_actor uuid, p_attempt uuid, p_answer text, p_expected_step integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare a record; s record; question jsonb; key jsonb; result_ok boolean; value_num numeric; key_num numeric; tolerance numeric; next_responses jsonb; n int; next_step int; scored int; final_report jsonb; prev jsonb; partial_tolerance numeric; partial_fraction numeric; credit_fraction numeric; critical_wrong boolean;
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
  partial_tolerance=coalesce((question->>'partialTolerance')::numeric,tolerance);
  partial_fraction=coalesce((question->>'partialCreditPct')::numeric,0)/100;
  credit_fraction=CASE WHEN result_ok THEN 1
    WHEN partial_fraction>0 AND partial_tolerance>tolerance
      AND abs(value_num-key_num)<=partial_tolerance THEN partial_fraction
    ELSE 0 END;
 else result_ok=(upper(trim(p_answer))=upper(key #>> '{}'));
  credit_fraction=CASE WHEN result_ok THEN 1 ELSE 0 END;
 end if;
 critical_wrong=coalesce((question->>'criticalOnWrong')::boolean,false) AND NOT result_ok;
 prev=jsonb_build_object('questionId',question->>'id','answer',trim(p_answer),
  'correct',result_ok,'creditFraction',credit_fraction,'criticalError',critical_wrong);
 next_responses=a.responses||jsonb_build_array(prev);next_step=a.step_index+1;
 if next_step<n then
  update public.lab_training_attempts_v014 set responses=next_responses,step_index=next_step,updated_at=now() where id=p_attempt;
  return jsonb_build_object('ok',true,'complete',false,'correct',case when a.mode='guided' then to_jsonb(result_ok) else 'null'::jsonb end,
   'explanation',case when a.mode='guided' then to_jsonb(question->>'explanation') else 'null'::jsonb end,'stepIndex',next_step);
 end if;
 select count(*) into scored from jsonb_array_elements(next_responses) as item(answer) where (item.answer->>'correct')::boolean;
 final_report=jsonb_build_object('score',round(((SELECT coalesce(sum((x.item->>'creditFraction')::numeric),0)
    FROM jsonb_array_elements(next_responses) AS x(item))/n)*100),'correct',scored,'total',n,
  'criticalErrors',(SELECT count(*) FROM jsonb_array_elements(next_responses) AS x(item)
                    WHERE (x.item->>'criticalError')::boolean),
  'partialCreditQuestions',(SELECT count(*) FROM jsonb_array_elements(next_responses) AS x(item)
                    WHERE (x.item->>'creditFraction')::numeric>0
                      AND (x.item->>'creditFraction')::numeric<1),
  'sourceStatus',s.source_status,'note','Grade assesses authored mechanical answers, not verified historical market tape or live trading skill.',
  'details',(select jsonb_agg(jsonb_build_object('question',q->>'prompt','answer',s.answer_key->(q->>'id'),'submitted',next_responses->((ordinality-1)::integer)->>'answer','correct',next_responses->((ordinality-1)::integer)->'correct',
   'creditFraction',next_responses->((ordinality-1)::integer)->'creditFraction',
   'criticalError',next_responses->((ordinality-1)::integer)->'criticalError',
   'explanation',q->>'explanation') order by ordinality) from jsonb_array_elements(s.questions) with ordinality as t(q,ordinality)));
 update public.lab_training_attempts_v014 set responses=next_responses,step_index=next_step,score=(final_report->>'score')::integer,report=final_report,completed_at=now(),updated_at=now() where id=p_attempt;
 return jsonb_build_object('ok',true,'complete',true,'report',final_report);
end;$function$
;

REVOKE ALL ON FUNCTION public.v014_training_answer(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v014_training_answer(uuid,uuid,text,integer) TO service_role;
DO $postflight$
BEGIN
 IF has_function_privilege('anon','public.v014_training_answer(uuid,uuid,text,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.v014_training_answer(uuid,uuid,text,integer)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.v014_training_answer(uuid,uuid,text,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Rollback grader grants were not preserved'; END IF;
END $postflight$;
COMMIT;
