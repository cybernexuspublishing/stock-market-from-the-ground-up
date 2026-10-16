-- Cyber Nexus v0.14.0.32-R1 — SINGLE RESULT SET, READ ONLY, no privileges modified.
WITH expected(name) AS (VALUES
 ('gu_digital_owner_guard_v01430'),('gu_digital_upload_allowed_v01430'),
 ('gu_owner_operations_save_v01431r1'),('gu_owner_print_catalog_save_v01428'),
 ('gu_owner_print_modes_save_v01429'),('gu_signed_owner_hold_v01431'),
 ('gu_signed_owner_offer_save_v01431'),('gu_signed_owner_orders_v01431'),
 ('gu_signed_owner_payment_switch_save_v01431'),('gu_signed_owner_session_v01431'),
 ('gu_signed_owner_transition_v01431'),('gu_staff_identity_v01431r1'),
 ('gu_v01431r1_control_write_guard'))
SELECT 'required_function' AS category,e.name AS object_name,
 count(p.oid)=1 AND bool_and(coalesce(p.prosecdef,false)) AND
 bool_and(coalesce(p.prosrc ~* 'aal2',false)) AS passed,
 count(p.oid)::text AS evidence
FROM expected e LEFT JOIN pg_proc p ON p.proname=e.name AND p.pronamespace='public'::regnamespace
GROUP BY e.name
UNION ALL
SELECT 'unexpected_mfa_function',p.proname,false,'Not in migration allowlist; inspect before running.'
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef AND p.prosrc ~* 'aal2'
AND p.proname NOT IN (SELECT name FROM expected)
UNION ALL
SELECT 'unexpected_mfa_policy',schemaname||'.'||tablename||'.'||policyname,false,'MFA policy must be reviewed'
FROM pg_policies WHERE (coalesce(qual,'')||' '||coalesce(with_check,'')) ~* 'aal2'
UNION ALL SELECT 'prerequisite','auth.jwt',to_regprocedure('auth.jwt()') IS NOT NULL,'Supabase Auth JWT'
UNION ALL SELECT 'prerequisite','Supabase profiles',to_regclass('public.profiles') IS NOT NULL,'Owner roles'
UNION ALL SELECT 'prerequisite','Admin Communications',to_regprocedure('public.gu_staff_console_v01431r1()') IS NOT NULL,'Staff RPC'
UNION ALL SELECT 'prerequisite','Protected site settings trigger',EXISTS(
 SELECT 1 FROM pg_trigger WHERE tgname='gu_v01431r1_protected_settings' AND tgenabled IN ('O','A')),'Must remain active'
ORDER BY category,object_name;
