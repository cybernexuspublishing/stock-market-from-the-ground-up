-- v0.14.0.32-R2: READ ONLY, single result set. Run AFTER R1 postflight.
BEGIN TRANSACTION READ ONLY;
SELECT 'r1_staff_identity' AS check_name,
 to_regprocedure('public.gu_staff_identity_v01431r1()') IS NOT NULL AS passed
UNION ALL SELECT 'r1_password_stepup',to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NOT NULL
UNION ALL SELECT 'site_settings',to_regclass('public.site_settings') IS NOT NULL
UNION ALL SELECT 'admin_audit_log',to_regclass('public.admin_audit_log') IS NOT NULL
UNION ALL SELECT 'r2_route_not_preinstalled',to_regclass('public.gu_digital_payment_route_v01432r2') IS NULL;
ROLLBACK;
