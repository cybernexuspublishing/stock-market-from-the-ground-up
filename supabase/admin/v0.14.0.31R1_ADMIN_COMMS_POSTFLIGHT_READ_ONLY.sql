-- v0.14.0.31-R1 ONE result grid; READ ONLY.
-- All TRUE is object-install evidence, not substitute for negative-role authenticated tests.
BEGIN TRANSACTION READ ONLY;
WITH checks(label,pass) AS (VALUES
 ('staff_role_guard',to_regprocedure('public.gu_staff_identity_v01431r1()') IS NOT NULL),
 ('staff_comms_console',to_regprocedure('public.gu_staff_console_v01431r1()') IS NOT NULL),
 ('owner_control_save',to_regprocedure('public.gu_owner_operations_save_v01431r1(text,boolean)') IS NOT NULL),
 ('staff_send_notice',to_regprocedure('public.gu_staff_send_notice_v01431r1(text,text,text,text)') IS NOT NULL),
 ('staff_shipping_guard',to_regprocedure('public.gu_staff_signed_shipping_session_v01431r1(uuid)') IS NOT NULL),
 ('staff_paid_order_queue',to_regprocedure('public.gu_staff_signed_orders_v01431r1()') IS NOT NULL),
 ('toggle_owner_messages_installed',EXISTS(SELECT 1 FROM public.site_settings WHERE setting_key='communications.owner_member_notices_enabled')),
 ('toggle_admin_messages_installed',EXISTS(SELECT 1 FROM public.site_settings WHERE setting_key='communications.admin_member_notices_enabled')),
 ('toggle_admin_shipping_installed',EXISTS(SELECT 1 FROM public.site_settings WHERE setting_key='commerce.admin_shipping_address_access_enabled')),
 ('toggle_lemon_installed',EXISTS(SELECT 1 FROM public.site_settings WHERE setting_key='commerce.checkout_enabled')),
 ('toggle_stripe_installed',EXISTS(SELECT 1 FROM public.site_settings WHERE setting_key='commerce.signed_books_checkout_enabled')),
 ('trigger_protected_site_settings_installed',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.site_settings') AND tgname='gu_v01431r1_protected_settings' AND tgenabled IN ('O','A'))),
 ('trigger_notice_policy_installed',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.user_notifications') AND tgname='gu_notice_send_policy_v01431r1' AND tgenabled IN ('O','A'))),
 ('anon_send_denied',NOT coalesce(has_function_privilege('anon',to_regprocedure('public.gu_staff_send_notice_v01431r1(text,text,text,text)'),'EXECUTE'),false)),
 ('anon_shipping_denied',NOT coalesce(has_function_privilege('anon',to_regprocedure('public.gu_staff_signed_shipping_session_v01431r1(uuid)'),'EXECUTE'),false)),
 ('anon_control_save_denied',NOT coalesce(has_function_privilege('anon',to_regprocedure('public.gu_owner_operations_save_v01431r1(text,boolean)'),'EXECUTE'),false)),
 ('staff_guard_not_directly_executable',NOT coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_staff_identity_v01431r1()'),'EXECUTE'),false))
)
SELECT label,coalesce(pass,false) AS pass FROM checks ORDER BY label;
ROLLBACK;
