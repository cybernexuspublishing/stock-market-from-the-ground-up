-- Read only. Execute only on the separate staging Supabase database.
BEGIN TRANSACTION READ ONLY;
WITH required(name) AS (VALUES ('platform_plans'),('platform_tools'),('site_subscriptions'),('user_plan_grants'),('user_tool_passes'),('site_orders'),('admin_user_roles'),('admin_user_flags'),('gu_digital_payment_route_v01432r2'))
SELECT name,to_regclass(format('public.%I',name)) IS NOT NULL AS installed FROM required ORDER BY name;
SELECT name,to_regprocedure(name) IS NOT NULL AS installed FROM (VALUES
 ('public.gu_digital_payment_route_get_v01432r2()'),
 ('public.gu_stripe_apply_event_v01438(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text)')
) t(name);
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN
 ('gu_stripe_checkout_intents_v01438','gu_stripe_events_v01438');
ROLLBACK;
