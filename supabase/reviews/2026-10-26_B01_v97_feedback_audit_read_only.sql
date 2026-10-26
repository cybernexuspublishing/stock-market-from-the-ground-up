-- Gate 1, B01: read-only individual assessment-feedback quality precheck.
-- This source contains NO private answer choices, answer keys, or member identifiers.
-- Editorial approval and authenticated member acceptance are separate gates.
BEGIN READ ONLY;
WITH expected(lab_id) AS (
 VALUES ('F1-C02-L01'), ('F1-C02-L02'), ('F1-C04-L01'), ('F1-C06-L01'), ('F1-C07-L01'), ('F1-C07-L02'), ('F1-C08-L01'), ('F1-C08-L02'), ('F1-C08-L03'), ('F1-C09-L01'), ('F1-C10-L01'), ('F1-C10-L02'), ('F1-C12-L01'), ('F1-C13-L01'), ('F1-C13-L02'), ('F2-C01-L01'), ('F2-C02-L01'), ('F2-C02-L02'), ('F2-C02-L03'), ('F2-C03-L01')
), findings AS (
 SELECT e.lab_id,s.version=97 AS correct_version,s.review_state='draft' AS draft,
  s.reviewed_at IS NULL AND s.reviewed_by IS NULL AS not_approved,
  jsonb_array_length(s.questions)=6 AS six_questions,
  length(s.questions->4->>'explanation')>=120 AS case_feedback,
  length(s.questions->5->>'explanation')>=120 AS limitation_feedback,
  s.questions->4->>'id'='B01_APPLICATION' AND s.questions->5->>'id'='B01_LIMITATION' AS aligned_ids,
  (SELECT count(DISTINCT q->>'id')=6 FROM jsonb_array_elements(s.questions) q) AS unique_ids,
  (SELECT count(*)=6 FROM jsonb_array_elements(s.questions) q WHERE s.answer_key ? (q->>'id')) AS private_keys_present
 FROM expected e LEFT JOIN public.lab_training_sets_v014 s
 ON s.lab_id=e.lab_id AND s.version=97
)
SELECT lab_id,correct_version,draft,not_approved,six_questions,
 case_feedback,limitation_feedback,aligned_ids,unique_ids,private_keys_present,
 FALSE AS independent_editorial_approval,FALSE AS live_member_acceptance
FROM findings ORDER BY lab_id;
COMMIT;
