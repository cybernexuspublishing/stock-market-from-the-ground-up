-- Read-only verification for B01 auditing and v0.14.0.293 reconciliation.
BEGIN READ ONLY;
SELECT t.tgname,t.tgenabled,t.tgrelid::regclass::text AS audited_relation,p.proname
FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
WHERE t.tgname IN ('gu_v014280_rubric_review_audit','gu_v014281_lesson_review_audit')
ORDER BY t.tgname;
SELECT count(*) AS reviewed_grading_sets FROM public.lab_training_sets_v014 WHERE review_state='reviewed';
SELECT count(*) AS approved_private_lessons FROM public.lab_instruction_v014
 WHERE source_status ~ '^(editorially_reviewed|owner_reviewed)(_|$)';
COMMIT;
