-- v0.13.5.2 - optional READ ONLY account-administration prerequisites
-- Does not create records, change permissions, or enable feature flags.
SELECT name, to_regclass('public.'||name) IS NOT NULL AS exists_in_database
FROM (VALUES ('profiles'),('admin_user_roles'),('admin_roles'),('admin_audit_log'),
 ('account_private_identity'),('test_account_profiles'),('test_account_credentials'),
 ('user_plan_grants'),('platform_plans'),('account_deletion_events'),
 ('site_orders'),('site_subscriptions'),('checkout_intents'),('order_entitlement_ledger_v135')) x(name)
ORDER BY name;
SELECT role_code, name FROM public.admin_roles
WHERE role_code IN ('OWNER','ADMIN','MODERATOR','SHOWCASE_VIEWER') ORDER BY role_code;
SELECT setting_key, value FROM public.site_settings
WHERE setting_key IN ('commerce.checkout_enabled','site.version') ORDER BY setting_key;
