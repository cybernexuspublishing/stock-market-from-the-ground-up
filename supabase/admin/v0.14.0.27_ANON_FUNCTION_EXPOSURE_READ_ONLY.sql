-- Cyber Nexus / The Stock Market: From the Ground Up | v0.14.0.27
-- ONE RESULT SET: exact anonymous-executable SECURITY DEFINER function inventory.
-- READ ONLY. No personal records, report contents, keys, or function bodies.
-- IMPORTANT: EXECUTE granted to anon DOES NOT prove an exploitable vulnerability;
-- inspect auth.uid() checks, exposed return shapes, grants and caller paths.
BEGIN TRANSACTION READ ONLY;
WITH functions AS (
 SELECT p.oid,p.proname,p.prosecdef,p.proconfig,
   format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) AS signature,
   has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
   has_function_privilege('authenticated',p.oid,'EXECUTE') AS member_exec,
   COALESCE((SELECT regexp_replace(lower(c),'[[:space:]"'']','','g')
      FROM unnest(p.proconfig) AS c WHERE c LIKE 'search_path=%' LIMIT 1),'') AS normalized_search_path
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
)
SELECT 'ANON_DEFINER'::text AS category,signature AS object_name,
 CASE WHEN anon_exec THEN 'REVIEW' ELSE 'NOT_EXPOSED' END AS status,
 'anonymous_execute='||anon_exec::text||'; member_execute='||member_exec::text||
 '; search_path='||COALESCE(NULLIF(normalized_search_path,''),'NOT_EXPLICIT') AS evidence
FROM functions WHERE prosecdef AND anon_exec
UNION ALL
SELECT 'AUDIT_GUARD_PATH',signature,
 CASE WHEN normalized_search_path='search_path=pg_catalog,pg_temp'
 THEN 'PASS' ELSE 'REVIEW' END,
 'actual pg_proc normalized '||COALESCE(NULLIF(normalized_search_path,''),'NOT_EXPLICIT')
FROM functions WHERE proname='gu_report_status_audit_v01426' AND signature='public.gu_report_status_audit_v01426()'
UNION ALL
SELECT 'MEMBER_ACCESS_ANON',signature,
 CASE WHEN anon_exec THEN 'REVIEW' ELSE 'PASS' END,
 'The historical implementation returns an anonymous FREE-tier response when auth.uid() is null; review caller/return contract before revoking.'
FROM functions WHERE signature='public.my_platform_access()'
ORDER BY category,object_name;
ROLLBACK;
