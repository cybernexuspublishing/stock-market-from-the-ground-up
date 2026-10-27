-- Run only in ephemeral PostgreSQL. No real member record or market data.
\set ON_ERROR_STOP on
DO $cases$
DECLARE actor uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        a uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        response jsonb; result jsonb; v text; expected_fraction numeric;
BEGIN
 INSERT INTO public.lab_training_attempts_v014(id,user_id,lab_id,set_version,mode)
 VALUES(a,actor,'SYNTHETIC-B01-FIXTURE',97,'guided');
 -- Invalid choices never consume an attempt or count as a wrong answer.
 BEGIN
  PERFORM public.v014_training_answer(actor,a,'A fabricated option that was not listed',0);
  RAISE EXCEPTION 'INVALID_CHOICE_WAS_GRADED';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.lab_training_attempts_v014
  WHERE id=a AND (step_index<>0 OR jsonb_array_length(responses)<>0))
 THEN RAISE EXCEPTION 'INVALID_CHOICE_ADVANCED_ATTEMPT'; END IF;
 response:=public.v014_training_answer(actor,a,'  observation ONLY  ',0);
 IF response->>'correct'<>'true' OR response->>'stepIndex'<>'1'
 THEN RAISE EXCEPTION 'PUBLISHED_CHOICE_CASE_FOLDING_FAILED'; END IF;
 -- A published-but-wrong choice is graded wrong and separately flags critical risk.
 response:=public.v014_training_answer(actor,a,'Trade without a plan',1);
 IF response->>'correct'<>'false' THEN RAISE EXCEPTION 'WRONG_ALLOWED_OPTION_NOT_GRADED'; END IF;
 -- An invalid number is a validation error, never a graded attempt.
 FOREACH v IN ARRAY ARRAY['abc','NaN','1e2','25%','',repeat('7',601)]
 LOOP
  BEGIN
   PERFORM public.v014_training_answer(actor,a,v,2);
   RAISE EXCEPTION 'INVALID_NUMBER_GRADED:%',v;
  EXCEPTION WHEN invalid_parameter_value OR raise_exception THEN
   IF SQLERRM LIKE 'INVALID_NUMBER_GRADED:%' THEN RAISE; END IF;
   -- The protected scorer currently raises some length errors using P0001.
  END;
  IF EXISTS(SELECT 1 FROM public.lab_training_attempts_v014
    WHERE id=a AND step_index<>2)
  THEN RAISE EXCEPTION 'INVALID_NUMBER_CONSUMED_ATTEMPT'; END IF;
 END LOOP;
 response:=public.v014_training_answer(actor,a,'25.00',2);
 result:=response->'report';
 IF result->>'score'<>'67' OR result->>'criticalErrors'<>'1'
  OR result->'details'->2->>'creditFraction'<>'1'
  OR result->'details'->1->>'criticalError'<>'true'
 THEN RAISE EXCEPTION 'EXACT_ANSWER_OR_CRITICAL_SCORE_WRONG'; END IF;
 -- The same-key case cannot be replayed after completion.
 BEGIN
  PERFORM public.v014_training_answer(actor,a,'25.00',2);
  RAISE EXCEPTION 'COMPLETED_ATTEMPT_REPLAY_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='COMPLETED_ATTEMPT_REPLAY_ACCEPTED' THEN RAISE; END IF;
 END;
 -- The numeric branch uses the same authoritative implementation.
 FOR v,expected_fraction IN SELECT * FROM (VALUES
    ('25.02',1::numeric),('25.10',0.4::numeric),
    ('25.11',0::numeric),('24.90',0.4::numeric),('24.89',0::numeric)
   ) cases(value,credit)
 LOOP
  a:=gen_random_uuid();
  INSERT INTO public.lab_training_attempts_v014(
    id,user_id,lab_id,set_version,mode,step_index,responses)
  VALUES(a,actor,'SYNTHETIC-B01-FIXTURE',97,'assessment',2,
   '[{"questionId":"Q1","answer":"Observation only","correct":true,"creditFraction":1,"criticalError":false},
     {"questionId":"Q2","answer":"No trade","correct":true,"creditFraction":1,"criticalError":false}]'::jsonb);
  response:=public.v014_training_answer(actor,a,v,2);
  result:=response->'report';
  IF (result->'details'->2->>'creditFraction')::numeric<>expected_fraction
    OR (result->>'criticalErrors')::int<>0 THEN
   RAISE EXCEPTION 'NUMERIC_EXACT_PARTIAL_BOUNDARY_WRONG case %',v;
  END IF;
 END LOOP;
 -- Unauthorized wrong identity may not grade an arbitrary member attempt.
 BEGIN
  PERFORM public.v014_training_answer(
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,a,'25.00',2);
  RAISE EXCEPTION 'OTHER_MEMBER_WAS_ALLOWED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='OTHER_MEMBER_WAS_ALLOWED' THEN RAISE; END IF;
 END;
 -- Withdrawal must freeze access to pinned questions on server side.
 UPDATE public.lab_training_sets_v014 SET review_state='draft'
  WHERE lab_id='SYNTHETIC-B01-FIXTURE';
 a:=gen_random_uuid();
 INSERT INTO public.lab_training_attempts_v014(id,user_id,lab_id,set_version,mode)
 VALUES(a,actor,'SYNTHETIC-B01-FIXTURE',97,'guided');
 BEGIN
  PERFORM public.v014_training_answer(actor,a,'Observation only',0);
  RAISE EXCEPTION 'WITHDRAWN_RUBRIC_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='WITHDRAWN_RUBRIC_ACCEPTED' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.lab_training_attempts_v014
  WHERE id=a AND step_index<>0)
 THEN RAISE EXCEPTION 'WITHDRAWAL_CONSUMED_STEP'; END IF;
 RAISE NOTICE 'PASS synthetic protected scorer: correct, wrong, inclusive boundary, partial, outside, invalid, critical, CAS, withdrawal and member isolation.';
END
$cases$;
DO $roles$ BEGIN
 IF has_function_privilege('anon','public.v014_training_answer(uuid,uuid,text,integer)','EXECUTE')
  OR has_function_privilege('authenticated','public.v014_training_answer(uuid,uuid,text,integer)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.v014_training_answer(uuid,uuid,text,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'GRADER_EXECUTE_ROLE_BROKEN'; END IF;
END $roles$;
