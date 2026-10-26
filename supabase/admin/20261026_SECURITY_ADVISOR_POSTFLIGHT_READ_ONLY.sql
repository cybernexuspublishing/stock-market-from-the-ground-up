-- 2026-10-26 Security Advisor investigation — READ ONLY.
-- Intended for Supabase SQL Editor after deployment of
-- supabase/migrations/20261026_restrict_anon_my_platform_access.sql.
-- Do not add policies to service-only tables solely to suppress advisory INFO.

SELECT 'platform_access_rpc' AS control,
  has_function_privilege('anon','public.my_platform_access()','EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated','public.my_platform_access()','EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role','public.my_platform_access()','EXECUTE') AS service_role_can_execute;

WITH no_policy AS (
 SELECT c.oid,c.relname
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
 AND NOT EXISTS(SELECT 1 FROM pg_policies p
   WHERE p.schemaname=n.nspname AND p.tablename=c.relname)
)
SELECT COUNT(*) AS rls_without_policy,
 COUNT(*) FILTER (WHERE
   has_table_privilege('anon',oid,'SELECT') OR
   has_table_privilege('anon',oid,'INSERT') OR
   has_table_privilege('anon',oid,'UPDATE') OR
   has_table_privilege('anon',oid,'DELETE')
 ) AS with_anon_direct_grants,
 COUNT(*) FILTER (WHERE
   has_table_privilege('authenticated',oid,'SELECT') OR
   has_table_privilege('authenticated',oid,'INSERT') OR
   has_table_privilege('authenticated',oid,'UPDATE') OR
   has_table_privilege('authenticated',oid,'DELETE')
 ) AS with_authenticated_direct_grants
FROM no_policy;

SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
AND (has_function_privilege('anon',p.oid,'EXECUTE') OR
     has_function_privilege('authenticated',p.oid,'EXECUTE'))
ORDER BY anon_can_execute DESC,p.proname;
