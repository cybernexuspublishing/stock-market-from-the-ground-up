-- Read-only pre/post flight (no member personal information returned).
BEGIN READ ONLY;
SELECT plan_code,price_cents,billing_interval,includes_all_tools,checkout_enabled,
 metadata->>'checkout_ready' AS checkout_ready
 FROM public.platform_plans WHERE plan_code='ONDEMAND_MONTHLY';
SELECT count(*) FILTER(WHERE plan_code='ONDEMAND_MONTHLY' AND status IN('active','trialing')
 AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now())) AS active_plan_grants
 FROM public.user_plan_grants;
SELECT count(*) FILTER(WHERE plan_code='ONDEMAND_MONTHLY' AND status IN('active','trialing')
 AND current_period_end>now()) AS active_subscriptions FROM public.site_subscriptions;
SELECT position('target_tool=''ONDEMAND_TRAINING''' in
 pg_get_functiondef('public.user_has_tool_access(uuid,text)'::regprocedure))>0
 AS training_entitlement_branch_present;
SELECT count(*) AS related_admin_audit_entries FROM public.admin_audit_log
 WHERE action='training_subscription_entitlement_contract_fix';
ROLLBACK;
