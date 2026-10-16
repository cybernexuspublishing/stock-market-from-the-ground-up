-- Cyber Nexus v0.14.0.32-R1 — SINGLE RESULT SET. Read-only install evidence.
WITH checks(label,pass) AS (VALUES
 ('stepup_ledger_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_staff_password_stepup_v01432r1')),false)),
 ('attempt_rate_table_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_staff_stepup_rate_v01432r1')),false)),
 ('stepup_check_installed',to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NOT NULL),
 ('staff_role_minimal_rpc_installed',to_regprocedure('public.gu_staff_role_v01432r1()') IS NOT NULL),
 ('staff_lemon_readiness_minimal_rpc_installed',to_regprocedure('public.gu_staff_lemon_readiness_v01432r1()') IS NOT NULL),
 ('rate_status_installed',to_regprocedure('public.gu_staff_stepup_rate_status_v01432r1(uuid)') IS NOT NULL),
 ('attempt_rpc_installed',to_regprocedure('public.gu_staff_stepup_attempt_v01432r1(uuid,uuid,boolean)') IS NOT NULL),
 ('anon_cannot_write_stepup',NOT coalesce(has_table_privilege('anon','public.gu_staff_password_stepup_v01432r1','INSERT'),false)),
 ('member_cannot_write_stepup',NOT coalesce(has_table_privilege('authenticated','public.gu_staff_password_stepup_v01432r1','INSERT'),false)),
 ('member_cannot_call_attempt',NOT coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_staff_stepup_attempt_v01432r1(uuid,uuid,boolean)'),'EXECUTE'),false)),
 ('anon_cannot_call_attempt',NOT coalesce(has_function_privilege('anon',to_regprocedure('public.gu_staff_stepup_attempt_v01432r1(uuid,uuid,boolean)'),'EXECUTE'),false)),
 ('service_can_register_attempt',coalesce(has_function_privilege('service_role',to_regprocedure('public.gu_staff_stepup_attempt_v01432r1(uuid,uuid,boolean)'),'EXECUTE'),false)),
 ('owner_upload_policy_preserved',EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='gu_v01430_owner_digital_upload')),
 ('protected_settings_trigger_preserved',EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='gu_v01431r1_protected_settings' AND tgenabled IN ('O','A'))),
 ('no_remaining_direct_aal2_functions',NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosrc ~* 'aal2')),
 ('no_aal2_rls_policy',NOT EXISTS(SELECT 1 FROM pg_policies WHERE (coalesce(qual,'')||' '||coalesce(with_check,'')) ~* 'aal2')),
 ('staff_console_present',to_regprocedure('public.gu_staff_console_v01431r1()') IS NOT NULL)
) SELECT label,coalesce(pass,false) AS pass FROM checks ORDER BY label;
