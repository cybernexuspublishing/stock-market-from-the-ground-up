-- 2026-10-28 Owner requested all three verified Founder tiers read
-- common member discussions. Administrative hidden topic RLS is unchanged.
-- Lifetime retains earned Council eligibility exclusively from Founding 60.
-- Source from pg_get_functiondef in production before modification.
CREATE OR REPLACE FUNCTION public.gu_founder_commons_access_v014174(p_scope text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE uid uuid:=auth.uid(); earned text;
BEGIN
 IF uid IS NULL OR p_scope NOT IN ('shared','council') THEN RETURN false; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND account_kind='member' AND deleted_at IS NULL) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_flags WHERE user_id=uid AND status IN ('restricted','suspended')) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='SHOWCASE_VIEWER'
 AND (expires_at IS NULL OR expires_at>now())) THEN RETURN false; END IF;
 -- Owner-issued, expiring and noncommercial member QA may test the
 -- shared Founders Commons only, never Extended voting or paid benefits.
 IF p_scope='shared' AND public.gu_founder_noncommercial_qa_v014289(uid)
 THEN RETURN true; END IF;
 -- Owner can oversee private content and moderation without a synthetic entitlement.
 IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='OWNER'
 AND (expires_at IS NULL OR expires_at>now())) THEN RETURN true; END IF;
 SELECT earned_plan_code INTO earned FROM public.gu_founder_members_v014173
 WHERE user_id=uid AND revoked_at IS NULL;
 IF earned IS NULL THEN RETURN false; END IF;
 -- Higher tier privileges must be earned; a billing-record mistake cannot elevate Standard.
 IF p_scope='council' AND earned<>'FOUNDING_60' THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.site_subscriptions WHERE user_id=uid
   AND plan_code=CASE WHEN p_scope='council' THEN 'FOUNDING_60' ELSE plan_code END
   AND plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60')
   AND status IN ('active','trialing') AND current_period_end>now())
 THEN RETURN true; END IF;
 -- After upgrading to the separate Lifetime Membership, founding identity
 -- and earned Extended Council eligibility continue (not mere cancellation).
 IF p_scope='council' AND earned<>'FOUNDING_60' THEN RETURN false; END IF;
 RETURN (
 EXISTS (SELECT 1 FROM public.site_subscriptions WHERE user_id=uid
   AND plan_code='LIFETIME' AND status IN ('active','trialing'))
 OR EXISTS (SELECT 1 FROM public.user_plan_grants WHERE user_id=uid AND
 plan_code='LIFETIME' AND status IN ('active','trialing')
 AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()))
 );
END $function$;

CREATE OR REPLACE FUNCTION public.gu_founder_my_status_v014174()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE uid uuid:=auth.uid();n smallint;earned text;current_plan text;life boolean;
BEGIN
 IF uid IS NULL THEN RETURN jsonb_build_object('eligible',false);END IF;
 SELECT founder_number,earned_plan_code INTO n,earned FROM public.gu_founder_members_v014173
 WHERE user_id=uid AND revoked_at IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false);END IF;
 SELECT ss.plan_code INTO current_plan FROM public.site_subscriptions ss
 WHERE ss.user_id=uid AND ss.plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60')
 AND ss.status IN ('active','trialing') AND ss.current_period_end>now()
 ORDER BY ss.current_period_end DESC LIMIT 1;
 SELECT EXISTS(SELECT 1 FROM public.user_plan_grants g WHERE g.user_id=uid
 AND g.plan_code='LIFETIME' AND g.status IN ('active','trialing')
 AND (g.starts_at IS NULL OR g.starts_at<=now()) AND (g.ends_at IS NULL OR g.ends_at>now()))
 OR EXISTS(SELECT 1 FROM public.site_subscriptions ss WHERE ss.user_id=uid
 AND ss.plan_code='LIFETIME' AND ss.status IN ('active','trialing')) INTO life;
 RETURN jsonb_build_object('eligible',public.gu_founder_commons_access_v014174('shared'),
 'founderNumber',n,'earnedTier',earned,
 'currentPlan',CASE WHEN life THEN 'LIFETIME' ELSE current_plan END,
 'council',public.gu_founder_commons_access_v014174('council'));
