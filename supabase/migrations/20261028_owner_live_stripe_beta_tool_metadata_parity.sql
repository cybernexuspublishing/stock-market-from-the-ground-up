-- Reconcile legacy commerce labels with Owner's approved LIVE Stripe rollout.
-- Does not change member entitlements, prices, customer payments or privacy.
BEGIN;
UPDATE public.site_settings SET value='"STRIPE_MANAGED"'::jsonb,updated_at=now()
WHERE setting_key='commerce.payment_provider'
 AND value IS DISTINCT FROM '"STRIPE_MANAGED"'::jsonb;
UPDATE public.platform_tools
SET metadata=jsonb_set(metadata,'{beta_testing,live_payment_authorized}','true'::jsonb,true),
updated_at=now()
WHERE tool_code IN ('INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR')
 AND metadata->'beta_testing'->>'status'='ready_for_beta_testing'
 AND metadata->'beta_testing'->>'owner_approved'='true'
 AND (metadata->'beta_testing'->>'live_payment_authorized') IS DISTINCT FROM 'true';
INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
SELECT (SELECT user_id FROM public.admin_user_roles WHERE role_code='OWNER' AND (expires_at IS NULL OR expires_at>now()) ORDER BY granted_at LIMIT 1),
 'commerce.live_stripe_beta_tool_setting_reconciliation_20261028','catalog','LIVE_BETA_TOOLS',
 jsonb_build_object('provider','STRIPE_MANAGED','approved_beta_tool_codes',jsonb_build_array('INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'),
 'hidden_unaccepted_tools_remain_private',true,'no_transaction',true);
COMMIT;