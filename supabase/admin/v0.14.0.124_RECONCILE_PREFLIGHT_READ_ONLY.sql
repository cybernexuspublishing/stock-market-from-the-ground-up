-- v124 owner-safe read-only Supabase prerequisite verification.
WITH checks(label,ready) AS (
 VALUES
 ('GU58 signed intent registry',to_regclass('public.gu58_live_checkout_intents') IS NOT NULL),
 ('GU58 plan subscriptions',to_regclass('public.site_subscriptions') IS NOT NULL),
 ('GU58 tool subscriptions',to_regclass('public.user_tool_passes') IS NOT NULL),
 ('v123 billing outbox installed',to_regclass('public.gu_billing_notice_outbox_v014123') IS NOT NULL)
)
SELECT label,CASE WHEN ready THEN 'PASS' ELSE 'BLOCKED' END result FROM checks ORDER BY label;
