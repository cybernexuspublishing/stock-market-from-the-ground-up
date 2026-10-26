-- v0.14.0.292_reviewed_learning_version_integrity read-only postflight.
BEGIN READ ONLY;
SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS rule
 FROM pg_constraint WHERE conname IN
 ('gu_v014292_graded_review_attribution','gu_v014292_lesson_review_attribution')
 ORDER BY table_name;
SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS trigger_definition
 FROM pg_trigger WHERE tgname='gu_v014292_graded_revision_guard';
SELECT count(*) AS frozen_reviewed_versions FROM public.lab_training_sets_v014
 WHERE review_state='reviewed' AND review_frozen_at IS NOT NULL;
SELECT count(*) AS malformed_reviewed_sets FROM public.lab_training_sets_v014
 WHERE review_state='reviewed'
 AND (reviewed_by IS NULL OR reviewed_at IS NULL OR review_frozen_at IS NULL);
SELECT count(*) AS malformed_reviewed_lessons FROM public.lab_instruction_v014
 WHERE source_status ~ '^(editorially_reviewed|owner_reviewed)(_|$)'
 AND (reviewed_by IS NULL OR reviewed_at IS NULL);
COMMIT;
