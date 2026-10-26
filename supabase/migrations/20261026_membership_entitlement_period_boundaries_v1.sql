-- SMFGU entitlement boundary v1.1, 2026-10-26.
-- Purpose: validate member identity, current grants and exact plan/tool scope.
-- No catalog, customer, Stripe, credit, or LIVE checkout records modified.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.platform_plans WHERE plan_code='FREE'
   AND active=true AND includes_all_tools=false AND includes_all_books=false)
  OR EXISTS(SELECT 1 FROM public.plan_tool_access WHERE plan_code='FREE')
 THEN RAISE EXCEPTION 'FREE_PLAN_POLICY_DRIFT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.plan_tool_access
   WHERE plan_code='ONDEMAND_MONTHLY' AND tool_code='ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'TRAINING_ACCESS_MAPPING_MISSING'; END IF;
 IF has_function_privilege('anon','public.user_has_tool_access(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.user_has_tool_access(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'PRIVATE_ENTITLEMENT_RPC_EXPOSED'; END IF;
END $preflight$;
-- Preserve all currently valid, real member-facing tool benefits. Planned
-- tools are intentionally outside current delivery; non-member and restricted
-- identities are intentionally excluded from the compatibility assertion.
CREATE TEMP TABLE _smfgu_entitlement_before ON COMMIT DROP AS
SELECT p.id AS user_id,t.tool_code,
 public.user_has_tool_access(p.id,t.tool_code) AS was_allowed
FROM public.profiles p CROSS JOIN public.platform_tools t
WHERE p.account_kind='member' AND p.deleted_at IS NULL
 AND t.active=true AND t.status IN ('live','beta')
 AND NOT EXISTS (SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p.id
  AND lower(f.status) IN ('suspended','restricted'))
 AND NOT EXISTS (SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p.id
  AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()));

