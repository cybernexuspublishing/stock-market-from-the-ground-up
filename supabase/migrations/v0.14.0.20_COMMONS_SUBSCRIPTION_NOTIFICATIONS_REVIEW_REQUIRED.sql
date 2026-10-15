-- The Stock Market: From the Ground Up — v0.14.0.20
-- MANUAL REVIEW REQUIRED. Do not automatically apply to a production database.
-- ADDITIVE, no data deletion. Requires existing Commons, Auth, profiles, flags,
-- subscription and user_notifications schemas, all verified by companion preflight.
-- The scope is in-app notifications to existing subscribers for new published
-- replies in active, ungated Commons forums. No external email/push delivery.
BEGIN;

DO $guard$
DECLARE relation_name text; col text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'profiles','admin_user_flags','commons_topics','commons_forums',
    'commons_posts','commons_topic_subscriptions','user_notifications'
  ] LOOP
    IF to_regclass(format('public.%I',relation_name)) IS NULL THEN
      RAISE EXCEPTION 'v0.14.0.20 prerequisite missing: public.%',relation_name;
    END IF;
  END LOOP;
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'v0.14.0.20 prerequisite missing: auth.uid()';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('profiles','id'),('profiles','account_kind'),
      ('admin_user_flags','user_id'),('admin_user_flags','status'),
      ('commons_posts','id'),('commons_posts','topic_id'),('commons_posts','status'),('commons_posts','author_user_id'),
      ('commons_topics','id'),('commons_topics','forum_code'),('commons_topics','status'),
      ('commons_forums','forum_code'),('commons_forums','active'),('commons_forums','book_code'),('commons_forums','tool_code'),
      ('commons_topic_subscriptions','topic_id'),('commons_topic_subscriptions','user_id'),
      ('user_notifications','id'),('user_notifications','user_id'),('user_notifications','notification_type'),
      ('user_notifications','title'),('user_notifications','body'),('user_notifications','href'),('user_notifications','metadata'),('user_notifications','created_at')
    ) required(table_name,column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=required.table_name AND c.column_name=required.column_name
    )
  ) THEN
    RAISE EXCEPTION 'v0.14.0.20 prerequisite columns missing; no changes made.';
  END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.gu_commons_notification_prefs_v01420 (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed_replies_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_commons_notification_prefs_v01420 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gu_commons_notification_prefs_v01420 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.gu_commons_notification_prefs_v01420 TO service_role;

-- User JWT is the source of identity. No arbitrary target_user argument.
CREATE OR REPLACE FUNCTION public.gu_commons_notice_pref_get_v01420()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $body$
DECLARE actor uuid:=auth.uid(); enabled boolean; changed_at timestamptz;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member')
     OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor AND lower(f.status) IN ('restricted','suspended')) THEN
    RAISE EXCEPTION 'Ineligible member account' USING ERRCODE='42501';
  END IF;
  SELECT subscribed_replies_enabled,updated_at INTO enabled,changed_at
  FROM public.gu_commons_notification_prefs_v01420 WHERE user_id=actor;
  RETURN jsonb_build_object('subscribed_replies_enabled',coalesce(enabled,true),'updated_at',changed_at);
END $body$;
REVOKE ALL ON FUNCTION public.gu_commons_notice_pref_get_v01420() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_commons_notice_pref_get_v01420() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_commons_notice_pref_save_v01420(p_subscribed_replies_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $body$
DECLARE actor uuid:=auth.uid(); stamp timestamptz;
BEGIN
  IF actor IS NULL OR p_subscribed_replies_enabled IS NULL THEN
    RAISE EXCEPTION 'Authenticated member and boolean preference required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member')
     OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor AND lower(f.status) IN ('restricted','suspended')) THEN
    RAISE EXCEPTION 'Ineligible member account' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.gu_commons_notification_prefs_v01420(user_id,subscribed_replies_enabled,updated_at)
  VALUES(actor,p_subscribed_replies_enabled,now())
  ON CONFLICT(user_id) DO UPDATE
    SET subscribed_replies_enabled=excluded.subscribed_replies_enabled,
        updated_at=excluded.updated_at
  RETURNING updated_at INTO stamp;
  RETURN jsonb_build_object('subscribed_replies_enabled',p_subscribed_replies_enabled,'updated_at',stamp);
