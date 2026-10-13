-- v0.5 identity, session preferences, and member forum
-- Run once in Supabase SQL Editor after v0.4 is deployed.

-- 1) Account identity and session preference fields.
alter table public.profiles
  add column if not exists username text,
  add column if not exists session_timeout_minutes integer not null default 60;

-- Normalize any existing usernames before constraints/indexes are enforced.
update public.profiles
set username = lower(trim(username))
where username is not null;

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

alter table public.profiles drop constraint if exists profiles_session_timeout_allowed;
alter table public.profiles add constraint profiles_session_timeout_allowed
  check (session_timeout_minutes in (15, 30, 60, 240, 480, 1440));

-- Safe username availability check. It exposes only availability, never email addresses.
create or replace function public.username_is_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    candidate is not null
    and lower(trim(candidate)) ~ '^[a-z0-9_]{3,24}$'
    and not exists (
      select 1 from public.profiles p
      where lower(p.username) = lower(trim(candidate))
    );
$$;

grant execute on function public.username_is_available(text) to anon, authenticated;

-- Every new Auth account receives a profile, including username from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if requested_username = '' then
    requested_username := null;
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    requested_username,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Username is an account identifier. Once set, users cannot change it themselves.
-- An administrator may correct it later from a trusted server/admin workflow if necessary.
create or replace function public.protect_username_change()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'Username cannot be changed after it has been set.';
  end if;
  if new.username is not null then
    new.username := lower(trim(new.username));
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_username on public.profiles;
create trigger protect_profile_username
  before update on public.profiles
  for each row execute procedure public.protect_username_change();

-- Restrict authenticated profile writes to user-editable fields only.
revoke update on public.profiles from authenticated;
grant update (username, display_name, session_timeout_minutes) on public.profiles to authenticated;

-- 2) Forum tables.
create table if not exists public.forum_categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true
);

create table if not exists public.forum_topics (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.forum_categories(id),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 140),
  body text not null check (char_length(body) between 10 and 12000),
  ticker text check (ticker is null or ticker ~ '^[A-Z0-9.\-]{1,12}$'),
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id bigint generated always as identity primary key,
  topic_id bigint not null references public.forum_topics(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 8000),
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  topic_id bigint references public.forum_topics(id) on delete cascade,
  post_id bigint references public.forum_posts(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 80),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewed','closed')),
  created_at timestamptz not null default now(),
  check ((topic_id is not null)::integer + (post_id is not null)::integer = 1)
);

alter table public.forum_categories enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reports enable row level security;

-- Forum categories may be visible to everyone. Topic/reply content requires a signed-in account.
drop policy if exists "read active forum categories" on public.forum_categories;
create policy "read active forum categories" on public.forum_categories
  for select using (is_active = true);

drop policy if exists "read published forum topics" on public.forum_topics;
create policy "read published forum topics" on public.forum_topics
  for select to authenticated using (status = 'published');

drop policy if exists "create own forum topics" on public.forum_topics;
create policy "create own forum topics" on public.forum_topics
  for insert to authenticated with check (
    auth.uid() = author_id
    and status = 'published'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.username is not null)
  );

drop policy if exists "update own unlocked forum topics" on public.forum_topics;
create policy "update own unlocked forum topics" on public.forum_topics
  for update to authenticated
  using (auth.uid() = author_id and is_locked = false and status = 'published')
  with check (auth.uid() = author_id and status = 'published');

drop policy if exists "read published forum posts" on public.forum_posts;
create policy "read published forum posts" on public.forum_posts
  for select to authenticated using (status = 'published');

drop policy if exists "create own forum posts" on public.forum_posts;
create policy "create own forum posts" on public.forum_posts
  for insert to authenticated with check (
    auth.uid() = author_id
    and status = 'published'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.username is not null)
    and exists (select 1 from public.forum_topics t where t.id = topic_id and t.status = 'published' and t.is_locked = false)
  );

drop policy if exists "update own forum posts" on public.forum_posts;
create policy "update own forum posts" on public.forum_posts
  for update to authenticated
  using (auth.uid() = author_id and status = 'published')
  with check (auth.uid() = author_id and status = 'published');

drop policy if exists "create own forum reports" on public.forum_reports;
create policy "create own forum reports" on public.forum_reports
  for insert to authenticated with check (auth.uid() = reporter_id and status = 'open');

drop policy if exists "read own forum reports" on public.forum_reports;
create policy "read own forum reports" on public.forum_reports
  for select to authenticated using (auth.uid() = reporter_id);

-- Explicit grants. RLS remains the row-level enforcement layer.
grant select on public.forum_categories to anon, authenticated;
revoke insert, update on public.forum_topics from authenticated;
revoke insert, update on public.forum_posts from authenticated;
revoke insert on public.forum_reports from authenticated;
grant select on public.forum_topics to authenticated;
grant insert (category_id, author_id, title, body, ticker) on public.forum_topics to authenticated;
grant update (title, body, ticker, updated_at) on public.forum_topics to authenticated;
grant select on public.forum_posts to authenticated;
grant insert (topic_id, author_id, body) on public.forum_posts to authenticated;
grant update (body, updated_at) on public.forum_posts to authenticated;
grant select on public.forum_reports to authenticated;
grant insert (reporter_id, topic_id, post_id, reason, details) on public.forum_reports to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Forum feed functions expose only community-safe identity fields.
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
  if auth.uid() is null then
    raise exception 'Authentication required';
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
  if auth.uid() is null then
    raise exception 'Authentication required';
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
  if auth.uid() is null then
    raise exception 'Authentication required';
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

-- Seed initial forum categories.
insert into public.forum_categories (slug, name, description, sort_order)
values
  ('general-market', 'General Market Discussion', 'Broad stock-market discussion and market context.', 10),
  ('beginner-questions', 'Beginner Questions', 'Questions about concepts taught in the Foundations curriculum.', 20),
  ('fundamentals-research', 'Fundamentals & Company Research', 'Company information, filings, catalysts, valuation, and research process.', 30),
  ('technical-analysis', 'Technical Analysis & Charts', 'Candles, structure, VWAP, moving averages, support/resistance, volume, and chart reading.', 40),
  ('day-trading', 'Day Trading & Momentum', 'Intraday planning, momentum, execution, and risk discussion.', 50),
  ('tape-order-flow', 'Tape, Level II & Order Flow', 'Time & Sales, Level II, liquidity, spreads, and modern order-flow discussion.', 60),
  ('platform-simulator', 'Platform & Simulator', 'Platform setup, historical replay, chart settings, and simulator practice.', 70),
  ('books-labs', 'Books & Historical Labs', 'Questions and discussion tied to the Foundations books and Historical Lab IDs.', 80),
  ('risk-psychology', 'Risk & Trading Psychology', 'Risk controls, decision quality, discipline, and trading psychology.', 90)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;
