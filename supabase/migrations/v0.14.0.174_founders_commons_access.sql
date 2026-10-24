-- Founders Commons private access v0.14.0.174: LIVE Supabase additive extension.
-- Uses EXISTING Market Commons forums/topics/posts RPCs and restrictive RLS, not another forum.
CREATE OR REPLACE FUNCTION public.gu_founder_commons_access_v014174(p_scope text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $acc$
DECLARE uid uuid:=auth.uid(); earned text;
BEGIN
 IF uid IS NULL OR p_scope NOT IN ('shared','council') THEN RETURN false; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND account_kind='member' AND deleted_at IS NULL) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_flags WHERE user_id=uid AND status IN ('restricted','suspended')) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='SHOWCASE_VIEWER'
 AND (expires_at IS NULL OR expires_at>now())) THEN RETURN false; END IF;
 -- Owner can oversee private content and moderation without a synthetic entitlement.
 IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='OWNER'
 AND (expires_at IS NULL OR expires_at>now())) THEN RETURN true; END IF;
 SELECT earned_plan_code INTO earned FROM public.gu_founder_members_v014173
 WHERE user_id=uid AND revoked_at IS NULL;
 IF earned IS NULL THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.site_subscriptions WHERE user_id=uid
   AND plan_code=CASE WHEN p_scope='council' THEN 'FOUNDING_60' ELSE plan_code END
   AND plan_code IN ('FOUNDING_30','FOUNDING_60')
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
END $acc$;
REVOKE ALL ON FUNCTION public.gu_founder_commons_access_v014174(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_commons_access_v014174(text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.v0143_commons_can_open(
  p_active boolean, p_member_only boolean, p_book_code text, p_tool_code text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); k text; s text;
BEGIN
 IF p_active IS DISTINCT FROM true OR uid IS NULL THEN RETURN false; END IF;
 SELECT account_kind INTO k FROM public.profiles WHERE id=uid;
 -- Separate read-only Showcase demonstrations MUST query synthetic views, not real forums.
 IF k IS DISTINCT FROM 'member' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='SHOWCASE_VIEWER'
   AND (expires_at IS NULL OR expires_at>now())) THEN RETURN false; END IF;
 SELECT status INTO s FROM public.admin_user_flags WHERE user_id=uid;
 IF s='suspended' THEN RETURN false; END IF;
 -- The private Founders Commons sentinels are NEVER ordinary tool entitlements.
 IF p_tool_code IN ('FOUNDERS_COMMONS','FOUNDERS_COUNCIL') THEN
   RETURN public.gu_founder_commons_access_v014174(
     CASE WHEN p_tool_code='FOUNDERS_COUNCIL' THEN 'council' ELSE 'shared' END);
 END IF;
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
END; $$;
INSERT INTO public.commons_forums(forum_code,section_name,name,description,active,member_only,book_code,tool_code,sort_order)
VALUES ('F600_HEADQUARTERS','Founders Commons','Founders Headquarters','Official announcements, welcome, benefits, known issues, release notes',true,true,NULL,'FOUNDERS_COMMONS',810),
('F600_LOUNGE','Founders Commons','Founders Lounge','Introductions, questions, milestones, general founder discussions',true,true,NULL,'FOUNDERS_COMMONS',820),
('F600_BUGS','Founders Commons','Bug Reports and Technical Issues','Login, dashboard, Labs, Boot Camps, Talia, mobile, accessibility; private billing issues belong in Support',true,true,NULL,'FOUNDERS_COMMONS',830),
('F600_SUGGESTIONS','Founders Commons','Suggestions and Product Development','Features, dashboard, navigation, teaching, learning tools and member experience',true,true,NULL,'FOUNDERS_COMMONS',840),
('F600_LEARNING','Founders Commons','Learning and Trading Education','Candles, VWAP, EMA9/EMA20, market structure, tape, risk and educational trade reviews',true,true,NULL,'FOUNDERS_COMMONS',850),
('F600_MEMBERSHIP','Founders Commons','Memberships, Purchases and Sparks','30/60 day founding tiers, lifetime discounts, Crownlight Sparks and general billing guidance',true,true,NULL,'FOUNDERS_COMMONS',860),
('F600_COUNCIL','Founders Commons','Founding Design Council','Extended Founder design ballots, theme selection, Talia presentation and Founder''s Choice',true,true,NULL,'FOUNDERS_COUNCIL',870),
('F600_TRACKER','Founders Commons','Feedback and Development Tracker','Submitted, review, accepted, development, released, deferred and declined ideas',true,true,NULL,'FOUNDERS_COMMONS',880)
ON CONFLICT(forum_code) DO NOTHING;
CREATE OR REPLACE FUNCTION public.gu_founder_my_status_v014174()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $s$
DECLARE uid uuid:=auth.uid(); n smallint; tier text;
BEGIN
 IF uid IS NULL THEN RETURN jsonb_build_object('eligible',false); END IF;
 SELECT founder_number,earned_plan_code INTO n,tier FROM public.gu_founder_members_v014173 WHERE user_id=uid AND revoked_at IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false); END IF;
 RETURN jsonb_build_object('eligible',public.gu_founder_commons_access_v014174('shared'),'founderNumber',n,
 'earnedTier',tier,'council',public.gu_founder_commons_access_v014174('council'));
END $s$;
REVOKE ALL ON FUNCTION public.gu_founder_my_status_v014174() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_my_status_v014174() TO authenticated;