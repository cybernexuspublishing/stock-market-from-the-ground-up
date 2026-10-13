-- v0.5.3 permanent account identity + multi-book Book Key redemption
-- Designed to run after v0.5 and v0.5.1. It also safely upgrades a database
-- where the earlier v0.5.2 Book Key migration was already applied.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Permanent username/display identity
-- ---------------------------------------------------------------------------
create or replace function public.normalize_username(candidate text)
returns text
language sql
immutable
as $$
  select case
    when trim(coalesce(candidate,'')) ~ '^[A-Za-z][A-Za-z0-9_]{2,23}$'
      then upper(substr(trim(candidate),1,1)) || substr(trim(candidate),2)
    else null
  end;
$$;

-- Normalize existing valid usernames and make display_name match username.
update public.profiles
set username = public.normalize_username(username),
    display_name = public.normalize_username(username)
where username is not null
  and public.normalize_username(username) is not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Z][A-Za-z0-9_]{2,23}$');

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.username_is_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.normalize_username(candidate) is not null
    and not exists (
      select 1 from public.profiles p
      where lower(p.username) = lower(public.normalize_username(candidate))
    );
$$;

revoke all on function public.username_is_available(text) from public;
grant execute on function public.username_is_available(text) to anon, authenticated;

-- New production accounts MUST provide a username during registration.
-- display_name is always the same as username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_claim uuid;
begin
  requested_username := public.normalize_username(new.raw_user_meta_data ->> 'username');
  if requested_username is null then
    raise exception 'A valid username is required to create an account.';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_username)
  on conflict (id) do update
    set username = coalesce(public.profiles.username, excluded.username),
        display_name = coalesce(public.profiles.username, excluded.username);

  begin
    requested_claim := nullif(trim(new.raw_user_meta_data ->> 'book_claim_token'),'')::uuid;
  exception when others then
    requested_claim := null;
  end;

  if requested_claim is not null then
    update public.book_key_claims
    set user_id = new.id
    where claim_token = requested_claim
      and user_id is null
      and consumed_at is null
      and expires_at > now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Username/display identity cannot be changed after registration.
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'Username cannot be changed after registration.';
  end if;

  if new.username is not null then
    new.username := public.normalize_username(new.username);
    if new.username is null then
      raise exception 'Invalid username.';
    end if;
    new.display_name := new.username;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_username on public.profiles;
drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
  before update on public.profiles
  for each row execute procedure public.protect_profile_identity();