END $function$;

CREATE OR REPLACE FUNCTION public.v0143_commons_can_open(p_active boolean, p_member_only boolean, p_book_code text, p_tool_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE uid uuid:=auth.uid(); k text; s text;
BEGIN
 IF uid IS NULL THEN RETURN false; END IF;
 SELECT account_kind INTO k FROM public.profiles WHERE id=uid;
 -- Separate read-only Showcase demonstrations MUST query synthetic views, not real forums.
 IF k IS DISTINCT FROM 'member' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='SHOWCASE_VIEWER'
   AND (expires_at IS NULL OR expires_at>now())) THEN RETURN false; END IF;
 SELECT status INTO s FROM public.admin_user_flags WHERE user_id=uid;
 IF s IN ('restricted','suspended') THEN RETURN false; END IF;
 -- Authorized real staff may inspect all forums, including private founders and inactive forums.
 -- This grants READ eligibility only. It does not grant founder benefits, ballots or moderation mutations.
 IF public.gu_commons_staff_read_v20261028() THEN RETURN true; END IF;
 IF p_active IS DISTINCT FROM true THEN RETURN false; END IF;
 -- The private Founders Commons sentinels are NEVER ordinary tool entitlements.
 IF p_tool_code IN ('FOUNDERS_COMMONS','FOUNDERS_COUNCIL') THEN
   RETURN public.gu_founder_commons_access_v014174(
     CASE WHEN p_tool_code='FOUNDERS_COUNCIL' THEN 'council' ELSE 'shared' END);
 END IF;
 -- A verified and currently eligible Founder of any 14/30/60 tier may read
 -- every PUBLISHED member discussion, including book and tool discussion
 -- boards; this NEVER grants access to book files, tool functions, hidden
 -- moderation content, or Founding 60-only Council.
 IF public.gu_founder_commons_access_v014174('shared') THEN RETURN true; END IF;
 -- Real authenticated members may read ordinary forums.
 IF NULLIF(p_book_code,'') IS NULL AND NULLIF(p_tool_code,'') IS NULL THEN RETURN true; END IF;
 -- Book curriculum discussion requires access to that book (or OWNER/eligible full library).
 IF NULLIF(p_book_code,'') IS NOT NULL THEN
  IF NOT (
   EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='OWNER'
     AND (expires_at IS NULL OR expires_at>now()))
   OR EXISTS(SELECT 1 FROM public.user_library WHERE user_id=uid AND product_code=p_book_code
     AND (expires_at IS NULL OR expires_at>now()))
   OR EXISTS(SELECT 1 FROM public.book_key_redemptions WHERE user_id=uid AND book_code=p_book_code
     AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()))
   OR EXISTS(SELECT 1 FROM public.user_plan_grants g JOIN public.platform_plans p ON p.plan_code=g.plan_code
      WHERE g.user_id=uid AND g.status IN ('active','trialing') AND p.includes_all_books=true
      AND (g.starts_at IS NULL OR g.starts_at<=now()) AND (g.ends_at IS NULL OR g.ends_at>now()))
   OR EXISTS(SELECT 1 FROM public.site_subscriptions ss JOIN public.platform_plans p ON p.plan_code=ss.plan_code
      WHERE ss.user_id=uid AND ss.status IN ('active','trialing') AND p.includes_all_books=true
      AND (ss.current_period_end IS NULL OR ss.current_period_end>now()))
  ) THEN RETURN false; END IF;
 END IF;
 IF NULLIF(p_tool_code,'') IS NOT NULL AND NOT public.user_has_tool_access(uid,p_tool_code) THEN
  RETURN false;
 END IF;
 RETURN true;
END; $function$;
