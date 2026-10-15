-- Cyber Nexus / v0.14.0.27 — RESOLVE v0.14.0.26 FALSE SEARCH_PATH CHECK
-- More robust than the earlier exact string comparison; does not modify any SQL.
-- This is a catalog-only introspection, NOT a staged rollback test.
BEGIN TRANSACTION READ ONLY;
WITH p AS (
 SELECT oid,prosecdef,proconfig,
  COALESCE((SELECT regexp_replace(lower(c),'[[:space:]"'']','','g')
    FROM unnest(proconfig) c WHERE c LIKE 'search_path=%' LIMIT 1),'') AS normalized_path
 FROM pg_proc WHERE oid=to_regprocedure('public.gu_report_status_audit_v01426()')
)
SELECT
 oid IS NOT NULL AS function_installed,
 prosecdef AS security_definer,
 proconfig::text AS actual_pg_proc_configuration,
 normalized_path,
 (normalized_path='search_path=pg_catalog,pg_temp') AS catalog_first_and_temp_only,
 COALESCE(has_function_privilege('anon',oid,'EXECUTE'),false) AS anon_execute,
 COALESCE(has_function_privilege('authenticated',oid,'EXECUTE'),false) AS authenticated_execute
FROM p;
ROLLBACK;
