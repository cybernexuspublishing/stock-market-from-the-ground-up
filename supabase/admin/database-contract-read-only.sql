-- The Stock Market: From the Ground Up
-- v0.13.5.6 read-only production database contract and migration reconciliation.
-- Intentionally NO DDL/DML. Does not contain or output database secrets, email, passwords, individual PII.
-- Run after verifying the SQL Editor is pointed at the intended Supabase project.
BEGIN READ ONLY;

-- A. Actual runtime objects required by 0.13.5.4/0.13.5.5.
WITH needed(object_name) AS (VALUES
 ('site_modules_v1354'),('site_pages_v1354'),('site_branding_v1354'),
 ('site_forms_v1354'),('site_leads_v1354'),('site_automation_rules_v1354'),
 ('site_control_events_v1354'),('platform_labs'),('site_settings'),
 ('profiles'),('admin_user_roles'),('test_account_profiles'),
 ('user_plan_grants'),('user_library'),('user_tool_passes'),('platform_tools'),
 ('catalog_products'),('site_subscriptions'),('support_tickets'),('admin_audit_log')
) SELECT object_name,COALESCE(to_regclass('public.'||object_name)::text,'MISSING') AS database_object
FROM needed ORDER BY object_name;

-- B. Exact currently-installed function identity and privilege metadata.
SELECT n.nspname AS schema_name,p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       p.prosecdef AS security_definer,
       p.proconfig AS session_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS member_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
'v1355_owner_access_mutation','is_showcase_account_v135',
'my_platform_access','v135_apply_book_order','v135_ensure_catalog_kdp_safeguard')
ORDER BY p.proname;

-- C. All columns and required types for the missing two migrations, to compare
-- to source code before restoring or attempting further deployment.
SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN (
'site_modules_v1354','site_pages_v1354','site_branding_v1354',
'site_forms_v1354','site_leads_v1354','site_automation_rules_v1354',
'site_control_events_v1354','platform_labs','user_library','user_tool_passes',
'admin_audit_log','user_plan_grants','site_subscriptions')
ORDER BY table_name,ordinal_position;

-- D. RLS enablement (presence of RLS policy is not itself sufficient for security).
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS forced_rls,
       count(pol.oid) AS policy_count
FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
LEFT JOIN pg_policy pol ON pol.polrelid=c.oid
WHERE n.nspname='public' AND c.relkind='r'
AND c.relname IN ('site_modules_v1354','site_pages_v1354','site_branding_v1354',
'site_forms_v1354','site_leads_v1354','site_automation_rules_v1354',
'site_control_events_v1354','platform_labs','user_library','user_tool_passes')
GROUP BY c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity ORDER BY c.relname;

-- E. Grants, avoiding auth.secrets contents.
SELECT table_name,grantee,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN (
'site_modules_v1354','site_pages_v1354','site_branding_v1354',
'site_forms_v1354','site_leads_v1354','site_automation_rules_v1354',
'site_control_events_v1354','user_library','user_tool_passes')
ORDER BY table_name,grantee,privilege_type;

-- F. No direct SELECT against tables that may not exist on partially migrated projects.
-- Guarded inspection of object presence and selected columns for rollout flags.
-- Note: this diagnostic deliberately does not claim exact row counts or live prices.
SELECT named.object_name,
       to_regclass('public.'||named.object_name) AS resolved_table
FROM (VALUES ('platform_labs'),('site_feature_controls'),('platform_plans'))
     AS named(object_name);

-- G. Column introspection works even if a particular column was not deployed.
-- checkout_enabled is NOT guaranteed in all platform_plans migrations; do NOT reference
-- it in a direct SELECT unless its existence is confirmed in the active DB schema.
SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('platform_labs','site_feature_controls','platform_plans')
  AND column_name IN ('active','feature_code','enabled','plan_code','name',
                      'price_cents','public_visible','checkout_enabled')
ORDER BY table_name,column_name;


COMMIT;
