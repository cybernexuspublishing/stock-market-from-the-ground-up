-- Cyber Nexus v0.14.0.40 | Stripe shadow SECURITY verification (READ ONLY)
-- Run in existing Supabase SQL Editor only, under database owner context.
BEGIN TRANSACTION READ ONLY;
WITH checks AS (
 SELECT 'Isolated settings exist' AS check_name,to_regclass('public.gu39_sandbox_settings') IS NOT NULL AS passed
 UNION ALL SELECT 'Isolated intents exist',to_regclass('public.gu39_sandbox_intents') IS NOT NULL
 UNION ALL SELECT 'Isolated webhook events exist',to_regclass('public.gu39_sandbox_events') IS NOT NULL
 UNION ALL SELECT 'Isolated access ledger exists',to_regclass('public.gu39_sandbox_access') IS NOT NULL
 UNION ALL SELECT 'Sandbox settings RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_settings')),false)
 UNION ALL SELECT 'Sandbox intents RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_intents')),false)
 UNION ALL SELECT 'Sandbox webhook events RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_events')),false)
 UNION ALL SELECT 'Sandbox access RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_access')),false)
 UNION ALL SELECT 'Anonymous cannot write sandbox intents',NOT coalesce(has_table_privilege('anon',to_regclass('public.gu39_sandbox_intents'),'INSERT'),false)
 UNION ALL SELECT 'Members cannot write sandbox events',NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu39_sandbox_events'),'INSERT'),false)
 UNION ALL SELECT 'Members cannot write sandbox access',NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu39_sandbox_access'),'UPDATE'),false)
 UNION ALL SELECT 'Shadow RPC is service only',NOT coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)'),'EXECUTE'),false)
 UNION ALL SELECT 'Service role can apply shadow events',coalesce(has_function_privilege('service_role',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)'),'EXECUTE'),false)
)
SELECT check_name,CASE WHEN passed THEN 'PASS' ELSE 'REVIEW' END AS status FROM checks ORDER BY check_name;
ROLLBACK;
