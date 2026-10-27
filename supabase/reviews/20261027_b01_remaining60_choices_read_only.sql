-- Individual B01 remaining-60 choice audit. Production READ ONLY.
-- Never output private prompts, choice text, key text, member data, or rubrics.
BEGIN READ ONLY;
WITH b01 AS (
 SELECT s.lab_id,s.version,s.review_state,q.value AS question,
        s.answer_key->>(q.value->>'id') AS private_key
 FROM public.lab_training_sets_v014 s
 JOIN public.lab_instruction_v014 i USING (lab_id)
 CROSS JOIN LATERAL jsonb_array_elements(s.questions) q(value)
 WHERE s.version=97 AND i.content->>'lessonBatch'='2026-10-25-B01'
   AND s.lab_id NOT IN (
    'F1-C02-L01','F1-C02-L02','F1-C04-L01','F1-C06-L01',
    'F1-C07-L01','F1-C07-L02','F1-C08-L01','F1-C08-L02')
   AND q.value->>'kind'='choice'
)
SELECT lab_id,version,question->>'id' question_id,review_state,
 (SELECT count(*)=1 FROM jsonb_array_elements_text(question->'options') o(v)
   WHERE upper(btrim(o.v))=upper(btrim(private_key))) unique_keyed_option,
 (SELECT count(DISTINCT upper(btrim(o.v)))=count(*)
   FROM jsonb_array_elements_text(question->'options') o(v)) unique_options,
 (SELECT count(*)>=1 FROM jsonb_array_elements_text(question->'options') o(v)
   WHERE upper(btrim(o.v))<>upper(btrim(private_key))) incorrect_option_exists,
 (position(upper(btrim(private_key)) IN upper(question->>'explanation'))=0) no_verbatim_key_echo,
 (length(btrim(question->>'explanation'))>=100) remedial_substance,
 (question->>'partialTolerance' IS NULL AND question->>'partialCreditPct' IS NULL) binary_choice_scoring,
 (question->>'criticalOnWrong')='true' process_critical,
 (position('Select one of the current question options' IN pg_get_functiondef(
    'public.v014_training_answer(uuid,uuid,text,integer)'::regprocedure))>0) protected_unlisted_guard,
 'EDITORIALLY_CHECKED_DRAFT' AS question_review,
 'NOT_ASSESSMENT_VERIFIED' AS formal_status
FROM b01 ORDER BY lab_id,question_id;
ROLLBACK;
