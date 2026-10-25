-- The Stock Market: From the Ground Up
-- Security hardening v0.14.0.249 | 2026-10-25
-- Scope: internal trigger handlers + search-path stabilization only.
-- Not a billing, entitlement, or LIVE payment enablement migration.
-- Owner-approved automated engineering remediation; do not broaden public RPC grants.
--
-- Preflight: each named function verified in pg_proc as trigger/event_trigger, and
-- its normal trigger binding inspected in pg_trigger/pg_event_trigger.
-- PostgreSQL trigger execution invokes the registered trigger function through
-- the trigger machinery; this SQL only revokes direct RPC EXECUTE privileges.

REVOKE EXECUTE ON FUNCTION public.activate_book_trial_on_confirmation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fill_profile_auth_identity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.journal_schedule_reviews_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.journal_set_timestamps_and_reviews() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_auth_identity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.v135_refuse_legacy_showcase_access() FROM PUBLIC, anon, authenticated;

-- Preserve explicit service-role privileges for database administration and
-- safely controlled future installation of ordinary/event triggers.
GRANT EXECUTE ON FUNCTION public.activate_book_trial_on_confirmation() TO service_role;
GRANT EXECUTE ON FUNCTION public.fill_profile_auth_identity() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.journal_schedule_reviews_after_insert() TO service_role;
GRANT EXECUTE ON FUNCTION public.journal_set_timestamps_and_reviews() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_auth_identity() TO service_role;
GRANT EXECUTE ON FUNCTION public.v135_refuse_legacy_showcase_access() TO service_role;

-- Explicit path resolution avoids caller-controlled search_path for these
-- two functions. Both bodies were inspected and use pg_catalog built-ins only.
ALTER FUNCTION public.protect_username_change()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.normalize_username(text)
  SET search_path = pg_catalog, public;

-- Read-only postflight:
-- SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') anon_exec,
--        has_function_privilege('authenticated',p.oid,'EXECUTE') auth_exec
-- FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
-- AND p.proname IN ('activate_book_trial_on_confirmation','fill_profile_auth_identity',
-- 'handle_new_user','journal_schedule_reviews_after_insert','journal_set_timestamps_and_reviews',
-- 'rls_auto_enable','sync_profile_auth_identity','v135_refuse_legacy_showcase_access');
--
-- Expected: anon_exec=false, auth_exec=false for these eight.
-- Rollback (controlled): GRANT EXECUTE ON FUNCTION ... TO PUBLIC for each
-- trigger handler if evidence demonstrates a compatibility issue; do not
-- perform rollback automatically without confirming impact.
