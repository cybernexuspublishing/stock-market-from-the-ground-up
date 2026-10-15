-- Cyber Nexus v0.14.0.26 | READ ONLY prerequisite evidence.
-- Run on staging first. DO NOT run migration in production without review.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regclass('public.forum_reports') IS NOT NULL AS reports_exist,
 to_regclass('public.admin_audit_log') IS NOT NULL AS audit_log_exists,
 to_regprocedure('auth.uid()') IS NOT NULL AS auth_uid_exists,
 to_regprocedure('public.gu_mod_case_transition_v01424(bigint,text,text,text)') IS NOT NULL AS v024_case_transition_installed,
 to_regprocedure('public.gu_mod_case_history_v01425(bigint)') IS NOT NULL AS v025_case_history_installed,
 COALESCE((SELECT i.is_nullable='YES'
  FROM information_schema.columns i WHERE i.table_schema='public'
    AND i.table_name='admin_audit_log' AND i.column_name='actor_user_id'),false) AS audit_actor_nullable,
 COALESCE((SELECT i.udt_name='jsonb'
  FROM information_schema.columns i WHERE i.table_schema='public'
    AND i.table_name='admin_audit_log' AND i.column_name='details'),false) AS audit_details_jsonb,
 COALESCE((SELECT count(*)=8 FROM information_schema.columns i
  WHERE i.table_schema='public' AND (
    (i.table_name='forum_reports' AND i.column_name IN ('id','status','resolved_by'))
   OR (i.table_name='admin_audit_log' AND i.column_name IN
    ('actor_user_id','action','target_type','target_id','details')))),false) AS required_columns_present,
 EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgname='gu_report_status_audit_v01426'
  AND t.tgrelid=to_regclass('public.forum_reports') AND NOT t.tgisinternal) AS guard_already_installed;
ROLLBACK;
