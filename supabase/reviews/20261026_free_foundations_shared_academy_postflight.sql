BEGIN READ ONLY;
SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS constraint
 FROM pg_constraint WHERE conname IN
 ('gu_bootcamp_academy_enrollments_v014168_program_code_check',
  'gu_bootcamp_academy_audit_v014295_program_code_check');
SELECT position('WHEN ''free5'' THEN 5' IN pg_get_functiondef(
 'public.gu_bootcamp_academy_save_v014168(uuid,text,integer,text,text,bigint,text)'::regprocedure
 ))>0 AS free_course_rpc_supported;
SELECT (SELECT count(*) FROM public.gu_bootcamp_academy_enrollments_v014168 WHERE program_code='free5') AS free_enrollments,
 (SELECT count(*) FROM public.gu_bootcamp_academy_progress_v014168 WHERE program_code='free5') AS free_saved_days,
 (SELECT count(*) FROM public.platform_labs) AS canonical_lab_ids;
COMMIT;