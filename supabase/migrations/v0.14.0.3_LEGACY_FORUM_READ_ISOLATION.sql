-- v0.14.0.3: preserve legacy forum UI while preventing production-data reads
-- by TEST / SHOWCASE / suspended accounts through both PostgREST and SECURITY DEFINER RPCs.
-- Supersedes only three legacy read function bodies, no historical content is deleted.
BEGIN;
CREATE OR REPLACE FUNCTION public.v0143_legacy_forum_can_read()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
   AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid() AND f.status='suspended');
$$;
REVOKE ALL ON FUNCTION public.v0143_legacy_forum_can_read() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_legacy_forum_can_read() TO authenticated,service_role;
DROP POLICY IF EXISTS v0143_legacy_topics_read ON public.forum_topics;
CREATE POLICY v0143_legacy_topics_read ON public.forum_topics AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_legacy_forum_can_read());
DROP POLICY IF EXISTS v0143_legacy_posts_read ON public.forum_posts;
CREATE POLICY v0143_legacy_posts_read ON public.forum_posts AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_legacy_forum_can_read());
DROP POLICY IF EXISTS v0143_legacy_reports_read ON public.forum_reports;
CREATE POLICY v0143_legacy_reports_read ON public.forum_reports AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_legacy_forum_can_read());

create or replace function public.forum_list_topics(category_filter text default null, search_filter text default null)
returns table (
  topic_id bigint,
  category_slug text,
  category_name text,
  author_username text,
  title text,
  ticker text,
  created_at timestamptz,
  updated_at timestamptz,
  reply_count bigint,
  is_pinned boolean,
  is_locked boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.v0143_legacy_forum_can_read() then
    raise exception 'Only eligible production members may read this forum';
  end if;

  return query
  select
    t.id,
    c.slug,
    c.name,
    coalesce(p.username, 'member'),
    t.title,
    t.ticker,
    t.created_at,
    t.updated_at,
    (select count(*) from public.forum_posts fp where fp.topic_id = t.id and fp.status = 'published'),
    t.is_pinned,
    t.is_locked
  from public.forum_topics t
  join public.forum_categories c on c.id = t.category_id
  left join public.profiles p on p.id = t.author_id
  where t.status = 'published'
    and c.is_active = true
    and (category_filter is null or category_filter = '' or c.slug = category_filter)
    and (
      search_filter is null or search_filter = ''
      or t.title ilike '%' || search_filter || '%'
      or coalesce(t.ticker,'') ilike '%' || search_filter || '%'
    )
  order by t.is_pinned desc, t.updated_at desc, t.created_at desc;
end;
$$;

grant execute on function public.forum_list_topics(text,text) to authenticated;

create or replace function public.forum_get_topic(target_topic_id bigint)
returns table (
  topic_id bigint,
  category_id bigint,
  category_name text,
  author_id uuid,
  author_username text,
  title text,
  body text,
  ticker text,
  created_at timestamptz,
  updated_at timestamptz,
  is_locked boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.v0143_legacy_forum_can_read() then
    raise exception 'Only eligible production members may read this forum';
  end if;

  return query
  select
    t.id,
    t.category_id,
    c.name,
    t.author_id,
    coalesce(p.username, 'member'),
    t.title,
    t.body,
    t.ticker,
    t.created_at,
    t.updated_at,
    t.is_locked
  from public.forum_topics t
  join public.forum_categories c on c.id = t.category_id
  left join public.profiles p on p.id = t.author_id
  where t.id = target_topic_id and t.status = 'published';
end;
$$;

grant execute on function public.forum_get_topic(bigint) to authenticated;

create or replace function public.forum_list_posts(target_topic_id bigint)
returns table (
  post_id bigint,
  author_id uuid,
  author_username text,
  body text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.v0143_legacy_forum_can_read() then
    raise exception 'Only eligible production members may read this forum';
  end if;

  return query
  select
    fp.id,
    fp.author_id,
    coalesce(p.username, 'member'),
    fp.body,
    fp.created_at,
    fp.updated_at
  from public.forum_posts fp
  left join public.profiles p on p.id = fp.author_id
  where fp.topic_id = target_topic_id and fp.status = 'published'
  order by fp.created_at asc;
end;
$$;

grant execute on function public.forum_list_posts(bigint) to authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
