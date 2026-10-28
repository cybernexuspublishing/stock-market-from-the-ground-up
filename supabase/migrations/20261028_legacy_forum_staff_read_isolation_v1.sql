-- Legacy educational forum staff oversight; does not change member edit/write rules.
-- V1 read-only staff permissions and protection of unpublished legacy content.
DROP POLICY IF EXISTS v0143_legacy_topics_read ON public.forum_topics;
DROP POLICY IF EXISTS v0143_legacy_posts_read ON public.forum_posts;
DROP POLICY IF EXISTS gu_legacy_staff_topics_read_v20261028 ON public.forum_topics;
CREATE POLICY gu_legacy_staff_topics_read_v20261028 ON public.forum_topics
 FOR SELECT TO authenticated USING (public.gu_commons_staff_read_v20261028());
DROP POLICY IF EXISTS gu_legacy_staff_posts_read_v20261028 ON public.forum_posts;
CREATE POLICY gu_legacy_staff_posts_read_v20261028 ON public.forum_posts
 FOR SELECT TO authenticated USING (public.gu_commons_staff_read_v20261028());
DROP POLICY IF EXISTS gu_staff_official_forum_read_v20261028 ON public.forum_official_posts;
CREATE POLICY gu_staff_official_forum_read_v20261028 ON public.forum_official_posts
 FOR SELECT TO authenticated USING (public.gu_commons_staff_read_v20261028());

CREATE OR REPLACE FUNCTION public.forum_get_topic(target_topic_id bigint)
 RETURNS TABLE(topic_id bigint, category_id bigint, category_name text, author_id uuid, author_username text, title text, body text, ticker text, lab_id text, created_at timestamp with time zone, updated_at timestamp with time zone, is_locked boolean, discussion_unlocked boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.v0143_legacy_forum_can_read() then raise exception 'Only eligible production members may read this forum'; end if;
  return query
  select t.id,t.category_id,c.name,t.author_id,coalesce(p.username,'member'),t.title,
         case when t.lab_id is null or exists (
           select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id
         ) or public.gu_commons_staff_read_v20261028() then t.body else '' end,
         t.ticker,t.lab_id,t.created_at,t.updated_at,t.is_locked,
         (t.lab_id is null or exists (
           select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id
         ) or public.gu_commons_staff_read_v20261028()) as discussion_unlocked
  from public.forum_topics t
  join public.forum_categories c on c.id=t.category_id
  left join public.profiles p on p.id=t.author_id
  where t.id=target_topic_id and (t.status='published' or public.gu_commons_staff_read_v20261028());
end;$function$;

CREATE OR REPLACE FUNCTION public.forum_list_topics(category_filter text DEFAULT NULL::text, search_filter text DEFAULT NULL::text)
 RETURNS TABLE(topic_id bigint, category_slug text, category_name text, author_username text, title text, ticker text, lab_id text, created_at timestamp with time zone, updated_at timestamp with time zone, reply_count bigint, is_pinned boolean, is_locked boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.v0143_legacy_forum_can_read() then raise exception 'Only eligible production members may read this forum'; end if;
  return query
  select t.id,c.slug,c.name,coalesce(p.username,'member'),t.title,t.ticker,t.lab_id,t.created_at,t.updated_at,
         (select count(*) from public.forum_posts fp where fp.topic_id=t.id and fp.status='published'),
         t.is_pinned,t.is_locked
  from public.forum_topics t
  join public.forum_categories c on c.id=t.category_id
  left join public.profiles p on p.id=t.author_id
  where ((t.status='published' and c.is_active=true) or public.gu_commons_staff_read_v20261028())
    and (category_filter is null or category_filter='' or c.slug=category_filter)
    and (search_filter is null or search_filter='' or t.title ilike '%'||search_filter||'%' or coalesce(t.ticker,'') ilike '%'||search_filter||'%' or coalesce(t.lab_id,'') ilike '%'||search_filter||'%')
  order by t.is_pinned desc,t.updated_at desc,t.created_at desc;
end;$function$;

CREATE OR REPLACE FUNCTION public.forum_list_posts(target_topic_id bigint)
 RETURNS TABLE(post_id bigint, author_id uuid, author_username text, body text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.v0143_legacy_forum_can_read() then raise exception 'Only eligible production members may read this forum'; end if;
  if exists (
    select 1 from public.forum_topics t
    where t.id=target_topic_id and t.lab_id is not null
      and not exists (select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id)
      and not public.gu_commons_staff_read_v20261028()
  ) then
    return;
  end if;
  return query
  select fp.id,fp.author_id,coalesce(p.username,'member'),fp.body,fp.created_at,fp.updated_at
  from public.forum_posts fp
  left join public.profiles p on p.id=fp.author_id
  where fp.topic_id=target_topic_id and (fp.status='published' or public.gu_commons_staff_read_v20261028())
  order by fp.created_at asc;
end;$function$;
