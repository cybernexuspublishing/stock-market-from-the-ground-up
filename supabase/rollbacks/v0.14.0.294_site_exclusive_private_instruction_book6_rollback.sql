-- ROLLBACK ONLY — DO NOT EXECUTE DURING THE AUTHORIZED BETA.
-- Requires an independent protected Supabase backup, an explicit release rollback
-- decision, and a verified absence of member activity referring to SITE-018..100.
-- This is NOT a blanket undo of Owner teaching or private progress.
-- No automatic review, grant or grading record is erased.
BEGIN;
DO $guard$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM public.lab_instruction_v014 WHERE
  lab_id BETWEEN 'SITE-018' AND 'SITE-100' AND
  book_number=6 AND source_status='original_site_exclusive_guided_beta_unreviewed_v014294'
  AND reviewed_by IS NULL AND reviewed_at IS NULL AND
  content->>'lessonBatch'='2026-10-26-SITE-018-100-AUTHORED';
 IF n<>83 THEN RAISE EXCEPTION 'Rollback requires the same 83 original unreviewed rows; found %',n; END IF;
 -- Cross-check work before removing any source. Human review must also
 -- reconcile private progress, journals and attempts in the change window.
 IF EXISTS(SELECT 1 FROM public.lab_progress WHERE lab_id BETWEEN 'SITE-018' AND 'SITE-100')
 THEN RAISE EXCEPTION 'Member progress exists; this rollback is unsafe'; END IF;
 IF EXISTS(SELECT 1 FROM public.lab_training_attempts_v014 WHERE lab_id BETWEEN 'SITE-018' AND 'SITE-100')
 THEN RAISE EXCEPTION 'Training attempt references exist; this rollback is unsafe'; END IF;
END $guard$;
DELETE FROM public.lab_instruction_v014
 WHERE lab_id BETWEEN 'SITE-018' AND 'SITE-100'
 AND book_number=6
 AND source_status='original_site_exclusive_guided_beta_unreviewed_v014294'
 AND content->>'lessonBatch'='2026-10-26-SITE-018-100-AUTHORED'
 AND reviewed_by IS NULL AND reviewed_at IS NULL;
-- Do not remove 1..6 compatibility unless no other book 4,5,6 lessons remain.
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM public.lab_instruction_v014 WHERE book_number>3)
 THEN RAISE EXCEPTION 'Other private book 4/5/6 lessons depend on the new constraint'; END IF;
 ALTER TABLE public.lab_instruction_v014 DROP CONSTRAINT lab_instruction_v014_book_number_check;
 ALTER TABLE public.lab_instruction_v014 ADD CONSTRAINT lab_instruction_v014_book_number_check
  CHECK (book_number BETWEEN 1 AND 3);
END $guard$;
COMMIT;
