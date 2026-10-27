-- Read-only, key-free verification for the first eight full B01 v97 rubric sets.
-- Individual numeric expected quantities were independently recomputed in a
-- separate private read-only review; do NOT embed private keyed answers here.
BEGIN READ ONLY;
WITH ids(lab_id) AS (VALUES
('F1-C02-L01'),('F1-C02-L02'),('F1-C04-L01'),('F1-C06-L01'),
('F1-C07-L01'),('F1-C07-L02'),('F1-C08-L01'),('F1-C08-L02')
),rows AS (
 SELECT s.lab_id,s.version,s.review_state,s.reviewed_at,s.reviewed_by,
 s.questions,s.answer_key,b.applied_md5,
 (s.questions->2) AS numeric_question
 FROM ids JOIN public.lab_training_sets_v014 s USING(lab_id)
 JOIN private.b01_question_backups_20261027 b USING(lab_id,version)
 WHERE s.version=97
)
SELECT s.lab_id,s.version,s.review_state,
 jsonb_array_length(s.questions)=6 AS six_question_structure,
 (SELECT count(*)=5 FROM jsonb_array_elements(s.questions) q
 WHERE q->>'kind'='choice') AS five_choice_questions,
 (SELECT count(*)=1 FROM jsonb_array_elements(s.questions) q
 WHERE q->>'kind'='number') AS one_numeric_question,
 (SELECT count(DISTINCT q->>'id')=6 FROM jsonb_array_elements(s.questions) q) AS six_distinct_ids,
 (SELECT bool_and(
   (SELECT count(*)=1 FROM jsonb_array_elements_text(q->'options') o(v)
    WHERE upper(btrim(o.v))=upper(btrim(s.answer_key->>(q->>'id'))))
   AND length(btrim(q->>'explanation'))>=100
   AND position(upper(btrim(s.answer_key->>(q->>'id'))) IN upper(q->>'explanation'))=0
 ) FROM jsonb_array_elements(s.questions) q WHERE q->>'kind'='choice') AS five_private_choice_cases_valid,
 (SELECT (q->>'tolerance')::numeric=0 AND
  q->>'partialTolerance' IS NULL AND q->>'partialCreditPct' IS NULL
  AND (s.answer_key->>(q->>'id')) ~ '^[-+]?[0-9]+(\.[0-9]+)?$'
  AND (q->>'prompt') LIKE 'FICTIONAL:%'
 FROM jsonb_array_elements(s.questions) q WHERE q->>'kind'='number') AS numeric_exact_only_and_fictional,
 (s.review_state='draft' AND s.reviewed_at IS NULL AND s.reviewed_by IS NULL) AS safe_unpublished,
 (s.applied_md5=md5(s.questions::text)) AS private_original_backup_verified,
 (NOT EXISTS(SELECT 1 FROM public.lab_training_attempts_v014 a
  WHERE a.lab_id=s.lab_id AND a.set_version=s.version)) AS member_attempts_unchanged
FROM rows s ORDER BY s.lab_id;
ROLLBACK;
