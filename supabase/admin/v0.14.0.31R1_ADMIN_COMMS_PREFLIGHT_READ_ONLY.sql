-- v0.14.0.31-R1 single-result preflight: READ ONLY; no changes to production.
BEGIN TRANSACTION READ ONLY;
WITH checks(label,installed) AS (VALUES
 ('profiles',to_regclass('public.profiles') IS NOT NULL),
 ('admin_roles',to_regclass('public.admin_user_roles') IS NOT NULL),
 ('admin_flags',to_regclass('public.admin_user_flags') IS NOT NULL),
 ('site_settings',to_regclass('public.site_settings') IS NOT NULL),
 ('admin_audit_log',to_regclass('public.admin_audit_log') IS NOT NULL),
 ('user_notifications',to_regclass('public.user_notifications') IS NOT NULL),
 ('v31_signed_orders',to_regclass('public.gu_signed_book_orders_v01431') IS NOT NULL),
 ('v28_owner_guard',to_regprocedure('public.gu_print_owner_guard_v01428()') IS NOT NULL),
 ('staff_comms_migration_not_yet_applied',to_regprocedure('public.gu_staff_console_v01431r1()') IS NULL))
SELECT label,coalesce(installed,false) AS pass FROM checks ORDER BY label;
ROLLBACK;
