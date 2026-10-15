-- v0.14.0.24 | Run AFTER staging-reviewed, Owner-approved migration; READ ONLY.
-- No report details, account identifiers or audit notes selected.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regprocedure('public.gu_mod_case_actor_v01424()') IS NOT NULL AS private_actor_helper,
 to_regprocedure('public.gu_mod_case_list_v01424(text,integer)') IS NOT NULL AS list_installed,
 to_regprocedure('public.gu_mod_case_transition_v01424(bigint,text,text,text)') IS NOT NULL AS transition_installed,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_mod_case_list_v01424(text,integer)'),'EXECUTE'),false) AS auth_can_list,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_mod_case_transition_v01424(bigint,text,text,text)'),'EXECUTE'),false) AS auth_can_transition,
 coalesce(has_function_privilege('anon',to_regprocedure('public.gu_mod_case_list_v01424(text,integer)'),'EXECUTE'),false) AS anon_can_list,
 coalesce(has_function_privilege('anon',to_regprocedure('public.gu_mod_case_transition_v01424(bigint,text,text,text)'),'EXECUTE'),false) AS anon_can_transition,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_mod_case_actor_v01424()'),'EXECUTE'),false) AS auth_can_invoke_private_helper;
SELECT proname,prosecdef AS security_definer,proconfig AS hardened_search_path
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
AND proname IN ('gu_mod_case_actor_v01424','gu_mod_case_list_v01424','gu_mod_case_transition_v01424');
ROLLBACK;
