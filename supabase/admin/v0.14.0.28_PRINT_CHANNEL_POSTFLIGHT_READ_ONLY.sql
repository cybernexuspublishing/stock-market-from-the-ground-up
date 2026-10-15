-- v0.14.0.28 | READ ONLY. Run after reviewed migration.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regprocedure('public.gu_owner_print_catalog_get_v01428()') IS NOT NULL AS get_installed,
 to_regprocedure('public.gu_owner_print_catalog_save_v01428(text,text,text,timestamptz)') IS NOT NULL AS save_installed,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_owner_print_catalog_get_v01428()'),'EXECUTE'),false) AS authenticated_has_get_grant,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_owner_print_catalog_save_v01428(text,text,text,timestamptz)'),'EXECUTE'),false) AS authenticated_has_save_grant,
 coalesce(has_function_privilege('anon',to_regprocedure('public.gu_owner_print_catalog_get_v01428()'),'EXECUTE'),false) AS anon_has_get_grant,
 coalesce(has_function_privilege('anon',to_regprocedure('public.gu_owner_print_catalog_save_v01428(text,text,text,timestamptz)'),'EXECUTE'),false) AS anon_has_save_grant;
SELECT p.proname,p.prosecdef AS security_definer,p.proconfig AS function_config
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE '%print%v01428';
-- Grants to authenticated are guarded WITHIN RPC by actual OWNER role; test with
-- two JWTs (regular member 42501 vs owner) in staging before enabling links.
ROLLBACK;
