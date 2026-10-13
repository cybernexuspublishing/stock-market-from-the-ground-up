-- v0.3: Explicit browser-role grants.
-- RLS policies still restrict each authenticated user to their own rows.

grant usage on schema public to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.lab_progress to authenticated;
grant select on table public.entitlements to authenticated;

-- Keep unauthenticated visitors from reading/writing member data.
revoke all on table public.profiles from anon;
revoke all on table public.lab_progress from anon;
revoke all on table public.entitlements from anon;
