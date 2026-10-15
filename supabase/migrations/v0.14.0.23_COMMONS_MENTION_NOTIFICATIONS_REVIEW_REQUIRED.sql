-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.23
-- OWNER REVIEW / STAGING REQUIRED. This is a new OPTIONAL migration.
-- Do not automatically execute it against Supabase production.
-- Adds an explicit opt-in for in-app @mentions in ungated Market Commons topics
-- and replies. Never delivers email/push or financial/trading recommendations.
-- No changes to existing memberships, entitlements, moderation or legacy forum.
BEGIN;
DO $guard$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY[
   'profiles','admin_user_flags','admin_user_roles','commons_forums','commons_topics',
   'commons_posts','user_notifications'
 ] LOOP
   IF to_regclass(format('public.%I',relation_name)) IS NULL THEN
     RAISE EXCEPTION 'v01423 prerequisite missing: public.%', relation_name;
   END IF;
 END LOOP;
 IF to_regprocedure('auth.uid()') IS NULL THEN RAISE EXCEPTION 'Supabase auth.uid() unavailable'; END IF;
 IF EXISTS (SELECT 1 FROM (VALUES
   ('profiles','id'),('profiles','username'),('profiles','account_kind'),
   ('admin_user_flags','user_id'),('admin_user_flags','status'),
   ('admin_user_roles','user_id'),('admin_user_roles','role_code'),('admin_user_roles','expires_at'),
   ('commons_forums','forum_code'),('commons_forums','active'),('commons_forums','book_code'),('commons_forums','tool_code'),
   ('commons_topics','id'),('commons_topics','forum_code'),('commons_topics','body'),('commons_topics','author_user_id'),('commons_topics','status'),
   ('commons_posts','id'),('commons_posts','topic_id'),('commons_posts','body'),('commons_posts','status'),('commons_posts','author_user_id'),
   ('user_notifications','user_id'),('user_notifications','id'),('user_notifications','title'),('user_notifications','body'),
   ('user_notifications','href'),('user_notifications','notification_type'),('user_notifications','metadata')
 ) required(table_name,column_name) WHERE NOT EXISTS (
   SELECT 1 FROM information_schema.columns c
   WHERE c.table_schema='public' AND c.table_name=required.table_name AND c.column_name=required.column_name
 )) THEN RAISE EXCEPTION 'v01423 required columns missing'; END IF;
END $guard$;

-- Separate opt-in from subscribed-reply alerts. Disabled by default.
CREATE TABLE IF NOT EXISTS public.gu_commons_mention_prefs_v01423 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 mentions_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_commons_mention_prefs_v01423 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gu_commons_mention_prefs_v01423 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.gu_commons_mention_prefs_v01423 TO service_role;

