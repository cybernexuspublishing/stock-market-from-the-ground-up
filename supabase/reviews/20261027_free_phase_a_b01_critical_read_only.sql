-- Read-only metadata review of B01 draft v97. No question/answer disclosure.
BEGIN READ ONLY;
WITH items AS(
 SELECT s.lab_id,s.review_state,j.ordinality::int ordinal,j.value q
 FROM public.lab_training_sets_v014 s
 JOIN public.lab_instruction_v014 l ON l.lab_id=s.lab_id
 CROSS JOIN LATERAL jsonb_array_elements(s.questions) WITH ORDINALITY j(value,ordinality)
 WHERE s.version=97 AND l.content->>'lessonBatch'='2026-10-25-B01')
SELECT count(DISTINCT lab_id) AS labs,count(*) AS questions,
 count(*) FILTER(WHERE review_state='reviewed') AS reviewed_questions,
 count(*) FILTER(WHERE q->>'kind'='choice') AS choices,
 count(*) FILTER(WHERE q->>'kind'='number') AS numerics,
 count(*) FILTER(WHERE q->>'criticalOnWrong'='true') AS critical,
 count(*) FILTER(WHERE q ? 'partialCreditPct' OR q ? 'partialTolerance') AS partial_policy
FROM items;
WITH items AS(
 SELECT s.lab_id,s.review_state,j.ordinality::int ordinal,j.value q
 FROM public.lab_training_sets_v014 s
 JOIN public.lab_instruction_v014 l ON l.lab_id=s.lab_id
 CROSS JOIN LATERAL jsonb_array_elements(s.questions) WITH ORDINALITY j(value,ordinality)
 WHERE s.version=97 AND l.content->>'lessonBatch'='2026-10-25-B01')
SELECT lab_id,ordinal,q->>'id' AS question_id,review_state,'EDITORIAL_POLICY_NOT_APPROVED' AS status
FROM items WHERE q->>'criticalOnWrong'='true' ORDER BY lab_id,ordinal;
ROLLBACK;
