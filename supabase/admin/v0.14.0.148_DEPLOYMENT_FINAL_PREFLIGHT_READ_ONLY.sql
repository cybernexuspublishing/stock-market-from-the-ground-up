-- v0.14.0.148 | Deployment 08 of 08 | Owner-run, READ ONLY, one-result audit.
-- PROJECT: The Stock Market: From the Ground Up.
-- No schema changes, grants, deletes, provider calls, secrets, personal rows or payments.
-- Structure/privilege metadata ALONE does not certify actual RLS behavior.
WITH objects(category,qualified,mandatory) AS (
 VALUES
 ('identity','public.profiles',true),
 ('roles','public.admin_user_roles',true),
 ('roles','public.admin_user_flags',true),
 ('billing','public.platform_plans',true),
 ('billing','public.user_plan_grants',true),
 ('billing','public.checkout_intents',true),
 ('billing','public.payment_webhook_events',true),
 ('learning','public.lab_training_attempts_v014',false),
 ('learning','public.competency_evidence',false),
 ('journal','public.decision_journal',true),
 ('tutor','public.gu_member_tutor_exchanges_v014102',false),
 ('tutor','public.gu_ai_service_requests_v014103',false),
 ('tutor','public.gu_tutor_rate_bucket_v014107',false),
 ('tools','public.tool_workspace_records',false),
 ('forum','public.commons_topics',false),
 ('forum','public.commons_posts',false),
 ('forum','public.forum_reports',false),
 ('legal','public.legal_documents',false)
),
table_state AS (
 SELECT o.category,o.qualified,o.mandatory,to_regclass(o.qualified) AS oid
 FROM objects o
),
functions_expected(qualified_name,mandatory) AS (
 VALUES
 ('public.user_has_tool_access',true),
 ('public.gu_v014102_save_member_tutor_exchange',false),
 ('public.gu_v014103_reserve_ai_request',false),
 ('public.gu_v014107_take_tutor_request',false),
 ('public.gu_mod_case_transition_v01424',false)
),
function_state AS (
 SELECT f.qualified_name,f.mandatory,
   count(p.oid) AS definitions,
   bool_or(CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('anon',p.oid,'EXECUTE') END) AS anon_execute,
   bool_or(CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('authenticated',p.oid,'EXECUTE') END) AS authenticated_execute,
   bool_or(CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('service_role',p.oid,'EXECUTE') END) AS service_execute
 FROM functions_expected f
 LEFT JOIN pg_namespace n ON n.nspname=split_part(f.qualified_name,'.',1)
 LEFT JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(f.qualified_name,'.',2)
 GROUP BY f.qualified_name,f.mandatory
)
SELECT 'D08_FINAL_READ_ONLY_PREFLIGHT' AS report_code,
 current_database() AS target_database,
 now() AS executed_at_utc,
 (SELECT jsonb_agg(jsonb_build_object(
  'category',category,'relation',qualified,'mandatory',mandatory,
  'present',oid IS NOT NULL,
  'rls',CASE WHEN oid IS NULL THEN NULL ELSE (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=oid) END,
  'anon_select',CASE WHEN oid IS NULL THEN NULL ELSE has_table_privilege('anon',oid,'SELECT') END,
  'authenticated_select',CASE WHEN oid IS NULL THEN NULL ELSE has_table_privilege('authenticated',oid,'SELECT') END,
  'service_select',CASE WHEN oid IS NULL THEN NULL ELSE has_table_privilege('service_role',oid,'SELECT') END
 ) ORDER BY category,qualified) FROM table_state) AS table_contracts,
 (SELECT jsonb_agg(jsonb_build_object(
   'function',qualified_name,'mandatory',mandatory,'definition_count',definitions,
   'anon_execute',COALESCE(anon_execute,false),
   'authenticated_execute',COALESCE(authenticated_execute,false),
   'service_execute',COALESCE(service_execute,false)
 ) ORDER BY qualified_name) FROM function_state) AS rpc_metadata,
 (SELECT count(*) FROM table_state WHERE mandatory AND oid IS NULL) AS missing_mandatory_relations,
 (SELECT count(*) FROM table_state WHERE mandatory AND oid IS NOT NULL AND
   NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=table_state.oid)) AS mandatory_tables_without_rls,
 'CATALOG_ONLY_DOES_NOT_CONFIRM_MEMBER_ISOLATION, LIVE_PAYMENTS, LICENSES, LEGAL_REVIEW, CLOUD_BACKUPS, OR MARKET_VALIDITY' AS limitation;
-- OWNER must preserve the result separately, review privilege exceptions, then
-- run REAL multi-account/role, commerce and historical-data source tests.
-- Do not repeatedly apply old migration files or infer production acceptance.
