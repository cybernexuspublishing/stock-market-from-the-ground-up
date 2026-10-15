-- Cyber Nexus / v0.14.0.27 | OWNER REPORT LIMITS — READ-ONLY PREFLIGHT
-- This checks why the Admin Reporting Limit / Duplicate Report controls
-- remain backend-disabled. DO NOT run a migration based solely on existence.
BEGIN TRANSACTION READ ONLY;
WITH required(name,type) AS (VALUES
 ('public.forum_reports','table'),
 ('public.profiles','table'),
 ('public.admin_user_flags','table'),
 ('public.admin_user_roles','table'),
 ('public.admin_audit_log','table'),
 ('public.v014_community_report(uuid,text,text,text,text)','function'),
 ('public.community_report_policy_v01417','target_table'),
 ('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)','target_function')
)
SELECT 'REQUIRED_OBJECT' AS category,name AS object_name,
 CASE WHEN type IN ('table','target_table') THEN to_regclass(name) IS NOT NULL
 ELSE to_regprocedure(name) IS NOT NULL END AS installed,
 type AS expected_type FROM required
UNION ALL
SELECT 'EXPECTED_PERMISSION','anon.forum_reports.INSERT',
 COALESCE(has_table_privilege('anon','public.forum_reports','INSERT'),false),'must_be_false'
UNION ALL
SELECT 'EXPECTED_PERMISSION','authenticated.forum_reports.INSERT',
 COALESCE(has_table_privilege('authenticated','public.forum_reports','INSERT'),false),'must_be_false'
UNION ALL
SELECT 'EXPECTED_PERMISSION','service_role.report_rpc.EXECUTE',
 COALESCE(has_function_privilege('service_role',
  to_regprocedure('public.v014_community_report(uuid,text,text,text,text)'),'EXECUTE'),false),'must_be_true'
ORDER BY category,object_name;
ROLLBACK;
