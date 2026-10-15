-- Cyber Nexus v0.14.0.26 | READ ONLY install and privilege evidence.
-- Object existence does not prove a failed audit rolls back a report update:
-- that must be tested on disposable staging reports with a forced audit failure.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regprocedure('public.gu_report_status_audit_v01426()') IS NOT NULL AS guard_function_installed,
 EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.forum_reports')
  AND t.tgname='gu_report_status_audit_v01426' AND t.tgenabled IN ('O','A')
  AND NOT t.tgisinternal) AS status_trigger_enabled,
 COALESCE((SELECT p.prosecdef FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.gu_report_status_audit_v01426()')),false) AS security_definer,
 COALESCE((SELECT 'search_path=pg_catalog,pg_temp'=ANY(p.proconfig)
  FROM pg_proc p WHERE p.oid=to_regprocedure('public.gu_report_status_audit_v01426()')),false) AS hardened_search_path,
 COALESCE(has_function_privilege('anon',to_regprocedure('public.gu_report_status_audit_v01426()'),'EXECUTE'),false) AS anon_can_execute,
 COALESCE(has_function_privilege('authenticated',to_regprocedure('public.gu_report_status_audit_v01426()'),'EXECUTE'),false) AS member_can_execute,
 (SELECT count(*) FROM public.admin_audit_log a
  WHERE a.action='forum.report.status.guard.v01426') AS guarded_status_audit_rows;
ROLLBACK;
