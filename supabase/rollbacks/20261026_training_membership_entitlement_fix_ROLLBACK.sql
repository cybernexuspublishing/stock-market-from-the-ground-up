-- Reviewed emergency rollback restores the original function behavior.
-- WARNING: check actively paid ONDEMAND_MONTHLY users before any rollback;
-- a paid member must never silently lose the service they purchased.
BEGIN;
DO $guard$
BEGIN
 IF EXISTS(SELECT 1 FROM public.user_plan_grants WHERE plan_code='ONDEMAND_MONTHLY'
  AND status IN ('active','trialing') AND starts_at<=now()
  AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS(SELECT 1 FROM public.site_subscriptions WHERE plan_code='ONDEMAND_MONTHLY'
  AND status IN ('active','trialing') AND current_period_end>now())
 THEN RAISE EXCEPTION 'ACTIVE_CUSTOMER_TRAINING_ACCESS_MUST_BE_PRESERVED'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.user_has_tool_access(target_user uuid,target_tool text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE info jsonb;
BEGIN
 IF target_user IS NULL THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=target_user AND role_code='OWNER'
  AND (expires_at IS NULL OR expires_at>now())) THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.user_plan_grants g JOIN public.platform_plans p ON p.plan_code=g.plan_code
  WHERE g.user_id=target_user AND g.status IN ('active','trialing') AND g.starts_at<=now()
    AND (g.ends_at IS NULL OR g.ends_at>now()) AND p.includes_all_tools=true) THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.site_subscriptions s JOIN public.platform_plans p ON p.plan_code=s.plan_code
  WHERE s.user_id=target_user AND s.status IN ('active','trialing')
   AND (s.current_period_end IS NULL OR s.current_period_end>now()) AND p.includes_all_tools=true) THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.entitlements e WHERE e.user_id=target_user AND e.product_key='full_learning_access'
  AND e.status IN ('active','trialing') AND (e.ends_at IS NULL OR e.ends_at>now())) THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.user_tool_passes up WHERE up.user_id=target_user AND up.tool_code=target_tool
  AND up.status IN ('active','trialing')
  AND (coalesce(up.current_period_end,up.ends_at) IS NULL OR coalesce(up.current_period_end,up.ends_at)>now())) THEN RETURN true; END IF;
 RETURN false;
END;
$function$;
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('training_subscription_entitlement_emergency_rollback','membership_access','ONDEMAND_MONTHLY',
 jsonb_build_object('reason','Reviewed emergency rollback with no active paid training users',
 'payment_or_checkout_changed',false));
COMMIT;