END $body$;
REVOKE ALL ON FUNCTION public.gu_commons_notice_pref_save_v01420(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_commons_notice_pref_save_v01420(boolean) TO authenticated;

-- This is scoped to our own notification origin; owner notices and payment/security
-- notifications remain unchanged. The unique index makes per-post retries safe.
CREATE UNIQUE INDEX IF NOT EXISTS gu_commons_reply_notice_once_v01420
ON public.user_notifications(user_id, ((metadata->>'post_id')))
WHERE notification_type='forum_reply' AND metadata->>'origin'='v01420';
CREATE INDEX IF NOT EXISTS gu_commons_reply_notice_cooldown_v01420
ON public.user_notifications(user_id,notification_type,created_at DESC)
WHERE notification_type='forum_reply';

-- Do not expose post body, username, restricted forum title, email, or user ID
-- in notification payload. Only ungated active forums qualify; eligibility and
-- exact discussion visibility are independently checked when opening the link.
CREATE OR REPLACE FUNCTION public.gu_commons_reply_notice_after_insert_v01420()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $body$
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' OR NEW.author_user_id IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commons_topics t
    JOIN public.commons_forums f ON f.forum_code=t.forum_code
    WHERE t.id=NEW.topic_id AND t.status='published' AND f.active IS TRUE
      AND f.book_code IS NULL AND f.tool_code IS NULL
  ) THEN RETURN NEW; END IF;
  BEGIN
    -- Serialize notices for the same topic so concurrent replies respect the cooldown.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.topic_id::text,142020));
    INSERT INTO public.user_notifications(user_id,notification_type,title,body,href,metadata)
    SELECT s.user_id,'forum_reply','New reply in a followed discussion',
      'Open Market Commons to view the reply.',
      '/market-commons.html?topic='||NEW.topic_id::text,
      jsonb_build_object('origin','v01420','topic_id',NEW.topic_id::text,'post_id',NEW.id::text)
    FROM public.commons_topic_subscriptions s
    JOIN public.profiles p ON p.id=s.user_id AND p.account_kind='member'
    LEFT JOIN public.admin_user_flags f ON f.user_id=s.user_id
    LEFT JOIN public.gu_commons_notification_prefs_v01420 pref ON pref.user_id=s.user_id
    WHERE s.topic_id=NEW.topic_id AND s.user_id<>NEW.author_user_id
      AND coalesce(pref.subscribed_replies_enabled,true)=true
      AND coalesce(lower(f.status),'') NOT IN ('restricted','suspended')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_notifications n
        WHERE n.user_id=s.user_id AND n.notification_type='forum_reply'
          AND n.metadata->>'origin'='v01420'
          AND n.metadata->>'topic_id'=NEW.topic_id::text
          AND n.created_at>clock_timestamp()-interval '15 minutes'
      )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Notifications are best effort; an outage must not discard the member reply.
    -- Cloudflare/Supabase database logs require alerting for these warnings.
    RAISE WARNING 'v01420 forum notification fan-out skipped; SQLSTATE=%', SQLSTATE;
  END;
  RETURN NEW;
END $body$;
REVOKE ALL ON FUNCTION public.gu_commons_reply_notice_after_insert_v01420() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS gu_commons_reply_notice_v01420 ON public.commons_posts;
CREATE TRIGGER gu_commons_reply_notice_v01420
AFTER INSERT ON public.commons_posts FOR EACH ROW
EXECUTE FUNCTION public.gu_commons_reply_notice_after_insert_v01420();

COMMENT ON TABLE public.gu_commons_notification_prefs_v01420 IS
 'v0.14.0.20: in-app subscription reply notification opt-out. Stored via caller-bound RPC.';
NOTIFY pgrst,'reload schema';
COMMIT;
