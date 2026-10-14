-- READ ONLY; run AFTER an independently reviewed migration.
SELECT policy_id,quota_enabled,quota_max,quota_hours,duplicate_enabled,duplicate_hours,
 version,updated_at,updated_by FROM public.community_report_policy_v01417;
SELECT c.relname,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='community_report_policy_v01417';
SELECT 'report' AS rpc,has_function_privilege('anon',
 'public.v014_community_report(uuid,text,text,text,text)','EXECUTE') AS anon_exec,
 has_function_privilege('authenticated','public.v014_community_report(uuid,text,text,text,text)','EXECUTE') AS authenticated_exec,
 has_function_privilege('service_role','public.v014_community_report(uuid,text,text,text,text)','EXECUTE') AS service_exec
UNION ALL
SELECT 'owner_save',has_function_privilege('anon',
 'public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)','EXECUTE'),
 has_function_privilege('authenticated','public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)','EXECUTE'),
 has_function_privilege('service_role','public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)','EXECUTE');
-- Expected anon/authenticated EXECUTE=false and service_role EXECUTE=true.
