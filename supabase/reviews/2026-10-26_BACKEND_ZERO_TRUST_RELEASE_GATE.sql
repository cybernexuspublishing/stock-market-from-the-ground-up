-- The Stock Market: From the Ground Up | Supabase recurring Zero Trust release gate.
-- Non-destructive, read-only: no test accounts, no provider credentials, no answer keys.
-- Run after each backend migration, before certifying a member release.
-- Authoritative evidence = live SQL success + separate genuine member sessions.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
DO $gate$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity)
 THEN RAISE EXCEPTION 'ZERO_TRUST_RLS_OFF';END IF;
 IF (SELECT count(*) FROM public.platform_labs)<>419
 THEN RAISE EXCEPTION 'ZERO_TRUST_CANONICAL_LABS_DRIFT';END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND (has_table_privilege('anon',c.oid,'INSERT')
      OR has_table_privilege('anon',c.oid,'UPDATE')
      OR has_table_privilege('anon',c.oid,'DELETE')))
 THEN RAISE EXCEPTION 'ZERO_TRUST_ANON_TABLE_WRITES';END IF;
 IF has_table_privilege('anon','public.lab_instruction_v014','SELECT')
 OR has_table_privilege('authenticated','public.lab_instruction_v014','SELECT')
 OR has_table_privilege('anon','public.lab_training_sets_v014','SELECT')
 OR has_table_privilege('authenticated','public.lab_training_sets_v014','SELECT')
 OR has_table_privilege('anon','public.lab_training_attempts_v014','SELECT')
 OR has_table_privilege('authenticated','public.lab_training_attempts_v014','SELECT')
 THEN RAISE EXCEPTION 'ZERO_TRUST_PRIVATE_LEARNING_EXPOSED';END IF;
 IF has_table_privilege('authenticated','public.site_settings','UPDATE')
 OR has_table_privilege('authenticated','public.site_settings','INSERT')
 OR has_table_privilege('authenticated','public.admin_user_roles','UPDATE')
 OR has_table_privilege('authenticated','public.admin_role_permissions','UPDATE')
 OR has_column_privilege('authenticated','public.profiles','account_kind','UPDATE')
 OR has_column_privilege('authenticated','public.profiles','deleted_at','UPDATE')
 THEN RAISE EXCEPTION 'ZERO_TRUST_MEMBER_PRIVILEGE_ESCALATION';END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE public=true)
 THEN RAISE EXCEPTION 'ZERO_TRUST_PUBLIC_STORAGE_BUCKET';END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
  AND p.prosecdef AND (p.proconfig IS NULL OR NOT EXISTS
    (SELECT 1 FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%')))
 THEN RAISE EXCEPTION 'ZERO_TRUST_DEFINER_UNSET_SEARCHPATH';END IF;
 IF (SELECT count(*) FROM public.gu_founder_plans_v014173
   WHERE (plan_code='FOUNDING_30' AND price_cents=4999 AND term_days=30 AND purchase_discount_bps=1000)
      OR (plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=1500))<>2
 THEN RAISE EXCEPTION 'ZERO_TRUST_FOUNDER_PRICING_DRIFT';END IF;
 IF EXISTS(SELECT 1 FROM public.lab_training_sets_v014 WHERE review_state='reviewed'
    AND (reviewed_by IS NULL OR reviewed_at IS NULL OR review_frozen_at IS NULL))
 THEN RAISE EXCEPTION 'ZERO_TRUST_UNATTRIBUTED_GRADING_APPROVAL';END IF;
 IF EXISTS(SELECT 1 FROM public.lab_instruction_v014 WHERE
   source_status ~ '^(editorially_reviewed|owner_reviewed)(_|$)'
   AND (reviewed_by IS NULL OR reviewed_at IS NULL))
 THEN RAISE EXCEPTION 'ZERO_TRUST_UNATTRIBUTED_LESSON_APPROVAL';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid='public.gu_bootcamp_academy_audit_v014295'::regclass
   AND c.relrowsecurity AND NOT has_table_privilege('anon',c.oid,'SELECT')
   AND NOT has_table_privilege('authenticated',c.oid,'SELECT')
   AND has_table_privilege('service_role',c.oid,'INSERT'))
 OR (SELECT count(*) FROM pg_trigger
   WHERE tgname IN('gu_v014295_enrollment_audit','gu_v014295_progress_audit') AND tgenabled='O')<>2
 THEN RAISE EXCEPTION 'ZERO_TRUST_ACADEMY_AUDIT_DISABLED_OR_EXPOSED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgname='gu_v014292_graded_revision_guard'
     AND tgrelid='public.lab_training_sets_v014'::regclass AND tgenabled='O')
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='gu_v014292_graded_review_attribution'
     AND conrelid='public.lab_training_sets_v014'::regclass)
 THEN RAISE EXCEPTION 'ZERO_TRUST_GRADED_VERSION_LOCK_MISSING';END IF;
END $gate$;
SELECT 'PASS' AS backend_zero_trust_schema_gate,
 (SELECT count(*) FROM public.platform_labs) AS canonical_labs,
 (SELECT count(*) FROM public.lab_training_sets_v014) AS private_grading_sets,
 (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p')) AS public_tables,
 (SELECT count(*) FROM public.lab_training_sets_v014 WHERE review_state='reviewed') AS individually_reviewed_assessments;
COMMIT;
