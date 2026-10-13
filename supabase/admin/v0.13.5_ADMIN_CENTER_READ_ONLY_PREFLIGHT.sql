-- Optional read-only production preflight for the Operations & Intelligence view.
-- Does not modify database objects, permissions, feature flags, or rows.
-- The existing v0.13.5 SQL migrations should NOT be rerun.
select system_name, found
from (
  values
  ('Profiles',to_regclass('public.profiles') is not null),
  ('Admin roles',to_regclass('public.admin_user_roles') is not null),
  ('Admin permissions',to_regclass('public.admin_role_permissions') is not null),
  ('Support tickets',to_regclass('public.support_tickets') is not null),
  ('Notifications',to_regclass('public.user_notifications') is not null),
  ('Announcements',to_regclass('public.site_announcements') is not null),
  ('Checkout intents',to_regclass('public.checkout_intents') is not null),
  ('Payment webhooks',to_regclass('public.payment_webhook_events') is not null),
  ('Order entitlement ledger',to_regclass('public.order_entitlement_ledger_v135') is not null),
  ('Platform Labs',to_regclass('public.platform_labs') is not null),
  ('Lab progress',to_regclass('public.site_lab_progress') is not null),
  ('Competency definitions',to_regclass('public.competency_definitions') is not null),
  ('Assessment attempts',to_regclass('public.competency_attempts_v135') is not null),
  ('Replay records',to_regclass('public.replay_practice_sessions_v135') is not null),
  ('Admin audit',to_regclass('public.admin_audit_log') is not null),
  ('User flags',to_regclass('public.admin_user_flags') is not null),
  ('Site settings',to_regclass('public.site_settings') is not null)
) as req(system_name,found)
order by system_name;
