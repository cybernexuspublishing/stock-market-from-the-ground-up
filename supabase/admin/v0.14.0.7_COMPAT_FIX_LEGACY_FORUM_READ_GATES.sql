-- v0.14.0.7 / COMPATIBILITY REPAIR FOR LEGACY FORUM READ ISOLATION
-- This replaces the FAILED v0.14.0.3 read-function rewrite. It is based on
-- v0.6 return types, which include lab_id and discussion_unlocked.
-- Run BEFORE v0.14.0.7 SQL A. Do not run the original v0.14.0.3 migration.
-- IMPORTANT: Preview/test with a confirmed backup; no rows are edited or deleted.
BEGIN;
DO $preflight$
DECLARE
 expected text[];
 actual text[];
 k record;
BEGIN
 IF to_regclass('public.forum_topics') IS NULL
   OR to_regclass('public.forum_posts') IS NULL
   OR to_regclass('public.forum_reports') IS NULL
   OR to_regclass('public.lab_attempts') IS NULL
   OR to_regclass('public.profiles') IS NULL
   OR to_regclass('public.admin_user_roles') IS NULL
   OR to_regclass('public.admin_user_flags') IS NULL
 THEN RAISE EXCEPTION 'Prerequisite table missing; no changes applied'; END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='forum_topics' AND column_name='lab_id')
 THEN RAISE EXCEPTION 'forum_topics.lab_id missing; no changes applied'; END IF;
 FOR k IN SELECT * FROM (VALUES
   ('public.forum_list_topics(text,text)'::text,
    ARRAY['topic_id','category_slug','category_name','author_username','title','ticker','lab_id','created_at','updated_at','reply_count','is_pinned','is_locked']::text[]),
   ('public.forum_get_topic(bigint)'::text,
    ARRAY['topic_id','category_id','category_name','author_id','author_username','title','body','ticker','lab_id','created_at','updated_at','is_locked','discussion_unlocked']::text[]),
   ('public.forum_list_posts(bigint)'::text,
    ARRAY['post_id','author_id','author_username','body','created_at','updated_at']::text[])
 ) AS v(signature, cols)
 LOOP
   IF to_regprocedure(k.signature) IS NULL
   THEN RAISE EXCEPTION 'Function % missing; no changes applied', k.signature; END IF;
   SELECT array_agg(p.proargnames[i] ORDER BY i) INTO actual
   FROM pg_proc p
   CROSS JOIN LATERAL generate_subscripts(p.proargnames,1) AS sub(i)
   WHERE p.oid=to_regprocedure(k.signature)
     AND p.proargmodes[i]='t';
   IF actual IS DISTINCT FROM k.cols
   THEN RAISE EXCEPTION 'Incompatible result columns for %; expected %, actual %. No changes applied',k.signature,k.cols,actual; END IF;
 END LOOP;
END $preflight$;

-- Prevent direct execution of private account checks by unauthenticated callers.
CREATE OR REPLACE FUNCTION public.v0143_legacy_forum_can_read()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
   AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid()
   AND lower(f.status) IN ('suspended','restricted'));
$$;
REVOKE ALL ON FUNCTION public.v0143_legacy_forum_can_read() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_legacy_forum_can_read() TO authenticated,service_role;

-- Applies to direct table reads; read RPCs are separately guarded below
-- since SECURITY DEFINER functions can bypass table RLS.
DROP POLICY IF EXISTS v0143_legacy_topics_read ON public.forum_topics;
CREATE POLICY v0143_legacy_topics_read ON public.forum_topics
 AS RESTRICTIVE FOR SELECT TO authenticated USING(public.v0143_legacy_forum_can_read());
DROP POLICY IF EXISTS v0143_legacy_posts_read ON public.forum_posts;
CREATE POLICY v0143_legacy_posts_read ON public.forum_posts
 AS RESTRICTIVE FOR SELECT TO authenticated USING(public.v0143_legacy_forum_can_read());
DROP POLICY IF EXISTS v0143_legacy_reports_read ON public.forum_reports;
CREATE POLICY v0143_legacy_reports_read ON public.forum_reports
 AS RESTRICTIVE FOR SELECT TO authenticated USING(public.v0143_legacy_forum_can_read());

