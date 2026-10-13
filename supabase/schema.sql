-- The Stock Market: From the Ground Up - v0.1 database schema
-- Run in a new Supabase project. Review before production.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.lab_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  score numeric,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, lab_id)
);

create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,
  status text not null check (status in ('active','trialing','past_due','cancelled','expired')),
  source text not null,
  external_customer_id text,
  external_subscription_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, product_key)
);

alter table public.profiles enable row level security;
alter table public.lab_progress enable row level security;
alter table public.entitlements enable row level security;

create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "read own progress" on public.lab_progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.lab_progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.lab_progress for update using (auth.uid() = user_id);

-- Users may READ their entitlements but may not grant themselves paid access.
-- Only the server-side payment webhook should insert/update this table using a service role.
create policy "read own entitlements" on public.entitlements for select using (auth.uid() = user_id);

-- v0.2 account-profile trigger.
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

-- Allow users to reset only their own lab-progress records.
drop policy if exists "delete own progress" on public.lab_progress;
create policy "delete own progress" on public.lab_progress for delete using (auth.uid() = user_id);


-- v0.3 explicit authenticated grants.
-- RLS policies above still limit users to their own rows.
grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.lab_progress to authenticated;
grant select on table public.entitlements to authenticated;
revoke all on table public.profiles from anon;
revoke all on table public.lab_progress from anon;
revoke all on table public.entitlements from anon;

-- v0.5 additions are maintained in migrations/v0.5_identity_settings_forum.sql.
-- For a new project, run this base schema first, then run that migration.
