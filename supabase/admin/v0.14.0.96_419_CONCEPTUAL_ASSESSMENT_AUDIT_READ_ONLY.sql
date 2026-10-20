-- v0.14.0.96 | Owner audit of existing 419 conceptual assessment drafts.
-- Read-only; run only AFTER the v0.14.0.96 draft generation SQL.
BEGIN READ ONLY;
SELECT book_code, count(*) AS registered_labs
FROM public.platform_labs GROUP BY book_code ORDER BY book_code;
SELECT l.book_code,count(*) AS catalog_count,
 count(s.lab_id) AS original_draft_count,
 count(*) FILTER (WHERE s.review_state='reviewed') AS v96_reviewed_count,
 count(*) FILTER (WHERE s.lab_id IS NULL) AS v96_missing
FROM public.platform_labs l LEFT JOIN public.lab_training_sets_v014 s
 ON s.lab_id=l.lab_id AND s.version=96
GROUP BY l.book_code ORDER BY l.book_code;
SELECT count(*) AS authored_drafts,
 count(*) FILTER(WHERE jsonb_array_length(questions)=4) AS four_questions,
 count(*) FILTER(WHERE jsonb_typeof(answer_key)='object'
  AND answer_key ?& ARRAY['EVIDENCE','FOCUS','ORIGINAL_MATH','BOUNDARY']) AS all_private_keys_present
FROM public.lab_training_sets_v014 WHERE version=96;
-- Inspect no private key text, member PII or lab predictions.
ROLLBACK;
