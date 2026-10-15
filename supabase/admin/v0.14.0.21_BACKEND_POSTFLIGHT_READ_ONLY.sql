-- v0.14.0.21 | RUN AFTER OWNER-APPROVED STAGED MIGRATION. READ ONLY.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)') IS NOT NULL AS get_installed,
 to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)') IS NOT NULL AS set_installed,
 has_function_privilege('authenticated',to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)'),'EXECUTE') AS auth_can_get,
 has_function_privilege('authenticated',to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)'),'EXECUTE') AS auth_can_set,
 has_function_privilege('anon',to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)'),'EXECUTE') AS anon_can_get,
 has_function_privilege('anon',to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)'),'EXECUTE') AS anon_can_set;
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
 p.prosecdef AS security_definer,p.proconfig AS hardened_search_path
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('gu_commons_subscription_get_v01421','gu_commons_subscription_set_v01421');
-- No user identifiers or notification content are returned by this check.
ROLLBACK;
