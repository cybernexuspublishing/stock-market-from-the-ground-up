-- v0.14.0.168 | read-only verification, never a migration.
-- Does not touch protected grades, entitlements, private member notes or credits.
-- Run as Owner in the intended Supabase project AFTER reviewing/applying .168.
WITH required(label,identifier) AS (
 VALUES ('Academy enrollments','public.gu_bootcamp_academy_enrollments_v014168'),
        ('Academy day progress','public.gu_bootcamp_academy_progress_v014168'),
        ('Existing 30-day progress','public.gu_bootcamp_progress_v014144'),
        ('Existing Crownlight ledger','public.groundup_question_pass_buckets'),
        ('Existing Owner Spark adjustments','public.groundup_question_pass_adjustments')
)
SELECT label,identifier, CASE WHEN to_regclass(identifier) IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END AS status
 FROM required ORDER BY label;
SELECT t.tablename,t.rowsecurity AS rls_enabled,
 has_table_privilege('authenticated',format('%I.%I',t.schemaname,t.tablename),'SELECT') AS authenticated_select,
 has_table_privilege('authenticated',format('%I.%I',t.schemaname,t.tablename),'INSERT') AS authenticated_insert,
 has_table_privilege('authenticated',format('%I.%I',t.schemaname,t.tablename),'UPDATE') AS authenticated_update,
 has_table_privilege('service_role',format('%I.%I',t.schemaname,t.tablename),'SELECT') AS service_select
 FROM pg_tables t WHERE t.schemaname='public' AND
 t.tablename IN ('gu_bootcamp_academy_enrollments_v014168',
 'gu_bootcamp_academy_progress_v014168','gu_bootcamp_progress_v014144',
 'groundup_question_pass_buckets','groundup_question_pass_adjustments')
 ORDER BY t.tablename;
SELECT p.proname, p.prosecdef AS security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
 AND p.proname IN ('gu_bootcamp_academy_save_v014168',
 'gu_bootcamp_save_progress_v014144','groundup_question_pass_summary',
 'groundup_question_pass_spend','groundup_question_pass_adjust')
 ORDER BY p.proname;
SELECT tablename,policyname,roles,cmd FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('gu_bootcamp_academy_enrollments_v014168',
 'gu_bootcamp_academy_progress_v014168')
 ORDER BY tablename,policyname;
-- Do not declare production acceptance solely from these metadata results:
-- test each authenticated Cloudflare API with Owner/member/nonmember accounts,
-- stale revisions, cross-origin writes and account switching before launch.
