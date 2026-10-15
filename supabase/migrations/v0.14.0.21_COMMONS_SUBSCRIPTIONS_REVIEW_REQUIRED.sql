-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.21
-- MANUAL REVIEW REQUIRED. Test in staging before any authorized production execution.
-- Additive functions only. Does NOT modify existing notifications, members, roles,
-- RLS policies, tables, comments, triggers or v0.14.0.17 functions.
-- Implements an idempotent SET operation, not a race-prone TOGGLE operation.
BEGIN;
DO $guard$
DECLARE tablename text;
BEGIN
  FOREACH tablename IN ARRAY ARRAY[
    'profiles','admin_user_flags','commons_topics','commons_forums','commons_topic_subscriptions'
  ] LOOP
    IF to_regclass(format('public.%I',tablename)) IS NULL THEN
      RAISE EXCEPTION 'v0.14.0.21 prerequisite missing: public.%',tablename;
    END IF;
  END LOOP;
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'v0.14.0.21 requires Supabase auth.uid()';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('profiles','id'),('profiles','account_kind'),
      ('admin_user_flags','user_id'),('admin_user_flags','status'),
      ('commons_topics','id'),('commons_topics','forum_code'),('commons_topics','status'),
      ('commons_forums','forum_code'),('commons_forums','active'),
      ('commons_forums','book_code'),('commons_forums','tool_code'),
      ('commons_topic_subscriptions','topic_id'),('commons_topic_subscriptions','user_id')
    ) required(table_name,column_name)
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=required.table_name
        AND c.column_name=required.column_name)
  ) THEN RAISE EXCEPTION 'v0.14.0.21 prerequisites columns missing'; END IF;
END $guard$;

-- A notification subscription is offered ONLY where the installed v0.14.0.20
-- trigger can deliver in-app notifications: active, published, ungated Commons.
-- This deliberately excludes book/tool/Historical Lab access-controlled forums.
CREATE OR REPLACE FUNCTION public.gu_commons_subscription_get_v01421(p_topic_id bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $body$
DECLARE actor uuid:=auth.uid(); permitted boolean; subscribed boolean;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  IF p_topic_id IS NULL OR p_topic_id<=0 THEN
    RAISE EXCEPTION 'Invalid topic identifier' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member')
     OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor
       AND lower(f.status) IN ('restricted','suspended','disabled','banned')) THEN
    RAISE EXCEPTION 'Member account not eligible' USING ERRCODE='42501';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.commons_topics t
    JOIN public.commons_forums f ON f.forum_code=t.forum_code
    WHERE t.id=p_topic_id AND t.status='published' AND f.active IS TRUE
      AND f.book_code IS NULL AND f.tool_code IS NULL
  ) INTO permitted;
  IF NOT permitted THEN
    RETURN jsonb_build_object('available',false,'subscribed',false);
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.commons_topic_subscriptions s
    WHERE s.user_id=actor AND s.topic_id=p_topic_id) INTO subscribed;
  RETURN jsonb_build_object('available',true,'subscribed',subscribed);
END $body$;
REVOKE ALL ON FUNCTION public.gu_commons_subscription_get_v01421(bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_commons_subscription_get_v01421(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_commons_subscription_set_v01421(
 p_topic_id bigint,p_subscribe boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $body$
DECLARE actor uuid:=auth.uid(); permitted boolean; subscribed boolean;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  IF p_topic_id IS NULL OR p_topic_id<=0 OR p_subscribe IS NULL THEN
    RAISE EXCEPTION 'Valid topic and boolean subscribe value required' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member')
     OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor
       AND lower(f.status) IN ('restricted','suspended','disabled','banned')) THEN
    RAISE EXCEPTION 'Member account not eligible' USING ERRCODE='42501';
  END IF;
  -- Unsubscribe must remain possible even after the topic becomes inaccessible.
  -- This cannot disclose topic existence; it only deletes the caller's own row.
  IF NOT p_subscribe THEN
    DELETE FROM public.commons_topic_subscriptions
      WHERE user_id=actor AND topic_id=p_topic_id;
    RETURN jsonb_build_object('available',true,'subscribed',false);
  END IF;
  -- Keep eligibility aligned with v0.14.0.20 notification trigger.
  SELECT EXISTS (
    SELECT 1 FROM public.commons_topics t
    JOIN public.commons_forums f ON f.forum_code=t.forum_code
    WHERE t.id=p_topic_id AND t.status='published' AND f.active IS TRUE
      AND f.book_code IS NULL AND f.tool_code IS NULL
  ) INTO permitted;
  IF NOT permitted THEN
    RETURN jsonb_build_object('available',false,'subscribed',false);
  END IF;
  INSERT INTO public.commons_topic_subscriptions(user_id,topic_id)
    VALUES(actor,p_topic_id) ON CONFLICT(user_id,topic_id) DO NOTHING;
  SELECT EXISTS(SELECT 1 FROM public.commons_topic_subscriptions s
    WHERE s.user_id=actor AND s.topic_id=p_topic_id) INTO subscribed;
  RETURN jsonb_build_object('available',true,'subscribed',subscribed);
END $body$;
REVOKE ALL ON FUNCTION public.gu_commons_subscription_set_v01421(bigint,boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_commons_subscription_set_v01421(bigint,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
