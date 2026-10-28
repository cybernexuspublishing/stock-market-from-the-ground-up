-- Market Commons role-aware oversight and nonpublished-content RLS correction.
-- 2026-10-28. No Stripe, founder votes, member entitlements, or forum content modified.
-- Staff eligibility is based on database roles/permissions; never on mutable user_metadata.
CREATE OR REPLACE FUNCTION public.gu_commons_staff_read_v20261028()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $staff$
DECLARE v_uid uuid := auth.uid();
BEGIN
 IF v_uid IS NULL THEN RETURN false; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.profiles p
   WHERE p.id=v_uid AND p.account_kind='member' AND p.deleted_at IS NULL
 ) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_flags f
            WHERE f.user_id=v_uid AND f.status IN ('restricted','suspended')) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_roles r
            WHERE r.user_id=v_uid AND r.role_code='SHOWCASE_VIEWER'
              AND (r.expires_at IS NULL OR r.expires_at>now())) THEN RETURN false; END IF;
 RETURN EXISTS (
   SELECT 1 FROM public.admin_user_roles r
   WHERE r.user_id=v_uid AND (r.expires_at IS NULL OR r.expires_at>now())
     AND (r.role_code='OWNER' OR (
       r.role_code IN ('ADMIN','MODERATOR')
       AND EXISTS (SELECT 1 FROM public.admin_role_permissions rp
                   WHERE rp.role_code=r.role_code AND rp.permission_code='forum.view')
     ))
 );
END $staff$;
REVOKE ALL ON FUNCTION public.gu_commons_staff_read_v20261028() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_commons_staff_read_v20261028() TO authenticated,service_role;
COMMENT ON FUNCTION public.gu_commons_staff_read_v20261028() IS
  'Staff-only visibility predicate for forum SELECT gates; not a mutation, paid benefit, or founder voting entitlement.';

-- Keep all original book/tool/founder membership conditions, adding only the
-- early authorized staff visibility branch after member/showcase/suspension checks.
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
REVOKE ALL ON FUNCTION public.v0143_commons_can_open(boolean,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v0143_commons_can_open(boolean,boolean,text,text) TO authenticated,service_role;

-- Previous v0143 policies were PERMISSIVE and let any entitled member read
-- arbitrary nonpublished topics/replies. Retain original authored/published
-- member policies and separately grant staff visibility to restricted records.
DROP POLICY IF EXISTS v0143_commons_topic_read_gate ON public.commons_topics;
DROP POLICY IF EXISTS v0143_commons_post_read_gate ON public.commons_posts;
DROP POLICY IF EXISTS gu_commons_staff_topics_read_v20261028 ON public.commons_topics;
CREATE POLICY gu_commons_staff_topics_read_v20261028 ON public.commons_topics
 FOR SELECT TO authenticated
 USING (public.gu_commons_staff_read_v20261028() AND EXISTS(
   SELECT 1 FROM public.commons_forums f WHERE f.forum_code=commons_topics.forum_code
 ));
DROP POLICY IF EXISTS gu_commons_staff_posts_read_v20261028 ON public.commons_posts;
CREATE POLICY gu_commons_staff_posts_read_v20261028 ON public.commons_posts
 FOR SELECT TO authenticated
 USING (public.gu_commons_staff_read_v20261028() AND EXISTS(
   SELECT 1 FROM public.commons_topics t WHERE t.id=commons_posts.topic_id
 ));
-- RLS remains enabled. No direct member UPDATE/DELETE permissions are added.
