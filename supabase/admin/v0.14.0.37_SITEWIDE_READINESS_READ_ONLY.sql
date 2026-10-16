-- Cyber Nexus / The Stock Market: From the Ground Up — v0.14.0.37
-- READ ONLY; installation checks, NOT evidence of successful Stripe transactions.
BEGIN TRANSACTION READ ONLY;
WITH checks(label,passed) AS (VALUES
 ('platform_plans',to_regclass('public.platform_plans') IS NOT NULL),
 ('platform_tools',to_regclass('public.platform_tools') IS NOT NULL),
 ('user_plan_grants',to_regclass('public.user_plan_grants') IS NOT NULL),
 ('user_tool_passes',to_regclass('public.user_tool_passes') IS NOT NULL),
 ('site_subscriptions',to_regclass('public.site_subscriptions') IS NOT NULL),
 ('site_orders',to_regclass('public.site_orders') IS NOT NULL),
 ('site_order_items',to_regclass('public.site_order_items') IS NOT NULL),
 ('market_commons_topics',to_regclass('public.commons_topics') IS NOT NULL),
 ('moderation_reports',to_regclass('public.forum_reports') IS NOT NULL),
 ('notification_preferences',to_regclass('public.gu_commons_notification_prefs_v01420') IS NOT NULL),
 ('member_messages',to_regclass('public.user_notifications') IS NOT NULL),
 ('digital_books',to_regclass('public.gu_digital_books_v01430') IS NOT NULL),
 ('private_digital_bucket',EXISTS(SELECT 1 FROM storage.buckets WHERE id='gu-digital-ebooks' AND public IS FALSE)),
 ('stripe_test_checkout_receipts',to_regclass('public.gu_stripe_managed_test_sessions_v01432r2') IS NOT NULL),
 ('stripe_test_event_ledger',to_regclass('public.gu_stripe_managed_test_events_v01432r2') IS NOT NULL),
 ('stripe_payment_route',to_regclass('public.gu_digital_payment_route_v01432r2') IS NOT NULL),
 ('stripe_route_rpc',to_regprocedure('public.gu_digital_payment_route_get_v01432r2()') IS NOT NULL),
 ('owner_staff_password_guard',to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NOT NULL)
)
SELECT label,COALESCE(passed,false) AS passed FROM checks ORDER BY label;
ROLLBACK;