CREATE OR REPLACE FUNCTION public.user_has_tool_access(target_user uuid,target_tool text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $entitlement$
BEGIN
 IF target_user IS NULL OR target_tool IS NULL OR length(target_tool)>80 THEN RETURN false; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.id=target_user
  AND p.account_kind='member' AND p.deleted_at IS NULL) THEN RETURN false; END IF;
 IF EXISTS(
  SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=target_user
  AND lower(f.status) IN ('suspended','restricted')) THEN RETURN false; END IF;
 IF EXISTS(
  SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=target_user
  AND r.role_code='SHOWCASE_VIEWER'
  AND (r.expires_at IS NULL OR r.expires_at>now())) THEN RETURN false; END IF;

 -- Owner test authority is separate from ordinary paid-plan access. Keep it
 -- limited to known tools, not an arbitrary client-supplied entitlement code.
 IF EXISTS (SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=target_user
   AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN EXISTS(SELECT 1 FROM public.platform_tools t WHERE t.tool_code=target_tool); END IF;

 -- Catalog visibility and checkout are *not* entitlements. Only released
 -- live/beta tools may be used in currently delivered membership features.
 IF NOT EXISTS (SELECT 1 FROM public.platform_tools t WHERE t.tool_code=target_tool
   AND t.active=true AND t.status IN ('live','beta')) THEN RETURN false; END IF;

 -- Owner/admin-issued plan grants are preserved, including audited no-expiry
 -- QA grants. Inactive plans and future/expired terms never confer access.
 IF EXISTS (
  SELECT 1 FROM public.user_plan_grants g
  JOIN public.platform_plans p ON p.plan_code=g.plan_code
  WHERE g.user_id=target_user AND p.active=true
   AND g.status IN ('active','trialing')
   AND g.starts_at IS NOT NULL AND g.starts_at<=now()
   AND (g.ends_at IS NULL OR g.ends_at>now())
   AND (p.includes_all_tools=true
     OR EXISTS(SELECT 1 FROM public.plan_tool_access m
       WHERE m.plan_code=g.plan_code AND m.tool_code=target_tool))
 ) THEN RETURN true; END IF;

 -- Provider-managed subscriptions must retain an actual paid term;
 -- null/current-period-less active recurring rows cannot grant forever.
 IF EXISTS (
  SELECT 1 FROM public.site_subscriptions s
  JOIN public.platform_plans p ON p.plan_code=s.plan_code
  WHERE s.user_id=target_user AND p.active=true
   AND s.status IN ('active','trialing')
   AND ((p.billing_interval='lifetime' AND s.current_period_end IS NULL)
     OR (s.current_period_end IS NOT NULL AND s.current_period_end>now()))
   AND (p.includes_all_tools=true
     OR EXISTS(SELECT 1 FROM public.plan_tool_access m
       WHERE m.plan_code=s.plan_code AND m.tool_code=target_tool))
 ) THEN RETURN true; END IF;

 -- This legacy full-learning record is an explicit administrative grant,
 -- not a customer invoice. Preserve active grants but enforce effective dates.
 IF EXISTS (
  SELECT 1 FROM public.entitlements e WHERE e.user_id=target_user
  AND e.product_key='full_learning_access' AND e.status IN ('active','trialing')
  AND (e.starts_at IS NULL OR e.starts_at<=now())
  AND (e.ends_at IS NULL OR e.ends_at>now())
 ) THEN RETURN true; END IF;

 IF EXISTS (
  SELECT 1 FROM public.user_tool_passes up
  WHERE up.user_id=target_user AND up.tool_code=target_tool
  AND up.status IN ('active','trialing')
  AND (up.starts_at IS NULL OR up.starts_at<=now())
  AND (up.ends_at IS NULL OR up.ends_at>now())
  AND (up.current_period_end IS NULL OR up.current_period_end>now())
  AND (up.provider IS NULL OR up.ends_at IS NOT NULL OR up.current_period_end IS NOT NULL)
 ) THEN RETURN true; END IF;
 RETURN false;
END;
$entitlement$;
REVOKE ALL ON FUNCTION public.user_has_tool_access(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tool_access(uuid,text) TO service_role;
DO $postflight$
DECLARE lost integer;
BEGIN
 SELECT count(*) INTO lost FROM _smfgu_entitlement_before b
 WHERE b.was_allowed=true
 AND public.user_has_tool_access(b.user_id,b.tool_code) IS DISTINCT FROM true;
 IF lost>0 THEN RAISE EXCEPTION 'EXISTING_CURRENTLY_VALID_MEMBER_TOOL_ENTITLEMENT_LOST_COUNT_%',lost; END IF;
 IF public.user_has_tool_access('00000000-0000-4000-8000-000000000000'::uuid,'MARKET_SIMULATOR')
 THEN RAISE EXCEPTION 'NONEXISTENT_MEMBER_GAINED_TOOL'; END IF;
 IF public.user_has_tool_access('00000000-0000-4000-8000-000000000000'::uuid,'ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'NONEXISTENT_MEMBER_GAINED_TRAINING'; END IF;
 IF EXISTS (SELECT 1 FROM public.plan_tool_access WHERE plan_code='FREE')
 THEN RAISE EXCEPTION 'FREE_PLAN_GAINED_PAID_TOOL'; END IF;
 IF has_function_privilege('anon','public.user_has_tool_access(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.user_has_tool_access(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'ENTITLEMENT_RPC_PRIVILEGES_REGRESSED'; END IF;
END $postflight$;
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('membership_entitlement_period_boundaries_v1','membership_access','ALL',
jsonb_build_object('version','20261026-v1.1','no_live_payment_changed',true,
 'no_membership_grants_changed',true,'free_plan_unchanged',true,
 'qa_grant_sources_preserved',true,'current_delivery_preserved',true,
 'policy','active member; not deleted/restricted/Showcase; active plan; effective dates; provider end; exact mapped tool'));
COMMIT;