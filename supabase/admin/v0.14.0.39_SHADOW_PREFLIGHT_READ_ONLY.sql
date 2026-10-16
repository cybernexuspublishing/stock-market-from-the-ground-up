-- Cyber Nexus v0.14.0.39 | READ ONLY | One exportable result table.
-- Run first in the existing Supabase project; no rows are modified.
BEGIN TRANSACTION READ ONLY;
WITH checks AS (
 SELECT 'Prerequisite'::text AS area,'Owner identity function'::text AS check_name,
 to_regprocedure('public.gu_staff_identity_v01431r1()') IS NOT NULL AS passed
 UNION ALL SELECT 'Prerequisite','Password reconfirmation function',
 to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NOT NULL
 UNION ALL SELECT 'Prerequisite','Owner audit log exists',to_regclass('public.admin_audit_log') IS NOT NULL
 UNION ALL SELECT 'Stripe v38','Existing checkout intent table',to_regclass('public.gu_stripe_checkout_intents_v01438') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Sandbox settings table',to_regclass('public.gu39_sandbox_settings') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Sandbox test intents table',to_regclass('public.gu39_sandbox_intents') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Sandbox event ledger',to_regclass('public.gu39_sandbox_events') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Isolated shadow entitlement table',to_regclass('public.gu39_sandbox_access') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Owner read RPC',to_regprocedure('public.gu39_sandbox_owner_read()') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Owner toggle RPC',to_regprocedure('public.gu39_sandbox_owner_toggle(boolean,timestamp with time zone)') IS NOT NULL
 UNION ALL SELECT 'Stripe v39','Service-only shadow event RPC',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)') IS NOT NULL
 UNION ALL SELECT 'Security','Shadow settings RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_settings')),false)
 UNION ALL SELECT 'Security','Shadow intents RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_intents')),false)
 UNION ALL SELECT 'Security','Shadow events RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_events')),false)
 UNION ALL SELECT 'Security','Shadow access RLS',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_access')),false)
 UNION ALL SELECT 'Security','Ordinary users denied shadow event INSERT',
 NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu39_sandbox_events'),'INSERT'),false)
 UNION ALL SELECT 'Security','Anonymous denied shadow settings SELECT',
 NOT coalesce(has_table_privilege('anon',to_regclass('public.gu39_sandbox_settings'),'SELECT'),false)
 UNION ALL SELECT 'Security','Member denied service shadow RPC EXECUTE',
 NOT coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)'),'EXECUTE'),false)
 UNION ALL SELECT 'Security','Service role can execute shadow RPC',
 coalesce(has_function_privilege('service_role',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)'),'EXECUTE'),false)
)
SELECT area,check_name,CASE WHEN passed THEN 'PASS' ELSE 'REVIEW' END AS status,passed
FROM checks ORDER BY area,check_name;
ROLLBACK;
