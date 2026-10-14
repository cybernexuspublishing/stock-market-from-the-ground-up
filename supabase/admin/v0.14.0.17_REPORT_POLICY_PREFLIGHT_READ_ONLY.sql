-- READ ONLY. Compare actual installed SQL to release migration before running it.
SELECT to_regclass('public.community_report_policy_v01417') IS NOT NULL AS policy_installed,
 to_regclass('public.forum_reports') IS NOT NULL AS reports_installed,
 to_regclass('public.admin_audit_log') IS NOT NULL AS audit_installed,
 to_regprocedure('public.v014_community_report(uuid,text,text,text,text)') IS NOT NULL AS report_rpc_installed,
 to_regprocedure('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)') IS NOT NULL AS owner_policy_rpc_installed;
SELECT p.proname,pg_get_functiondef(p.oid) AS installed_sql
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='public' AND p.proname='v014_community_report';
SELECT column_name,data_type,is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='forum_reports' ORDER BY ordinal_position;
SELECT column_name,data_type,is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='admin_user_roles' ORDER BY ordinal_position;
SELECT setting_key,value,public_read FROM public.site_settings
WHERE setting_key LIKE 'community.%' ORDER BY setting_key;
