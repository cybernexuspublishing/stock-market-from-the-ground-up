-- Widen built-in avatar allowlist to the original nine plus 30 newly approved
-- first-party portraits. User-uploaded files retain their existing owner checks.
create or replace function public.gu_guard_member_avatar_v1()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if current_user='authenticated' then
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null and
   not(new.avatar_url ~ '^https://stock-market-from-the-ground-up-d1r\.pages\.dev/assets/avatars/av-[fmn]([1-9]|1[0-3])\.svg$'
    or new.avatar_url ~ ('^https://[a-z0-9]{20}\.supabase\.co/storage/v1/object/public/gu-member-avatars/'||new.id::text||'/[0-9a-f]{32}\.webp$'))
  then raise exception 'Only approved avatars are permitted' using errcode='23514';end if;
  if new.bio is distinct from old.bio and char_length(coalesce(new.bio,''))>1000 then
   raise exception 'Biography must be 1000 characters or fewer' using errcode='23514';end if;
 end if;
 return new;
end $$;
revoke all on function public.gu_guard_member_avatar_v1() from public,anon,authenticated;
