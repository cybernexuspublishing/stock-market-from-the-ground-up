-- v0.14.0.25 | READ ONLY | run AFTER reviewed migration in staging.
BEGIN TRANSACTION READ ONLY;
SELECT to_regprocedure('public.gu_mod_case_history_v01425(bigint)') IS NOT NULL AS history_installed,
 coalesce(has_function_privilege('authenticated',
 to_regprocedure('public.gu_mod_case_history_v01425(bigint)'),'EXECUTE'),false) AS member_execute,
 coalesce(has_function_privilege('anon',
 to_regprocedure('public.gu_mod_case_history_v01425(bigint)'),'EXECUTE'),false) AS anon_execute;
SELECT p.proname,p.prosecdef AS security_definer,p.proconfig AS search_path
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='gu_mod_case_history_v01425';
-- Audit entries counted without retrieving notes, report IDs, identities or private content.
SELECT count(*) AS v01424_transactional_case_audit_entries FROM public.admin_audit_log
WHERE target_type='forum_report' AND action LIKE 'forum.report.case.%';
ROLLBACK;
