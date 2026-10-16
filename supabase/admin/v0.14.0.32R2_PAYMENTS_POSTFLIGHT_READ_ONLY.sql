-- v0.14.0.32-R2: READ ONLY, single result set. No payment/customer identifiers selected.
BEGIN TRANSACTION READ ONLY;
WITH checks(name,passed) AS (VALUES
 ('routing_table',to_regclass('public.gu_digital_payment_route_v01432r2') IS NOT NULL),
 ('event_receipts_table',to_regclass('public.gu_stripe_managed_test_events_v01432r2') IS NOT NULL),
 ('route_reader',to_regprocedure('public.gu_digital_payment_route_get_v01432r2()') IS NOT NULL),
 ('owner_reader',to_regprocedure('public.gu_owner_digital_payment_route_read_v01432r2()') IS NOT NULL),
 ('owner_saver',to_regprocedure('public.gu_owner_digital_payment_route_save_v01432r2(text,boolean,timestamp with time zone)') IS NOT NULL),
 ('route_row_off',EXISTS(SELECT 1 FROM public.gu_digital_payment_route_v01432r2
      WHERE channel='digital' AND provider='STRIPE_MANAGED' AND enabled=false)),
 ('route_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_digital_payment_route_v01432r2')),false)),
 ('no_anon_write',NOT coalesce(has_table_privilege('anon','public.gu_digital_payment_route_v01432r2','UPDATE'),false)),
 ('no_member_write',NOT coalesce(has_table_privilege('authenticated','public.gu_digital_payment_route_v01432r2','UPDATE'),false)),
 ('anon_saver_denied',NOT coalesce(has_function_privilege('anon',
      to_regprocedure('public.gu_owner_digital_payment_route_save_v01432r2(text,boolean,timestamp with time zone)'),'EXECUTE'),false)),
 ('event_table_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_stripe_managed_test_events_v01432r2')),false))
)
SELECT name,coalesce(passed,false) AS passed FROM checks ORDER BY name;
ROLLBACK;
