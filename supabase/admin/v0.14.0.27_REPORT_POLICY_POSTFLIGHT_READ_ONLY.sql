-- Cyber Nexus / v0.14.0.27 | OWNER REPORT POLICY — POSTFLIGHT (READ ONLY)
-- Run ONLY after a staging-reviewed and explicitly Owner-approved v0.14.0.17
-- policy migration, not as proof that such approval has occurred.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regclass('public.community_report_policy_v01417') IS NOT NULL AS policy_table_installed,
 to_regprocedure('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)') IS NOT NULL AS owner_save_rpc_installed,
 COALESCE((SELECT c.relrowsecurity FROM pg_class c
  WHERE c.oid=to_regclass('public.community_report_policy_v01417')),false) AS policy_rls_enabled,
 COALESCE(has_table_privilege('anon',to_regclass('public.community_report_policy_v01417'),'SELECT'),false) AS anon_direct_select,
 COALESCE(has_table_privilege('authenticated',to_regclass('public.community_report_policy_v01417'),'SELECT'),false) AS member_direct_select,
 COALESCE(has_function_privilege('anon',
  to_regprocedure('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)'),'EXECUTE'),false) AS anon_may_save,
 COALESCE(has_function_privilege('authenticated',
  to_regprocedure('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)'),'EXECUTE'),false) AS member_may_save,
 COALESCE(has_function_privilege('service_role',
  to_regprocedure('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)'),'EXECUTE'),false) AS server_may_save;
ROLLBACK;
