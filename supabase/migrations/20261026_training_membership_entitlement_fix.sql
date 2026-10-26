-- SELLABLE BETA PRODUCT 01: Historical Replay Learning ($19.99/mo).
-- Correct an existing paid-plan / training-tool contract omission. NO new plan,
-- Stripe modification, charge, seat, Store switch or member record.
-- Member-granted ONDEMAND_MONTHLY can access ONLY ONDEMAND_TRAINING,
-- not books, Tutors, Journals, or a proprietary trading simulator.
BEGIN;
DO $preflight$
DECLARE src text; plan public.platform_plans%ROWTYPE;
BEGIN
 SELECT * INTO STRICT plan FROM public.platform_plans WHERE plan_code='ONDEMAND_MONTHLY';
 IF plan.price_cents<>1999 OR plan.billing_interval<>'month'
    OR plan.includes_all_tools IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'TRAINING_PLAN_TERMS_CHANGED'; END IF;
 SELECT pg_get_functiondef('public.user_has_tool_access(uuid,text)'::regprocedure) INTO src;
 IF position('g.starts_at<=now()' in src)=0
    OR position('p.includes_all_tools=true' in src)=0
    OR position('up.tool_code=target_tool' in src)=0
    OR position('ONDEMAND_MONTHLY' in src)>0
 THEN RAISE EXCEPTION 'TRAINING_ACCESS_FUNCTION_DRIFT'; END IF;
END $preflight$;

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

 -- Only the $19.99/month training product receives this exact tool access.
 -- Require a real, unrestricted member; do not grant from a catalog listing,
 -- stale billing status, identity metadata, or an expired subscription.
 IF target_tool='ONDEMAND_TRAINING'
  AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=target_user
    AND p.account_kind='member' AND p.deleted_at IS NULL)
  AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=target_user
    AND f.status IN ('suspended','restricted'))
  AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=target_user
    AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
  AND (
    EXISTS(SELECT 1 FROM public.user_plan_grants g
      WHERE g.user_id=target_user AND g.plan_code='ONDEMAND_MONTHLY'
       AND g.status IN ('active','trialing') AND g.starts_at<=now()
       AND (g.ends_at IS NULL OR g.ends_at>now()))
    OR EXISTS(SELECT 1 FROM public.site_subscriptions s
      WHERE s.user_id=target_user AND s.plan_code='ONDEMAND_MONTHLY'
       AND s.status IN ('active','trialing')
       AND s.current_period_end IS NOT NULL AND s.current_period_end>now())
  )
 THEN RETURN true; END IF;
 RETURN false;
END;
$function$;

-- This is a behavioral correction only. Preserve grants and frozen commercial
-- configuration; write one scoped append-only Admin audit entry.
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('training_subscription_entitlement_contract_fix','membership_access','ONDEMAND_MONTHLY',
 jsonb_build_object('fixed_tool','ONDEMAND_TRAINING','price_cents',1999,
 'payment_or_checkout_changed',false,'grant_records_changed',false,
 'reason','Previously active ONDEMAND_MONTHLY did not authorize its training tool'));
COMMIT;
