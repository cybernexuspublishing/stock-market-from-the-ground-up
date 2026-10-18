-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.58
-- Document ID GU-WEB-PAY-LIVE-PREFLIGHT-014058-20261017
-- READ ONLY. No migrations or authorizations. No member/payment rows returned.
-- Review before executing proposed LIVE entitlement adapter migration.
BEGIN TRANSACTION READ ONLY;
WITH checks(area, requirement, passed) AS (
 SELECT 'Dependency','Existing member profile table',to_regclass('public.profiles') IS NOT NULL
 UNION ALL SELECT 'Dependency','Site subscription entitlement table',to_regclass('public.site_subscriptions') IS NOT NULL
 UNION ALL SELECT 'Dependency','Tool access entitlement table',to_regclass('public.user_tool_passes') IS NOT NULL
 UNION ALL SELECT 'Dependency','Lifetime plan grants',to_regclass('public.user_plan_grants') IS NOT NULL
 UNION ALL SELECT 'Dependency','Order and reimbursement audit ledger',to_regclass('public.site_orders') IS NOT NULL
 UNION ALL SELECT 'Dependency','Canonical plans and prices',to_regclass('public.platform_plans') IS NOT NULL
 UNION ALL SELECT 'Dependency','Canonical tools and prices',to_regclass('public.platform_tools') IS NOT NULL
 UNION ALL SELECT 'Access','RLS enabled on subscriptions',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.site_subscriptions')),false)
 UNION ALL SELECT 'Access','RLS enabled on tool access',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.user_tool_passes')),false)
 UNION ALL SELECT 'Access','RLS enabled on lifetime grants',
  coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.user_plan_grants')),false)
 UNION ALL SELECT 'Constraint','Tool pass includes paused status',
  coalesce((SELECT position('paused' in pg_get_constraintdef(x.oid))>0
    FROM pg_constraint x WHERE x.conrelid=to_regclass('public.user_tool_passes')
    AND x.contype='c' AND pg_get_constraintdef(x.oid) LIKE '%status%'
    ORDER BY x.oid LIMIT 1),false)
 UNION ALL SELECT 'Contract','LIVE checkout intent installed (after review)',
  to_regclass('public.gu58_live_checkout_intents') IS NOT NULL
 UNION ALL SELECT 'Contract','LIVE webhook event ledger installed (after review)',
  to_regclass('public.gu58_live_stripe_events') IS NOT NULL
 UNION ALL SELECT 'Contract','LIVE service-only event RPC installed (after review)',
  to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)') IS NOT NULL
 UNION ALL SELECT 'Isolation','Anonymous denied LIVE event read',
  NOT coalesce(has_table_privilege('anon',to_regclass('public.gu58_live_stripe_events'),'SELECT'),false)
 UNION ALL SELECT 'Isolation','Members denied LIVE ledger mutation',
  NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu58_live_checkout_intents'),'UPDATE'),false)
 UNION ALL SELECT 'Isolation','Members denied LIVE event RPC execution',
  NOT coalesce(has_function_privilege('authenticated',
   to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)'),'EXECUTE'),false)
 UNION ALL SELECT 'Isolation','Service role can apply LIVE signed events (after review)',
  coalesce(has_function_privilege('service_role',
   to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)'),'EXECUTE'),false)
)
SELECT area, requirement, CASE WHEN passed THEN 'PASS' ELSE 'REVIEW' END AS status
FROM checks ORDER BY area,requirement;
ROLLBACK;
