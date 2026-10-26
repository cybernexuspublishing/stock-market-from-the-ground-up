-- 2026-10-26 Gate 1: read-only exact-B01 beta preflight.
-- NO answer keys or PII selected. FALSE denotes a not-yet-proven release gate.
BEGIN READ ONLY;
WITH expected(lab_id) AS (VALUES ('F1-C02-L01'),('F1-C02-L02'),('F1-C04-L01'),('F1-C06-L01'),('F1-C07-L01'),('F1-C07-L02'),('F1-C08-L01'),('F1-C08-L02'),('F1-C08-L03'),('F1-C09-L01'),('F1-C10-L01'),('F1-C10-L02'),('F1-C12-L01'),('F1-C13-L01'),('F1-C13-L02'),('F2-C01-L01'),('F2-C02-L01'),('F2-C02-L02'),('F2-C02-L03'),('F2-C03-L01')), reviewed AS (
 SELECT e.lab_id,
  (i.content->>'lessonBatch'='2026-10-25-B01') AS lesson_present,
  s.version=97 AS rubric_present,
  s.review_state='reviewed' AS editorial_reviewed,
  jsonb_array_length(s.questions)=6 AS exactly_six,
  (SELECT count(DISTINCT q->>'id')=6 FROM jsonb_array_elements(s.questions) q) AS unique_questions,
  (SELECT count(*)=6 FROM jsonb_array_elements(s.questions) q WHERE s.answer_key ? (q->>'id')) AS keys_present,
  (SELECT count(*)=5 FROM jsonb_array_elements(s.questions) q WHERE q->>'kind'='choice'
   AND jsonb_array_length(q->'options')=3
   AND (SELECT count(DISTINCT lower(trim(t))) FROM jsonb_array_elements_text(q->'options') t)=3
   AND (SELECT count(*) FROM jsonb_array_elements_text(q->'options') t
        WHERE lower(trim(t))=lower(trim(s.answer_key->>(q->>'id'))))=1) AS valid_choices,
  (s.questions->2->>'prompt' LIKE 'FICTIONAL:%') AS topic_numeric,
  (s.questions->0->>'prompt' NOT LIKE 'In "%which learning method%' AND
   s.questions->1->>'prompt' NOT LIKE 'Which study objective is appropriate BEFORE%' AND
   s.questions->3->>'prompt' NOT LIKE 'For this "%exercise%') AS individualized_scaffolds,
  (s.reviewed_by IS NOT NULL AND s.reviewed_at IS NOT NULL) AS attributable_review
 FROM expected e
 LEFT JOIN public.lab_instruction_v014 i ON i.lab_id=e.lab_id
 LEFT JOIN public.lab_training_sets_v014 s ON s.lab_id=e.lab_id AND s.version=97
)
SELECT lab_id,lesson_present,rubric_present,exactly_six,unique_questions,keys_present,valid_choices,
 topic_numeric,individualized_scaffolds,editorial_reviewed,attributable_review,
 FALSE AS authenticated_beta_accepted,FALSE AS accessible_member_journey_verified
FROM reviewed ORDER BY lab_id;
COMMIT;