-- Preserve v0.6 OUT argument types and linked-Lab anti-spoiler behavior.
create or replace function public.forum_list_topics(category_filter text default null, search_filter text default null)
returns table (
  topic_id bigint,
  category_slug text,
  category_name text,
  author_username text,
  title text,
  ticker text,
  lab_id text,
  created_at timestamptz,
  updated_at timestamptz,
  reply_count bigint,
  is_pinned boolean,
  is_locked boolean
)
language plpgsql security definer set search_path=public,pg_temp stable as $$
begin
  if not public.v0143_legacy_forum_can_read() then raise exception 'Only eligible production members may read this forum'; end if;
  return query
  select t.id,c.slug,c.name,coalesce(p.username,'member'),t.title,t.ticker,t.lab_id,t.created_at,t.updated_at,
         (select count(*) from public.forum_posts fp where fp.topic_id=t.id and fp.status='published'),
         t.is_pinned,t.is_locked
  from public.forum_topics t
  join public.forum_categories c on c.id=t.category_id
  left join public.profiles p on p.id=t.author_id
  where t.status='published' and c.is_active=true
    and (category_filter is null or category_filter='' or c.slug=category_filter)
    and (search_filter is null or search_filter='' or t.title ilike '%'||search_filter||'%' or coalesce(t.ticker,'') ilike '%'||search_filter||'%' or coalesce(t.lab_id,'') ilike '%'||search_filter||'%')
  order by t.is_pinned desc,t.updated_at desc,t.created_at desc;
end;$$;
grant execute on function public.forum_list_topics(text,text) to authenticated;



create or replace function public.forum_get_topic(target_topic_id bigint)
returns table (
  topic_id bigint, category_id bigint, category_name text, author_id uuid, author_username text,
  title text, body text, ticker text, lab_id text, created_at timestamptz, updated_at timestamptz, is_locked boolean,
  discussion_unlocked boolean
)
language plpgsql security definer set search_path=public,pg_temp stable as $$
begin
  if not public.v0143_legacy_forum_can_read() then raise exception 'Only eligible production members may read this forum'; end if;
  return query
  select t.id,t.category_id,c.name,t.author_id,coalesce(p.username,'member'),t.title,
         case when t.lab_id is null or exists (
           select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id
         ) then t.body else '' end,
         t.ticker,t.lab_id,t.created_at,t.updated_at,t.is_locked,
         (t.lab_id is null or exists (
           select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id
         )) as discussion_unlocked
  from public.forum_topics t
  join public.forum_categories c on c.id=t.category_id
  left join public.profiles p on p.id=t.author_id
  where t.id=target_topic_id and t.status='published';
end;$$;
grant execute on function public.forum_get_topic(bigint) to authenticated;

-- Linked-lab replies stay hidden until the learner has saved an attempt for that Lab ID.


create or replace function public.forum_list_posts(target_topic_id bigint)
returns table (
  post_id bigint,
  author_id uuid,
  author_username text,
  body text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path=public,pg_temp stable as $$
begin
  if not public.v0143_legacy_forum_can_read() then raise exception 'Only eligible production members may read this forum'; end if;
  if exists (
    select 1 from public.forum_topics t
    where t.id=target_topic_id and t.lab_id is not null
      and not exists (select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id)
  ) then
    return;
  end if;
  return query
  select fp.id,fp.author_id,coalesce(p.username,'member'),fp.body,fp.created_at,fp.updated_at
  from public.forum_posts fp
  left join public.profiles p on p.id=fp.author_id
  where fp.topic_id=target_topic_id and fp.status='published'
  order by fp.created_at asc;
end;$$;
grant execute on function public.forum_list_posts(bigint) to authenticated;

-- Functions already have authenticated privileges from the deployed v0.6 schema,
-- but explicitly remove default/public execution without interrupting signed-in users.
REVOKE ALL ON FUNCTION public.forum_list_topics(text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.forum_get_topic(bigint) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.forum_list_posts(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.forum_list_topics(text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.forum_get_topic(bigint) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.forum_list_posts(bigint) TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Read-only verification after the COMMIT (should return TRUE for all 4):
SELECT 'forum read helper' AS object_name,
       to_regprocedure('public.v0143_legacy_forum_can_read()') IS NOT NULL AS installed
UNION ALL SELECT 'topics restrictive read policy', EXISTS(
 SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_topics'
 AND policyname='v0143_legacy_topics_read' AND permissive='RESTRICTIVE')
UNION ALL SELECT 'posts restrictive read policy', EXISTS(
 SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts'
 AND policyname='v0143_legacy_posts_read' AND permissive='RESTRICTIVE')
UNION ALL SELECT 'reports restrictive read policy', EXISTS(
 SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_reports'
 AND policyname='v0143_legacy_reports_read' AND permissive='RESTRICTIVE');
