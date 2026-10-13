-- v0.2 migration: create a public profile for each new Auth user.
-- This is the same controlled trigger used in production setup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select
  id,
  coalesce(
    raw_user_meta_data ->> 'display_name',
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name'
  )
from auth.users
on conflict (id) do nothing;
