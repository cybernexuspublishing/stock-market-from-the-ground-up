-- READ ONLY: B01 question-by-question five-scenario mechanical triage.
-- Execute against production WITHOUT returning prompts, answer choices,
-- private answer keys, rubrics, member IDs or member submissions.
-- The output is editorial EVIDENCE PENDING, never a review authorization.
BEGIN READ ONLY;
WITH b01 AS (
 SELECT s.lab_id,s.version,s.review_state,s.questions,s.answer_key
 FROM public.lab_training_sets_v014 s
 JOIN public.lab_instruction_v014 i ON i.lab_id=s.lab_id
 WHERE s.version=97 AND i.content->>'lessonBatch'='2026-10-25-B01'
),items AS (
 SELECT b.lab_id,b.version,b.review_state,j.ordinality::int AS question_number,
        j.value AS q,b.answer_key->>(j.value->>'id') AS k
 FROM b01 b CROSS JOIN LATERAL jsonb_array_elements(b.questions)
 WITH ORDINALITY j(value,ordinality)
),outcomes AS (
 SELECT lab_id,version,review_state,question_number,q->>'id' AS question_id,
  q->>'kind' AS kind,
  CASE WHEN q->>'kind'='choice' THEN
    coalesce((select count(*)=1 from jsonb_array_elements_text(q->'options') o(value)
      where upper(btrim(o.value))=upper(btrim(k))),false)
    AND coalesce((select count(*)=count(distinct upper(btrim(o.value)))
      from jsonb_array_elements_text(q->'options') o(value)),false)
   WHEN q->>'kind'='number' THEN
    coalesce(k ~ '^[-+]?[0-9]{1,12}([.][0-9]{1,8})?$',false)
   ELSE false END AS exact_correct_shape,
  CASE WHEN q->>'kind'='choice' THEN
    EXISTS(SELECT 1 FROM jsonb_array_elements_text(q->'options') o(value)
      WHERE upper(btrim(o.value))<>upper(btrim(k)))
   WHEN q->>'kind'='number' THEN
    k ~ '^[-+]?[0-9]{1,12}([.][0-9]{1,8})?$'
    AND coalesce(q->>'tolerance','0') ~ '^[0-9]+([.][0-9]+)?$'
   ELSE false END AS incorrect_response_available,
  CASE WHEN q->>'kind'='number' THEN
     coalesce(q->>'tolerance','0') ~ '^[0-9]+([.][0-9]+)?$'
     AND k ~ '^[-+]?[0-9]{1,12}([.][0-9]{1,8})?$'
   ELSE true END AS inclusive_boundary_defined,
  CASE WHEN q->>'kind'='number' THEN
     q->>'partialTolerance' IS NULL AND q->>'partialCreditPct' IS NULL
   ELSE true END AS no_unapproved_partial_credit,
  CASE WHEN q->>'kind'='choice' THEN
    NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(q->'options') o(value)
      WHERE upper(btrim(o.value))=upper('__NOT_A_REVIEWED_OPTION__'))
   WHEN q->>'kind'='number' THEN
    'NaN' !~ '^[-+]?[0-9]{1,12}(\.[0-9]{1,8})?$'
   ELSE false END AS invalid_case_identified,
  length(btrim(q->>'explanation'))>=70 AS corrective_feedback_present
 FROM items
)
SELECT lab_id,version,question_number,question_id,kind,
 exact_correct_shape,incorrect_response_available,inclusive_boundary_defined,
 no_unapproved_partial_credit,invalid_case_identified,corrective_feedback_present,
 review_state,'EDITORIAL_REVIEW_REQUIRED' AS editorial_status,
 'NOT_ASSESSMENT_VERIFIED' AS acceptance_status
FROM outcomes ORDER BY lab_id,question_number;
ROLLBACK;
