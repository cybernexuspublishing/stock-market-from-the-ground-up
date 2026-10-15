-- v0.14.0.29 STAGING READ ONLY — objects & grant evidence, not production authorization acceptance
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regprocedure('public.gu_owner_print_modes_get_v01429()') IS NOT NULL AS get_installed,
 to_regprocedure('public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)') IS NOT NULL AS save_installed,
 COALESCE(has_function_privilege('anon',to_regprocedure('public.gu_owner_print_modes_get_v01429()'),'EXECUTE'),false) AS anon_get,
 COALESCE(has_function_privilege('anon',to_regprocedure('public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)'),'EXECUTE'),false) AS anon_save,
 COALESCE(has_function_privilege('authenticated',to_regprocedure('public.gu_owner_print_modes_get_v01429()'),'EXECUTE'),false) AS authenticated_get,
 COALESCE(has_function_privilege('authenticated',to_regprocedure('public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)'),'EXECUTE'),false) AS authenticated_save,
 COALESCE((SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure('public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)')),false) AS save_security_definer,
 COALESCE((SELECT 'search_path=pg_catalog,pg_temp'=ANY(proconfig) FROM pg_proc
  WHERE oid=to_regprocedure('public.gu_owner_print_modes_save_v01429(text,boolean,boolean,timestamptz)')),false) AS hardened_search_path;
ROLLBACK;