-- Production users can change only the inactivity timeout from the browser.
revoke update on public.profiles from authenticated;
grant update (session_timeout_minutes) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Book Keys: a different book_code for each book.
--    Each account may redeem a given book_code only once.
-- ---------------------------------------------------------------------------
create table if not exists public.book_keys (
  id bigint generated always as identity primary key,
  book_code text,
  label text not null,
  code_hash text not null unique,
  is_active boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.book_keys add column if not exists book_code text;

create table if not exists public.book_key_claims (
  claim_token uuid primary key default gen_random_uuid(),
  book_key_id bigint not null references public.book_keys(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  consumed_at timestamptz
);

create table if not exists public.book_key_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key_id bigint not null references public.book_keys(id),
  book_code text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.book_key_redemptions add column if not exists book_code text;

-- Upgrade any v0.5.2 rows if present.
update public.book_key_redemptions r
set book_code = k.book_code
from public.book_keys k
where r.book_key_id = k.id
  and r.book_code is null
  and k.book_code is not null;

-- v0.5.2 allowed only one Book Key total per account. Remove that constraint.
alter table public.book_key_redemptions
  drop constraint if exists book_key_redemptions_user_id_key;

create unique index if not exists book_key_redemptions_user_book_code_unique
  on public.book_key_redemptions (user_id, book_code)
  where book_code is not null;

alter table public.book_keys enable row level security;
alter table public.book_key_claims enable row level security;
alter table public.book_key_redemptions enable row level security;

revoke all on table public.book_keys from anon, authenticated;
revoke all on table public.book_key_claims from anon, authenticated;
revoke all on table public.book_key_redemptions from anon, authenticated;

-- Public pre-signup validation. Returns only a short-lived claim token.
create or replace function public.prepare_book_key_claim(candidate text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  key_row public.book_keys%rowtype;
  token uuid;
begin
  normalized := upper(regexp_replace(trim(coalesce(candidate,'')), '\s+', '', 'g'));
  if length(normalized) < 8 then return null; end if;

  select * into key_row
  from public.book_keys
  where code_hash = encode(digest(normalized, 'sha256'), 'hex')
    and is_active = true
    and book_code is not null
    and (expires_at is null or expires_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions)
  limit 1;

  if key_row.id is null then return null; end if;

  token := gen_random_uuid();
  insert into public.book_key_claims (claim_token, book_key_id)
  values (token, key_row.id);
  return token;
end;
$$;

revoke all on function public.prepare_book_key_claim(text) from public;
grant execute on function public.prepare_book_key_claim(text) to anon, authenticated;

-- Internal helper that applies one 30-day period for one book_code.
-- If another Book Key trial is still active, the new 30 days are appended.
create or replace function public.apply_book_key_for_user(target_user uuid, target_book_key_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key_row public.book_keys%rowtype;
  current_ent public.entitlements%rowtype;
  access_start timestamptz;
  access_end timestamptz;
begin
  select * into key_row
  from public.book_keys
  where id = target_book_key_id
  for update;

  if key_row.id is null
     or key_row.is_active is false
     or key_row.book_code is null
     or (key_row.expires_at is not null and key_row.expires_at <= now())
     or (key_row.max_redemptions is not null and key_row.redemption_count >= key_row.max_redemptions) then
    return jsonb_build_object('status','invalid');
  end if;

  if exists (
    select 1 from public.book_key_redemptions r
    where r.user_id = target_user
      and r.book_code = key_row.book_code
  ) then
    return jsonb_build_object(
      'status','already_redeemed',
      'book_code',key_row.book_code,
      'book_label',key_row.label
    );
  end if;

  select * into current_ent
  from public.entitlements
  where user_id = target_user
    and product_key = 'full_learning_access'
  limit 1;

  -- Do not burn a Book Key while a paid membership is active.
  if current_ent.id is not null
     and current_ent.status = 'active' then
    return jsonb_build_object(
      'status','active_paid_membership',
      'book_code',key_row.book_code,
      'book_label',key_row.label
    );
  end if;

  if current_ent.id is not null
     and current_ent.status = 'trialing'
     and current_ent.ends_at is not null
     and current_ent.ends_at > now() then
    access_start := current_ent.ends_at;
  else
    access_start := now();
  end if;

  access_end := access_start + interval '30 days';

  insert into public.book_key_redemptions
    (user_id, book_key_id, book_code, starts_at, ends_at)
  values
    (target_user, key_row.id, key_row.book_code, access_start, access_end);

  insert into public.entitlements
    (user_id, product_key, status, source, starts_at, ends_at)
  values
    (target_user, 'full_learning_access', 'trialing', 'book_key',
     case when access_start > now() then now() else access_start end,
     access_end)
  on conflict (user_id, product_key) do update
    set status = case
          when public.entitlements.status = 'active' then public.entitlements.status
          else 'trialing'
        end,
        source = case
          when public.entitlements.status = 'active' then public.entitlements.source
          else 'book_key'
        end,
        starts_at = case
          when public.entitlements.status = 'active' then public.entitlements.starts_at
          when public.entitlements.starts_at is null then now()
          else public.entitlements.starts_at
        end,
        ends_at = case
          when public.entitlements.status = 'active' and public.entitlements.ends_at is not null
            then greatest(public.entitlements.ends_at, excluded.ends_at)
          when public.entitlements.status = 'active' and public.entitlements.ends_at is null
            then null
          else excluded.ends_at
        end,
        updated_at = now();

  update public.book_keys
  set redemption_count = redemption_count + 1
  where id = key_row.id;

  return jsonb_build_object(
    'status','accepted',
    'book_code',key_row.book_code,
    'book_label',key_row.label,
    'access_starts_at',access_start,
    'access_ends_at',access_end
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'status','already_redeemed',
      'book_code',key_row.book_code,
      'book_label',key_row.label
    );
end;
$$;

revoke all on function public.apply_book_key_for_user(uuid,bigint) from public, anon, authenticated;

-- Signed-in Settings redemption.
create or replace function public.redeem_book_key(candidate text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  key_row public.book_keys%rowtype;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  normalized := upper(regexp_replace(trim(coalesce(candidate,'')), '\s+', '', 'g'));
  if length(normalized) < 8 then
    return jsonb_build_object('status','invalid');
  end if;

  select * into key_row
  from public.book_keys
  where code_hash = encode(digest(normalized, 'sha256'), 'hex')
    and is_active = true
    and book_code is not null
    and (expires_at is null or expires_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions)
  limit 1;

  if key_row.id is null then
    return jsonb_build_object('status','invalid');
  end if;

  return public.apply_book_key_for_user(uid, key_row.id);
end;
$$;

revoke all on function public.redeem_book_key(text) from public;
grant execute on function public.redeem_book_key(text) to authenticated;

-- Reader-safe list of the books already redeemed on the signed-in account.
create or replace function public.my_book_key_redemptions()
returns table (
  book_code text,
  book_label text,
  redeemed_at timestamptz,
  access_starts_at timestamptz,
  access_ends_at timestamptz
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
    r.book_code,
    k.label,
    r.created_at,
    r.starts_at,
    r.ends_at
  from public.book_key_redemptions r
  join public.book_keys k on k.id = r.book_key_id
  where r.user_id = auth.uid()
  order by r.created_at asc;
end;
$$;

revoke all on function public.my_book_key_redemptions() from public;
grant execute on function public.my_book_key_redemptions() to authenticated;

-- Activate a pre-signup claim when the user's email is confirmed.
create or replace function public.activate_pending_book_key_claim(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_row record;
  result jsonb;
begin
  select c.claim_token, c.book_key_id
  into claim_row
  from public.book_key_claims c
  where c.user_id = target_user
    and c.consumed_at is null
    and c.expires_at > now()
  order by c.created_at desc
  limit 1;

  if claim_row.claim_token is null then return; end if;

  result := public.apply_book_key_for_user(target_user, claim_row.book_key_id);

  update public.book_key_claims
  set consumed_at = now()
  where claim_token = claim_row.claim_token;
end;
$$;

revoke all on function public.activate_pending_book_key_claim(uuid) from public, anon, authenticated;

create or replace function public.activate_book_trial_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.activate_pending_book_key_claim(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists activate_book_trial_after_email_confirmation on auth.users;
create trigger activate_book_trial_after_email_confirmation
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.activate_book_trial_on_confirmation();

-- Remove the superseded v0.5.2 admin helper signature if it exists.
drop function if exists public.admin_generate_book_key(text,integer,timestamptz);

-- Admin-only Book Key generator.
-- Use a different book_code for each book. Multiple replacement keys may share
-- a book_code, but an account can redeem that book_code only once.
-- Examples:
-- select * from public.admin_generate_book_key('FOUNDATION_BOOK_1','Foundation Book I',null,null);
-- select * from public.admin_generate_book_key('FOUNDATION_BOOK_2','Foundation Book II',null,null);
-- select * from public.admin_generate_book_key('FOUNDATION_BOOK_3','Foundation Book III',null,null);
create or replace function public.admin_generate_book_key(
  target_book_code text,
  key_label text,
  redemption_limit integer default null,
  key_expires_at timestamptz default null
)
returns table(book_code text, label text, book_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  normalized text;
  code text;
begin
  code := upper(trim(coalesce(target_book_code,'')));
  if code !~ '^[A-Z0-9_]{3,64}$' then
    raise exception 'book_code must contain only A-Z, 0-9, or underscore.';
  end if;
  if trim(coalesce(key_label,'')) = '' then
    raise exception 'A label is required.';
  end if;
  if redemption_limit is not null and redemption_limit < 1 then
    raise exception 'redemption_limit must be null or >= 1.';
  end if;

  raw := upper(encode(gen_random_bytes(12),'hex'));
  raw := 'BOOK-' || substr(raw,1,4) || '-' || substr(raw,5,4) || '-' || substr(raw,9,4) || '-' || substr(raw,13,4) || '-' || substr(raw,17,4) || '-' || substr(raw,21,4);
  normalized := upper(regexp_replace(raw, '\s+', '', 'g'));

  insert into public.book_keys (book_code, label, code_hash, max_redemptions, expires_at)
  values (code, trim(key_label), encode(digest(normalized,'sha256'),'hex'), redemption_limit, key_expires_at);

  return query select code, trim(key_label), raw;
end;
$$;

revoke all on function public.admin_generate_book_key(text,text,integer,timestamptz) from public, anon, authenticated;
