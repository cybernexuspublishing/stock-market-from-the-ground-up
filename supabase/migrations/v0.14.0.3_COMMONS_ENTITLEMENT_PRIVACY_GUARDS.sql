-- v0.14.0.3.1: transactional Market Commons visibility and write guards.
-- Apply after v0.14.0.2_owner_account_identity_override.sql and v0.14.0.1 forum guards.
-- Idempotent policy/function replacement. NO paid enrollment or content publication.
BEGIN;

-- Evaluate forum membership against CURRENT production entitlements, not URL/UI state.
-- Authenticated SELECT RLS requires EXECUTE on this permission-safe, caller-scoped helper.
-- It returns only a boolean about the authenticated caller and never discloses forum content.
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
REVOKE ALL ON FUNCTION public.v0143_commons_can_open(boolean,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_commons_can_open(boolean,boolean,text,text) TO authenticated,service_role;

-- Replace permissive legacy reads. A policy that only hides forum index links
-- would still leak discussions through direct PostgREST queries.
DROP POLICY IF EXISTS "members read commons forums" ON public.commons_forums;
CREATE POLICY "members read commons forums" ON public.commons_forums FOR SELECT TO authenticated
USING (public.v0143_commons_can_open(active,member_only,book_code,tool_code));
DROP POLICY IF EXISTS "members read commons topics" ON public.commons_topics;
CREATE POLICY "members read commons topics" ON public.commons_topics FOR SELECT TO authenticated
USING ((status='published' OR author_user_id=auth.uid()) AND EXISTS(
 SELECT 1 FROM public.commons_forums f WHERE f.forum_code=commons_topics.forum_code));
DROP POLICY IF EXISTS "members read commons posts" ON public.commons_posts;
CREATE POLICY "members read commons posts" ON public.commons_posts FOR SELECT TO authenticated
USING ((status='published' OR author_user_id=auth.uid()) AND EXISTS(
 SELECT 1 FROM public.commons_topics t WHERE t.id=commons_posts.topic_id));

-- Defense in depth: a future or pre-existing permissive policy must not reopen
-- paid/book/tool forum data. RESTRICTIVE policies combine with all permissive reads.
DROP POLICY IF EXISTS v0143_commons_forum_read_gate ON public.commons_forums;
CREATE POLICY v0143_commons_forum_read_gate ON public.commons_forums AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_commons_can_open(active,member_only,book_code,tool_code));
DROP POLICY IF EXISTS v0143_commons_topic_read_gate ON public.commons_topics;
CREATE POLICY v0143_commons_topic_read_gate ON public.commons_topics AS RESTRICTIVE FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.commons_forums f WHERE f.forum_code=commons_topics.forum_code));
DROP POLICY IF EXISTS v0143_commons_post_read_gate ON public.commons_posts;
CREATE POLICY v0143_commons_post_read_gate ON public.commons_posts AS RESTRICTIVE FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.commons_topics t WHERE t.id=commons_posts.topic_id));

