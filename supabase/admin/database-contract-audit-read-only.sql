-- READ ONLY. Execute optionally in Supabase SQL Editor. No migrations are executed.
-- Avoid selecting columns that might not exist in some deployed schema versions.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, current_schema() AS active_schema, current_setting('server_version') AS postgresql_version;
WITH required(schema_name,relation_name,reason) AS (
  VALUES
    ('public','profiles','account display/authorization'),
    ('public','admin_user_roles','Owner staff role checks'),
    ('public','platform_labs','historical Labs when this catalog table is deployed'),
    ('public','competency_definitions','skill curriculum'),
    ('public','competency_evidence','scored skill evidence'),
    ('public','site_settings','homepage member stats'),
    ('public','member_presence_v01353','recent member activity'),
    ('public','site_pages_v1354','site builder / managed pages; verify actual table name'),
    ('public','platform_plans','membership plan registry'),
    ('public','commons_forums','Market Commons categories'),
    ('public','commons_topics','Market Commons discussions'),
    ('public','commons_posts','Market Commons replies'),
    ('public','test_account_credentials','encrypted disposable credentials')
)
SELECT schema_name,relation_name,reason,
       to_regclass(format('%I.%I',schema_name,relation_name)) IS NOT NULL AS relation_exists
FROM required ORDER BY relation_name;
SELECT n.nspname AS schema_name,c.relname AS relation_name,c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND c.relname IN ('profiles','admin_user_roles','competency_definitions','competency_evidence',
                    'commons_forums','commons_topics','commons_posts','test_account_credentials')
ORDER BY c.relname;
SELECT schemaname,tablename,policyname,cmd,roles
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('profiles','admin_user_roles','competency_evidence',
                    'commons_topics','commons_posts','test_account_credentials')
ORDER BY tablename,policyname;
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS signature
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND
 (p.proname ILIKE 'v1354_%' OR p.proname ILIKE 'v1355_%'
  OR p.proname ILIKE 'commons_%' OR p.proname ILIKE 'forum_%')
ORDER BY proname,signature;
SELECT c.table_name,c.column_name,c.data_type
FROM information_schema.columns c
WHERE c.table_schema='public' AND c.table_name IN ('platform_plans','site_settings','profiles')
  AND c.column_name IN ('checkout_enabled','setting_key','value','account_kind','username')
ORDER BY table_name,column_name;
ROLLBACK;
