-- Disposable CI PostgreSQL ONLY. Snapshot of CURRENT production
-- public.user_has_tool_access(uuid,text) retrieved READ ONLY from stock-market
-- Supabase project oxihglyfgzywsupnyicb on 2026-10-26. Do not apply to live.
-- This brings the previous v014060 *minimal* schema closer to production
-- before testing paid tool entitlement, authorization, and period boundaries.
\set ON_ERROR_STOP on
ALTER TABLE public.profiles ADD COLUMN account_kind text NOT NULL DEFAULT 'member';
ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.admin_user_flags ADD COLUMN status text;
ALTER TABLE public.entitlements ADD COLUMN starts_at timestamptz;
ALTER TABLE public.user_tool_passes ADD COLUMN starts_at timestamptz;
CREATE TABLE public.plan_tool_access(plan_code text,tool_code text);
INSERT INTO public.profiles(id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.user_has_tool_access(target_user uuid, target_tool text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
REVOKE ALL ON FUNCTION public.user_has_tool_access(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tool_access(uuid,text) TO service_role;
