-- v0.14.0.49 | Cyber Nexus | Stripe TEST shadow-lifecycle preflight | READ ONLY
-- Document ID: GU-WEB-STRIPE-READINESS-014049-20261017
-- SQL Editor of EXISTING Supabase project only. No writes, grants or schema modifications.
BEGIN TRANSACTION READ ONLY;
WITH checks(area,check_name,passed) AS (
 SELECT 'Tables','Owner test switch exists',to_regclass('public.gu39_sandbox_settings') IS NOT NULL
 UNION ALL SELECT 'Tables','Checkout intents exist',to_regclass('public.gu39_sandbox_intents') IS NOT NULL
 UNION ALL SELECT 'Tables','Webhook events exist',to_regclass('public.gu39_sandbox_events') IS NOT NULL
 UNION ALL SELECT 'Tables','Isolated test entitlements exist',to_regclass('public.gu39_sandbox_access') IS NOT NULL
 UNION ALL SELECT 'RPC','Owner status exists',to_regprocedure('public.gu39_sandbox_owner_read()') IS NOT NULL
 UNION ALL SELECT 'RPC','Owner toggle exists',to_regprocedure('public.gu39_sandbox_owner_toggle(boolean,timestamp with time zone)') IS NOT NULL
 UNION ALL SELECT 'RPC','Shadow service apply exists',
  to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)') IS NOT NULL
 UNION ALL SELECT 'RLS','Settings table RLS',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_settings')),false)
 UNION ALL SELECT 'RLS','Intents table RLS',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_intents')),false)
 UNION ALL SELECT 'RLS','Events table RLS',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_events')),false)
 UNION ALL SELECT 'RLS','Test access table RLS',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu39_sandbox_access')),false)
 UNION ALL SELECT 'Privileges','Anonymous cannot read shadow settings',
  NOT coalesce(has_table_privilege('anon',to_regclass('public.gu39_sandbox_settings'),'SELECT'),false)
 UNION ALL SELECT 'Privileges','Authenticated member cannot insert shadow event',
  NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu39_sandbox_events'),'INSERT'),false)
 UNION ALL SELECT 'Privileges','Authenticated member cannot update test access',
  NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu39_sandbox_access'),'UPDATE'),false)
 UNION ALL SELECT 'Privileges','Member cannot execute shadow apply',
  NOT coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)'),'EXECUTE'),false)
 UNION ALL SELECT 'Privileges','Service role can execute shadow apply',
  coalesce(has_function_privilege('service_role',to_regprocedure('public.gu39_shadow_apply(text,uuid,text,text,integer,text,text,text,text,text,timestamp with time zone,timestamp with time zone)'),'EXECUTE'),false)
 UNION ALL SELECT 'Deduplication','Webhook event ID is primary key',
  EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.gu39_sandbox_events')
   AND contype='p' AND pg_get_constraintdef(oid) LIKE '%event_id%')
 UNION ALL SELECT 'Deduplication','Checkout session is unique',
  EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.gu39_sandbox_intents')
   AND contype='u' AND pg_get_constraintdef(oid) LIKE '%session_id%')
 UNION ALL SELECT 'Isolation','Anonymous cannot read shadow access',
  NOT coalesce(has_table_privilege('anon',to_regclass('public.gu39_sandbox_access'),'SELECT'),false)
)
SELECT area,check_name,CASE WHEN passed THEN 'PASS' ELSE 'REVIEW' END AS status,passed
FROM checks ORDER BY area,check_name;
ROLLBACK;
