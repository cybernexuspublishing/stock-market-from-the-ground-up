-- v0.6 interactive learning system
-- Run after v0.5.3_identity_book_keys.sql.

-- Ensure the existing Book Key generator can resolve pgcrypto functions on Supabase.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
alter function public.admin_generate_book_key(text,text,integer,timestamptz)
  set search_path = public, extensions, pg_temp;

-- 1) Session preference: new accounts default to 30 minutes.
alter table public.profiles
  alter column session_timeout_minutes set default 30;

-- 2) Immutable learning attempts. First answers are preserved as submitted.
create table if not exists public.lab_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id text not null,
  book_number integer not null check (book_number in (1,2,3)),
  skill_code text not null,
  mode text not null check (mode in ('guided','practice','blind','assessment')),
  decision text check (decision is null or decision in ('ENTER','WATCH','NO_TRADE','OBSERVATION_ONLY')),
  confidence integer check (confidence is null or confidence between 1 and 5),
  evidence jsonb not null default '{}'::jsonb,
  invalidation text,
  notes text,
  process_score numeric not null default 0 check (process_score between 0 and 100),
  process_breakdown jsonb not null default '{}'::jsonb,
  mistakes text[] not null default '{}',
  reflection text,
  completed_at timestamptz not null default now()
);

alter table public.lab_attempts add column if not exists process_breakdown jsonb not null default '{}'::jsonb;

create index if not exists lab_attempts_user_lab_idx on public.lab_attempts(user_id,lab_id,completed_at desc);
create index if not exists lab_attempts_user_skill_idx on public.lab_attempts(user_id,skill_code,completed_at desc);

alter table public.lab_attempts enable row level security;
drop policy if exists "read own lab attempts" on public.lab_attempts;
create policy "read own lab attempts" on public.lab_attempts for select to authenticated using (auth.uid()=user_id);
drop policy if exists "insert own lab attempts" on public.lab_attempts;
create policy "insert own lab attempts" on public.lab_attempts for insert to authenticated with check (auth.uid()=user_id);
-- No browser update/delete policy: submitted first-attempt history remains immutable.
grant select,insert on public.lab_attempts to authenticated;
grant usage,select on sequence public.lab_attempts_id_seq to authenticated;
revoke all on public.lab_attempts from anon;

-- 3) Decision Journal.
create table if not exists public.decision_journal (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z0-9.\-]{1,12}$'),
  trade_date date not null,
  timeframe text,
  setup text,
  evidence text,
  thesis text,
  invalidation text,
  decision text not null check (decision in ('ENTER','WATCH','NO TRADE','OBSERVATION ONLY')),
  result_note text,
  lesson text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decision_journal enable row level security;
drop policy if exists "read own decision journal" on public.decision_journal;
create policy "read own decision journal" on public.decision_journal for select to authenticated using (auth.uid()=user_id);
drop policy if exists "insert own decision journal" on public.decision_journal;
create policy "insert own decision journal" on public.decision_journal for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "update own decision journal" on public.decision_journal;
create policy "update own decision journal" on public.decision_journal for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "delete own decision journal" on public.decision_journal;
create policy "delete own decision journal" on public.decision_journal for delete to authenticated using (auth.uid()=user_id);
grant select,insert,update,delete on public.decision_journal to authenticated;
grant usage,select on sequence public.decision_journal_id_seq to authenticated;
revoke all on public.decision_journal from anon;

-- 4) Link forum discussions to Historical Lab IDs.
alter table public.forum_topics add column if not exists lab_id text;
create index if not exists forum_topics_lab_id_idx on public.forum_topics(lab_id) where lab_id is not null;

-- Linked Historical Lab discussions are readable/repliable only after the signed-in learner has saved an interactive attempt for that Lab ID.
drop policy if exists "read published forum topics" on public.forum_topics;
create policy "read published forum topics" on public.forum_topics
  for select to authenticated using (
    status='published'
    and (
      lab_id is null
      or exists (
        select 1 from public.lab_attempts a
        where a.user_id=auth.uid() and a.lab_id=forum_topics.lab_id
      )
    )
  );

drop policy if exists "create own forum topics" on public.forum_topics;
create policy "create own forum topics" on public.forum_topics
  for insert to authenticated with check (
    auth.uid()=author_id
    and status='published'
    and exists (select 1 from public.profiles p where p.id=auth.uid() and p.username is not null)
    and (
      lab_id is null
      or exists (select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=forum_topics.lab_id)
    )
  );

drop policy if exists "read published forum posts" on public.forum_posts;
create policy "read published forum posts" on public.forum_posts
  for select to authenticated using (
    status='published'
    and exists (
      select 1 from public.forum_topics t
      where t.id=forum_posts.topic_id and t.status='published'
        and (
          t.lab_id is null
          or exists (select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id)
        )
    )
  );

drop policy if exists "create own forum posts" on public.forum_posts;
create policy "create own forum posts" on public.forum_posts
  for insert to authenticated with check (
    auth.uid()=author_id
    and status='published'
    and exists (select 1 from public.profiles p where p.id=auth.uid() and p.username is not null)
    and exists (
      select 1 from public.forum_topics t
      where t.id=topic_id and t.status='published' and t.is_locked=false
        and (
          t.lab_id is null
          or exists (select 1 from public.lab_attempts a where a.user_id=auth.uid() and a.lab_id=t.lab_id)
        )
    )
  );

grant insert (lab_id) on public.forum_topics to authenticated;

-- Recreate topic-list function with lab_id included.
drop function if exists public.forum_list_topics(text,text);
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
language plpgsql security definer set search_path=public stable as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
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

drop function if exists public.forum_get_topic(bigint);
create or replace function public.forum_get_topic(target_topic_id bigint)
returns table (
  topic_id bigint, category_id bigint, category_name text, author_id uuid, author_username text,
  title text, body text, ticker text, lab_id text, created_at timestamptz, updated_at timestamptz, is_locked boolean,
  discussion_unlocked boolean
)
language plpgsql security definer set search_path=public stable as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
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
drop function if exists public.forum_list_posts(bigint);
create or replace function public.forum_list_posts(target_topic_id bigint)
returns table (
  post_id bigint,
  author_id uuid,
  author_username text,
  body text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path=public stable as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
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

