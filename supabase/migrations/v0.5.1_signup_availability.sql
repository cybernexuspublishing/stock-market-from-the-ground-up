-- v0.5.1 signup availability checks
-- Run after v0.5_identity_settings_forum.sql.
-- This exposes only a boolean availability result, never another user's email address.
-- Note: any public email-availability checker can still be used for account enumeration;
-- add Cloudflare Turnstile/rate limiting before broad public promotion.

create or replace function public.email_is_available(candidate text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    candidate is not null
    and length(trim(candidate)) between 3 and 320
    and position('@' in trim(candidate)) > 1
    and not exists (
      select 1
      from auth.users u
      where lower(u.email) = lower(trim(candidate))
    );
$$;

revoke all on function public.email_is_available(text) from public;
grant execute on function public.email_is_available(text) to anon, authenticated;
