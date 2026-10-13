-- v0.13.5.1 — READ ONLY schema readiness for Owner Account Management.
-- Do not run old migrations again. This script changes NOTHING.
select item, present from (
 values
 ('public.profiles',to_regclass('public.profiles') is not null),
 ('public.account_private_identity',to_regclass('public.account_private_identity') is not null),
 ('public.test_account_profiles',to_regclass('public.test_account_profiles') is not null),
 ('public.test_account_credentials',to_regclass('public.test_account_credentials') is not null),
 ('public.admin_roles',to_regclass('public.admin_roles') is not null),
 ('public.admin_user_roles',to_regclass('public.admin_user_roles') is not null),
 ('public.admin_audit_log',to_regclass('public.admin_audit_log') is not null),
 ('public.account_deletion_events',to_regclass('public.account_deletion_events') is not null),
 ('public.site_orders',to_regclass('public.site_orders') is not null),
 ('public.site_subscriptions',to_regclass('public.site_subscriptions') is not null),
 ('public.checkout_intents',to_regclass('public.checkout_intents') is not null),
 ('public.order_entitlement_ledger_v135',to_regclass('public.order_entitlement_ledger_v135') is not null)
) as x(item,present);
select table_name,column_name from information_schema.columns
where table_schema='public' and table_name in ('profiles','account_private_identity','test_account_credentials','account_deletion_events')
and column_name in ('id','user_id','first_name','last_name','username','account_kind','ciphertext','iv','date_of_birth','reason','updated_at')
order by table_name,column_name;
select role_code,name from public.admin_roles
where role_code in ('OWNER','ADMIN','MODERATOR','SHOWCASE_VIEWER') order by role_code;