-- Authentication state and book/tool rights are checked again in direct RPCs.
CREATE OR REPLACE FUNCTION public.commons_create_topic(p_forum_code text,p_title text,p_body text,p_ticker text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); topic_id bigint; flag text; kind text; f public.commons_forums%rowtype;
 quota integer; cnt integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT account_kind INTO kind FROM public.profiles WHERE id=uid;
 IF kind IS DISTINCT FROM 'member' OR EXISTS(SELECT 1 FROM public.admin_user_roles
   WHERE user_id=uid AND role_code='SHOWCASE_VIEWER' AND (expires_at IS NULL OR expires_at>now()))
 THEN RAISE EXCEPTION 'This account cannot publish production discussions'; END IF;
 SELECT status INTO flag FROM public.admin_user_flags WHERE user_id=uid;
 IF flag IN ('restricted','suspended') THEN RAISE EXCEPTION 'Posting is restricted'; END IF;
 SELECT * INTO f FROM public.commons_forums WHERE forum_code=p_forum_code;
 IF NOT FOUND OR NOT public.v0143_commons_can_open(f.active,f.member_only,f.book_code,f.tool_code)
 THEN RAISE EXCEPTION 'Forum requires additional access'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 5 AND 180 OR
   length(trim(coalesce(p_body,''))) NOT BETWEEN 10 AND 10000 OR
   length(coalesce(p_ticker,''))>16 THEN RAISE EXCEPTION 'Invalid discussion length'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,142011));
 SELECT CASE WHEN jsonb_typeof(value)='number' AND (value #>> '{}')~'^[0-9]{1,4}$'
     THEN least(500,greatest(1,(value #>> '{}')::int)) ELSE 10 END INTO quota
 FROM public.site_settings WHERE setting_key='community.max_topics_per_24h';
 SELECT count(*) INTO cnt FROM public.commons_topics WHERE author_user_id=uid
   AND created_at>now()-interval '24 hours';
 IF cnt>=coalesce(quota,10) THEN RAISE EXCEPTION 'Daily discussion quota reached'; END IF;
 INSERT INTO public.commons_topics(forum_code,author_user_id,title,body,ticker)
 VALUES(p_forum_code,uid,trim(p_title),trim(p_body),nullif(upper(trim(coalesce(p_ticker,''))),''))
 RETURNING id INTO topic_id;
 RETURN topic_id;
END; $$;
REVOKE ALL ON FUNCTION public.commons_create_topic(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commons_create_topic(text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.commons_create_reply(p_topic_id bigint,p_body text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); reply_id bigint; flag text; kind text; f public.commons_forums%rowtype;
 quota integer; cnt integer; parent public.commons_topics%rowtype;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT account_kind INTO kind FROM public.profiles WHERE id=uid;
 IF kind IS DISTINCT FROM 'member' OR EXISTS(SELECT 1 FROM public.admin_user_roles
   WHERE user_id=uid AND role_code='SHOWCASE_VIEWER' AND (expires_at IS NULL OR expires_at>now()))
 THEN RAISE EXCEPTION 'This account cannot publish production replies'; END IF;
 SELECT status INTO flag FROM public.admin_user_flags WHERE user_id=uid;
 IF flag IN ('restricted','suspended') THEN RAISE EXCEPTION 'Posting is restricted'; END IF;
 IF length(trim(coalesce(p_body,''))) NOT BETWEEN 2 AND 10000 THEN RAISE EXCEPTION 'Invalid reply length'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,142012));
 SELECT * INTO parent FROM public.commons_topics WHERE id=p_topic_id FOR UPDATE;
 IF NOT FOUND OR parent.status<>'published' OR parent.is_locked THEN RAISE EXCEPTION 'Discussion unavailable'; END IF;
 SELECT * INTO f FROM public.commons_forums WHERE forum_code=parent.forum_code;
 IF NOT FOUND OR NOT public.v0143_commons_can_open(f.active,f.member_only,f.book_code,f.tool_code)
 THEN RAISE EXCEPTION 'Forum requires additional access'; END IF;
 SELECT CASE WHEN jsonb_typeof(value)='number' AND (value #>> '{}')~'^[0-9]{1,4}$'
     THEN least(1000,greatest(1,(value #>> '{}')::int)) ELSE 60 END INTO quota
 FROM public.site_settings WHERE setting_key='community.max_replies_per_24h';
 SELECT count(*) INTO cnt FROM public.commons_posts WHERE author_user_id=uid
   AND created_at>now()-interval '24 hours';
 IF cnt>=coalesce(quota,60) THEN RAISE EXCEPTION 'Daily reply quota reached'; END IF;
 INSERT INTO public.commons_posts(topic_id,author_user_id,body)
 VALUES(p_topic_id,uid,trim(p_body)) RETURNING id INTO reply_id;
 UPDATE public.commons_topics SET reply_count=reply_count+1,last_post_at=now(),updated_at=now()
 WHERE id=p_topic_id;
 RETURN reply_id;
END; $$;
REVOKE ALL ON FUNCTION public.commons_create_reply(bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commons_create_reply(bigint,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.commons_toggle_bookmark(p_topic_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); f public.commons_forums%rowtype;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT forums.* INTO f FROM public.commons_forums forums JOIN public.commons_topics topics
 ON topics.forum_code=forums.forum_code WHERE topics.id=p_topic_id AND topics.status='published';
 IF NOT FOUND OR NOT public.v0143_commons_can_open(f.active,f.member_only,f.book_code,f.tool_code)
 THEN RAISE EXCEPTION 'Discussion requires additional access'; END IF;
 -- Concurrent toggles are serialized by member/topic pair.
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_topic_id::text,142014));
 IF EXISTS(SELECT 1 FROM public.commons_bookmarks WHERE user_id=uid AND topic_id=p_topic_id) THEN
  DELETE FROM public.commons_bookmarks WHERE user_id=uid AND topic_id=p_topic_id; RETURN false;
 END IF;
 INSERT INTO public.commons_bookmarks(user_id,topic_id) VALUES(uid,p_topic_id) ON CONFLICT DO NOTHING;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.commons_toggle_bookmark(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commons_toggle_bookmark(bigint) TO authenticated;

-- Even bookmark/subscription RLS must not leak topic IDs after entitlement expiry.
DROP POLICY IF EXISTS "users read own commons bookmarks" ON public.commons_bookmarks;
CREATE POLICY "users read own commons bookmarks" ON public.commons_bookmarks FOR SELECT TO authenticated
USING (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.commons_topics t WHERE t.id=topic_id));
DROP POLICY IF EXISTS "users read own commons subscriptions" ON public.commons_topic_subscriptions;
CREATE POLICY "users read own commons subscriptions" ON public.commons_topic_subscriptions FOR SELECT TO authenticated
USING (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.commons_topics t WHERE t.id=topic_id));
NOTIFY pgrst,'reload schema';
COMMIT;
