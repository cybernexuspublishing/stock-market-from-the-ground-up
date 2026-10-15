-- v0.14.0.25 | READ ONLY | run BEFORE migration review; no account IDs selected.
BEGIN TRANSACTION READ ONLY;
WITH objs(name,required) AS (VALUES
 ('forum_reports',true),('admin_audit_log',true),('profiles',true),
 ('admin_user_roles',true),('admin_user_flags',true),('admin_role_permissions',true))
SELECT name,required,to_regclass(format('public.%I',name)) IS NOT NULL AS installed FROM objs;
WITH cols(tab,col) AS (VALUES
 ('forum_reports','id'),('admin_audit_log','target_type'),('admin_audit_log','target_id'),
 ('admin_audit_log','action'),('admin_audit_log','details'),('admin_audit_log','created_at'))
SELECT tab,col,EXISTS(SELECT 1 FROM information_schema.columns c
 WHERE c.table_schema='public' AND c.table_name=cols.tab AND c.column_name=cols.col) AS installed
FROM cols;
SELECT to_regprocedure('public.gu_mod_case_actor_v01424()') IS NOT NULL AS case_actor_installed,
 to_regprocedure('public.gu_mod_case_history_v01425(bigint)') IS NOT NULL AS history_already_installed;
ROLLBACK;
