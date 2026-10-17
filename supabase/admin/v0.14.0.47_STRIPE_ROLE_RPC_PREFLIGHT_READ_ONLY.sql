-- v0.14.0.47 | CYBER NEXUS | STRIPE TEST VERIFY ROLE RPC PREFLIGHT | READ ONLY
-- Document ID: GU-WEB-STRIPE-RPC-014047-20261017
-- DATE: 2026-10-17
-- Run only in the EXISTING Supabase project's SQL Editor with authorized Owner access.
-- This script reads metadata ONLY. It does not ALTER/GRANT/REVOKE, change MFA,
-- read member records, modify payments, or create products.
--
-- The internal gu_staff_identity_v01431r1() is intentionally REVOKED to
-- authenticated. The public facade gu_staff_role_v01432r1() is GRANTED.
-- The Cloudflare verifier must call the latter.
WITH expected(name,signature,authenticated_should_execute,anon_should_execute) AS (
 VALUES
  ('staff role (authorized facade)','public.gu_staff_role_v01432r1()',true,false),
  ('staff identity (private helper)','public.gu_staff_identity_v01431r1()',false,false),
  ('sandbox status (public authenticated RPC)','public.gu39_sandbox_owner_read()',true,false),
  ('sandbox toggle (guarded Owner RPC)','public.gu39_sandbox_owner_toggle(boolean,timestamp with time zone)',true,false),
  ('password step-up status (guarded RPC)','public.gu_staff_stepup_active_v01432r1()',true,false)
), inspected AS (
 SELECT e.*,to_regprocedure(e.signature) AS function_oid
 FROM expected e
)
SELECT name,
 signature,
 function_oid IS NOT NULL AS exists_in_database,
 COALESCE(has_function_privilege('authenticated',function_oid,'EXECUTE'),false) AS authenticated_can_execute,
 COALESCE(has_function_privilege('anon',function_oid,'EXECUTE'),false) AS anonymous_can_execute,
 CASE
  WHEN function_oid IS NULL THEN 'MISSING - review versioned migration; DO NOT run old migrations blindly'
  WHEN COALESCE(has_function_privilege('authenticated',function_oid,'EXECUTE'),false) IS DISTINCT FROM authenticated_should_execute
    THEN 'EXECUTE GRANT MISMATCH - review'
  WHEN COALESCE(has_function_privilege('anon',function_oid,'EXECUTE'),false) IS DISTINCT FROM anon_should_execute
    THEN 'ANONYMOUS EXECUTE MISMATCH - review'
  ELSE 'PASS'
 END AS verification
FROM inspected ORDER BY name;

-- Validate protected shadow tables and row-level security. Each should exist and RLS enabled.
SELECT name,
       to_regclass('public.'||name) IS NOT NULL AS exists_in_database,
       COALESCE((SELECT relrowsecurity FROM pg_class
         WHERE oid=to_regclass('public.'||name)),false) AS rls_enabled
FROM (VALUES ('gu39_sandbox_settings'),('gu39_sandbox_intents'),
             ('gu39_sandbox_events'),('gu39_sandbox_access')) AS t(name)
ORDER BY name;

-- MFA is enforced within the database's authorized staff helper; the
-- Cloudflare REQUIRE_STAFF_AAL2_V135 variable does not disable those SQL checks.
-- Do not weaken this guard to solve an error. Log in with eligible staff AAL2.