-- Atomically capped author/day quota; private service-only table.
CREATE TABLE IF NOT EXISTS public.gu_commons_mention_quota_v01423 (
 author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 utc_day date NOT NULL,
 requested_count integer NOT NULL DEFAULT 0 CHECK (requested_count>=0 AND requested_count<=25),
 PRIMARY KEY(author_user_id,utc_day)
);
ALTER TABLE public.gu_commons_mention_quota_v01423 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gu_commons_mention_quota_v01423 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.gu_commons_mention_quota_v01423 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_commons_mention_pref_get_v01423()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $fn$
DECLARE actor uuid:=auth.uid(); value boolean; modified timestamptz;
BEGIN
 IF actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.profiles WHERE id=actor AND account_kind='member'
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_flags WHERE user_id=actor AND lower(status) IN ('restricted','suspended')
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_roles WHERE user_id=actor AND role_code='SHOWCASE_VIEWER'
     AND (expires_at IS NULL OR expires_at>now())
 ) THEN RAISE EXCEPTION 'Eligible member required' USING ERRCODE='42501'; END IF;
 SELECT p.mentions_enabled,p.updated_at INTO value,modified
   FROM public.gu_commons_mention_prefs_v01423 p WHERE p.user_id=actor;
 RETURN jsonb_build_object('mentions_enabled',coalesce(value,false),'updated_at',modified);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_commons_mention_pref_get_v01423() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_commons_mention_pref_get_v01423() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_commons_mention_pref_save_v01423(p_mentions_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $fn$
DECLARE actor uuid:=auth.uid(); stamp timestamptz;
BEGIN
 IF actor IS NULL OR p_mentions_enabled IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.profiles WHERE id=actor AND account_kind='member'
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_flags WHERE user_id=actor AND lower(status) IN ('restricted','suspended')
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_roles WHERE user_id=actor AND role_code='SHOWCASE_VIEWER'
     AND (expires_at IS NULL OR expires_at>now())
 ) THEN RAISE EXCEPTION 'Eligible member and explicit setting required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.gu_commons_mention_prefs_v01423(user_id,mentions_enabled,updated_at)
 VALUES(actor,p_mentions_enabled,clock_timestamp()) ON CONFLICT(user_id) DO UPDATE
 SET mentions_enabled=excluded.mentions_enabled,updated_at=excluded.updated_at
 RETURNING updated_at INTO stamp;
 RETURN jsonb_build_object('mentions_enabled',p_mentions_enabled,'updated_at',stamp);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_commons_mention_pref_save_v01423(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_commons_mention_pref_save_v01423(boolean) TO authenticated;

-- Each recipient gets at most one notice for each created topic or post.
CREATE UNIQUE INDEX IF NOT EXISTS gu_commons_mention_once_v01423
ON public.user_notifications(user_id,((metadata->>'content_ref')))
WHERE notification_type='forum_mention' AND metadata->>'origin'='v01423';

-- Best-effort after-INSERT triggers never block forum posting if alert delivery
-- fails. A dedicated async outbox/queue will be needed for high traffic.
CREATE OR REPLACE FUNCTION public.gu_commons_emit_mentions_v01423()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 actor uuid; topic bigint; content_ref text; names_count integer; daily_used integer;
 rec record; qualifying boolean; author_ok boolean;
BEGIN
 BEGIN
   IF TG_TABLE_NAME='commons_posts' THEN
     actor:=NEW.author_user_id; topic:=NEW.topic_id; content_ref:='post:'||NEW.id::text;
   ELSIF TG_TABLE_NAME='commons_topics' THEN
     actor:=NEW.author_user_id; topic:=NEW.id; content_ref:='topic:'||NEW.id::text;
   ELSE RETURN NEW; END IF;
   IF NEW.status IS DISTINCT FROM 'published' OR actor IS NULL OR NEW.body IS NULL THEN RETURN NEW; END IF;
   IF NOT EXISTS (
     SELECT 1 FROM public.commons_topics t
     JOIN public.commons_forums f ON f.forum_code=t.forum_code
     WHERE t.id=topic AND t.status='published' AND f.active IS TRUE
       AND f.book_code IS NULL AND f.tool_code IS NULL
   ) THEN RETURN NEW; END IF;
   SELECT EXISTS(
     SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member'
       AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags x
         WHERE x.user_id=actor AND lower(x.status) IN ('restricted','suspended'))
       AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
         WHERE r.user_id=actor AND r.role_code='SHOWCASE_VIEWER'
         AND (r.expires_at IS NULL OR r.expires_at>now()))
   ) INTO author_ok;
   IF NOT author_ok THEN RETURN NEW; END IF;

   -- A tagged username alone never grants visibility or access. Ignore plain
   -- @name text, HTML, and names that are not opt-in published contributors.
   SELECT count(*) INTO names_count FROM (
     SELECT DISTINCT lower(m[1]) AS username
     FROM regexp_matches(NEW.body,
       E'\\[mention\\]([A-Za-z0-9_.-]{3,40})\\[/mention\\]', 'gi') AS m
   ) names;
   IF names_count=0 OR names_count>5 THEN RETURN NEW; END IF;

   -- Per-poster atomic budget: <=25 attempted mentions per UTC day.
   INSERT INTO public.gu_commons_mention_quota_v01423(author_user_id,utc_day,requested_count)
   VALUES(actor,(clock_timestamp() AT TIME ZONE 'UTC')::date,names_count)
   ON CONFLICT(author_user_id,utc_day) DO UPDATE
   SET requested_count=public.gu_commons_mention_quota_v01423.requested_count+excluded.requested_count
   WHERE public.gu_commons_mention_quota_v01423.requested_count+excluded.requested_count<=25
   RETURNING requested_count INTO daily_used;
   IF daily_used IS NULL THEN RETURN NEW; END IF;

   FOR rec IN
     SELECT DISTINCT lower(m[1]) AS username
     FROM regexp_matches(NEW.body,
       E'\\[mention\\]([A-Za-z0-9_.-]{3,40})\\[/mention\\]', 'gi') AS m
   LOOP
     INSERT INTO public.user_notifications(user_id,notification_type,title,body,href,metadata)
     SELECT p.id,'forum_mention','You were mentioned in Market Commons',
       'Open the discussion to view your mention.',
       '/market-commons.html?topic='||topic::text,
       jsonb_build_object('origin','v01423','topic_id',topic::text,'content_ref',content_ref)
     FROM public.profiles p
     JOIN public.gu_commons_mention_prefs_v01423 pref
       ON pref.user_id=p.id AND pref.mentions_enabled IS TRUE
     WHERE lower(p.username)=rec.username AND p.account_kind='member' AND p.id<>actor
       AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f
          WHERE f.user_id=p.id AND lower(f.status) IN ('restricted','suspended'))
       AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
         WHERE r.user_id=p.id AND r.role_code='SHOWCASE_VIEWER'
         AND (r.expires_at IS NULL OR r.expires_at>now()))
       AND (
         EXISTS(SELECT 1 FROM public.commons_topics pt
           JOIN public.commons_forums pf ON pf.forum_code=pt.forum_code
           WHERE pt.author_user_id=p.id AND pt.status='published'
             AND pf.active IS TRUE AND pf.book_code IS NULL AND pf.tool_code IS NULL)
         OR EXISTS(SELECT 1 FROM public.commons_posts pp
           JOIN public.commons_topics pt ON pt.id=pp.topic_id
           JOIN public.commons_forums pf ON pf.forum_code=pt.forum_code
           WHERE pp.author_user_id=p.id AND pp.status='published' AND pt.status='published'
             AND pf.active IS TRUE AND pf.book_code IS NULL AND pf.tool_code IS NULL)
       )
     ON CONFLICT DO NOTHING;
   END LOOP;
 EXCEPTION WHEN OTHERS THEN
   RAISE WARNING 'v01423 mention notice fan-out unavailable; SQLSTATE=%', SQLSTATE;
 END;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_commons_emit_mentions_v01423() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS gu_commons_mention_post_v01423 ON public.commons_posts;
CREATE TRIGGER gu_commons_mention_post_v01423
AFTER INSERT ON public.commons_posts FOR EACH ROW
EXECUTE FUNCTION public.gu_commons_emit_mentions_v01423();
DROP TRIGGER IF EXISTS gu_commons_mention_topic_v01423 ON public.commons_topics;
CREATE TRIGGER gu_commons_mention_topic_v01423
AFTER INSERT ON public.commons_topics FOR EACH ROW
EXECUTE FUNCTION public.gu_commons_emit_mentions_v01423();
NOTIFY pgrst,'reload schema';
COMMIT;
