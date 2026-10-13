-- v0.13.5.7.7 READ ONLY. Does not install migrations or alter existing account data.
-- Execute in existing Supabase SQL Editor when reconciling optional site builder and moderation UI.
BEGIN TRANSACTION READ ONLY;
SELECT now() AS inspected_at, current_database() AS database_name;
WITH required(name) AS (VALUES
 ('public.profiles'),('public.admin_user_roles'),('public.admin_role_permissions'),
 ('public.site_pages_v1354'),('public.site_modules_v1354'),('public.site_forms_v1354'),
 ('public.site_leads_v1354'),('public.commons_topics'),('public.commons_posts'),
 ('public.commons_forums'),('public.forum_reports'),('public.admin_audit_log'),
 ('public.platform_labs'),('public.competency_definitions'))
SELECT name AS required_table, to_regclass(name) IS NOT NULL AS exists_in_database FROM required ORDER BY 1;
SELECT table_name,column_name,data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN
 ('site_pages_v1354','site_forms_v1354','commons_topics','commons_posts','forum_reports','admin_role_permissions')
 ORDER BY table_name,ordinal_position;
SELECT tablename,rowsecurity AS rls_enabled,forcerowsecurity AS rls_forced
 FROM pg_tables WHERE schemaname='public' AND tablename IN
 ('site_pages_v1354','site_forms_v1354','commons_topics','commons_posts','forum_reports','profiles','admin_user_roles')
 ORDER BY tablename;
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('commons_topics','commons_posts','forum_reports','profiles')
 ORDER BY tablename,policyname;
SELECT routine_name,routine_type FROM information_schema.routines
 WHERE routine_schema='public' AND (routine_name LIKE 'v135%' OR routine_name LIKE 'commons_%')
 ORDER BY routine_name;
ROLLBACK;
