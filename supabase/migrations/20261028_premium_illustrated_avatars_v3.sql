-- Member avatars v3: whitelist 30 illustrated WebP portraits and retain existing SVGs and verified uploads.
CREATE OR REPLACE FUNCTION public.gu_guard_member_avatar_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if current_user='authenticated' then
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null and
   not(new.avatar_url ~ '^https://stock-market-from-the-ground-up-d1r\.pages\.dev/assets/avatars/av-[fmn]([1-9]|1[0-3])\.svg$'
    or new.avatar_url ~ '^https://stock-market-from-the-ground-up-d1r[.]pages[.]dev/assets/avatars/av-[fmn]([4-9]|1[0-3])[.]webp$'
    or new.avatar_url ~ ('^https://[a-z0-9]{20}\.supabase\.co/storage/v1/object/public/gu-member-avatars/'||new.id::text||'/[0-9a-f]{32}\.webp$'))
  then raise exception 'Only approved avatars are permitted' using errcode='23514';end if;
  if new.bio is distinct from old.bio and char_length(coalesce(new.bio,''))>1000 then
   raise exception 'Biography must be 1000 characters or fewer' using errcode='23514';end if;
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.gu_community_author_avatars_v1(p_author_ids uuid[])
 RETURNS TABLE(author_id uuid, avatar_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare viewer uuid:=auth.uid();
begin
 if viewer is null or p_author_ids is null or array_length(p_author_ids,1) is null
    or array_length(p_author_ids,1)>50 then return; end if;
 if not exists(select 1 from public.profiles q where q.id=viewer
    and q.account_kind='member' and q.deleted_at is null) then return; end if;
 if exists(select 1 from public.admin_user_flags f where f.user_id=viewer
     and f.status in ('suspended','restricted')) then return; end if;
 if exists(select 1 from public.admin_user_roles r where r.user_id=viewer
    and r.role_code='SHOWCASE_VIEWER'
    and (r.expires_at is null or r.expires_at>now())) then return; end if;
 return query
 select p.id,
 case
  when p.avatar_url ~ '^https://stock-market-from-the-ground-up-d1r[.]pages[.]dev/assets/avatars/av-[fmn]([1-9]|1[0-3])[.]svg$'
   or p.avatar_url ~ '^https://stock-market-from-the-ground-up-d1r[.]pages[.]dev/assets/avatars/av-[fmn]([4-9]|1[0-3])[.]webp$'
   then p.avatar_url
  when p.avatar_url like 'https://oxihglyfgzywsupnyicb.supabase.co/storage/v1/object/public/gu-member-avatars/%'
    and p.avatar_url like ('%/gu-member-avatars/'||p.id::text||'/%')
    and p.avatar_url ~ ('/gu-member-avatars/'||p.id::text||'/[0-9a-f]{32}[.]webp$')
   then p.avatar_url
  else null end
 from public.profiles p
 where p.id=any(p_author_ids)
   and p.account_kind='member' and p.deleted_at is null
   and (
    exists(select 1 from public.commons_topics c where c.author_user_id=p.id
     and c.status='published' and c.forum_code not like 'F600%')
    or exists(select 1 from public.commons_posts c join public.commons_topics t on t.id=c.topic_id
     where c.author_user_id=p.id and c.status='published' and t.status='published'
     and t.forum_code not like 'F600%')
    or exists(select 1 from public.forum_topics ft where ft.author_id=p.id and ft.status='published')
    or exists(select 1 from public.forum_posts fp join public.forum_topics ft on ft.id=fp.topic_id
     where fp.author_id=p.id and fp.status='published' and ft.status='published')
   );
end $function$
;
revoke all on function public.gu_guard_member_avatar_v1() from public,anon,authenticated;
revoke all on function public.gu_community_author_avatars_v1(uuid[]) from public,anon;
grant execute on function public.gu_community_author_avatars_v1(uuid[]) to authenticated;
notify pgrst,'reload schema';
