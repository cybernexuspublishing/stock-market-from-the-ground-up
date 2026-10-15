-- v0.14.0.24 | REVIEW prerequisite report, role, permission and audit contracts.
-- READ ONLY; makes no changes, never returns identities or private report bodies.
BEGIN TRANSACTION READ ONLY;
WITH tables(name) AS (VALUES ('profiles'),('admin_user_flags'),('admin_user_roles'),
 ('admin_role_permissions'),('forum_reports'),('admin_audit_log'))
SELECT name,to_regclass(format('public.%I',name)) IS NOT NULL AS installed
FROM tables ORDER BY name;
WITH fields(t,c) AS (VALUES
 ('forum_reports','id'),('forum_reports','status'),('forum_reports','content_type'),
 ('forum_reports','content_id'),('forum_reports','reason'),('forum_reports','details'),
 ('forum_reports','resolution_note'),('forum_reports','resolved_at'),('forum_reports','resolved_by'),
 ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),('admin_audit_log','target_type'),
 ('admin_audit_log','target_id'),('admin_audit_log','details'),
 ('admin_user_roles','role_code'),('admin_user_roles','expires_at'),
 ('admin_role_permissions','role_code'),('admin_role_permissions','permission_code'))
SELECT t AS table_name,c AS column_name,EXISTS(SELECT 1 FROM information_schema.columns x
 WHERE x.table_schema='public' AND x.table_name=t AND x.column_name=c) AS installed
FROM fields ORDER BY t,c;
SELECT status,count(*) AS cases FROM public.forum_reports GROUP BY status ORDER BY status;
SELECT to_regprocedure('public.gu_mod_case_list_v01424(text,integer)') IS NOT NULL AS already_installed;
ROLLBACK;
