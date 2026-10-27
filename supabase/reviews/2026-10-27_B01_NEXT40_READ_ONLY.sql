-- October 27, 2026: eight canonical B01 rubrics, forty multiple-choice cases.
-- Run READ ONLY. NEVER return correct choice text, answer_key, prompts, or
-- private teaching source. This is individual question review evidence only.
BEGIN READ ONLY;
WITH included(lab_id) AS (VALUES
 ('F1-C02-L01'),('F1-C02-L02'),('F1-C04-L01'),('F1-C06-L01'),
 ('F1-C07-L01'),('F1-C07-L02'),('F1-C08-L01'),('F1-C08-L02')
),items AS (
 SELECT s.lab_id,s.version,s.review_state,s.source_status,
  q.ordinality::int question_number,q.value question,
  s.answer_key->>(q.value->>'id') private_key
 FROM public.lab_training_sets_v014 s JOIN included USING(lab_id)
 CROSS JOIN LATERAL jsonb_array_elements(s.questions) WITH ORDINALITY q(value,ordinality)
 WHERE s.version=97 AND q.value->>'kind'='choice'
)
SELECT lab_id,version,question_number,question->>'id' question_id,
 review_state,'CHOICE' question_kind,
 (SELECT count(*)=1 FROM jsonb_array_elements_text(question->'options') x(value)
  WHERE upper(btrim(x.value))=upper(btrim(private_key))) correct_option_valid,
 (SELECT count(*)>=1 FROM jsonb_array_elements_text(question->'options') x(value)
  WHERE upper(btrim(x.value))<>upper(btrim(private_key))) wrong_option_valid,
 (SELECT count(DISTINCT upper(btrim(x.value)))=count(*)
  FROM jsonb_array_elements_text(question->'options') x(value)) unique_choices,
 (SELECT count(*)=1 FROM jsonb_array_elements_text(question->'options') x(value)
  WHERE upper(btrim(x.value))=upper(btrim('  '||private_key||'  ')))
  borderline_whitespace_case,
 (question->>'partialTolerance' IS NULL AND question->>'partialCreditPct' IS NULL) binary_no_partial_credit,
 (position(upper(private_key) IN upper(question->>'explanation'))=0) no_verbatim_key_in_feedback,
 (length(btrim(question->>'explanation'))>=120) substantive_guidance,
 (question->>'criticalOnWrong')='true' risk_critical_flag,
 (position('Select one of the current question options' in pg_get_functiondef(
   'public.v014_training_answer(uuid,uuid,text,integer)'::regprocedure))>0) invalid_unlisted_option_server_rejected,
 'QUESTION_EDITORIAL_CHECKED_RUBRIC_STILL_DRAFT' AS question_status,
 'NOT_YET_PRODUCTION_MEMBER_VERIFIED' AS member_status
FROM items ORDER BY lab_id,question_number;
ROLLBACK;
