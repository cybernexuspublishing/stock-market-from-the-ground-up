-- v0.14.0.2 — authorized identity-correction compatibility repair.
-- IMPORTANT: Run only after reviewing the prior v0.5.3 profile identity trigger.
-- Owner API runs with server-only Supabase service credentials; registered users must remain unable to rename identities.
-- Display name remains equal to username under the existing owner-approved identity rule.
begin;
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_privileged boolean := coalesce(current_setting('request.jwt.claim.role',true),'') = 'service_role';
begin
  if old.username is not null and new.username is distinct from old.username and not is_privileged then
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
-- Preserve existing trigger name, existing uniqueness/format checks, and user grants.
-- Do not introduce a SECURITY DEFINER override function callable from a browser.
commit;
