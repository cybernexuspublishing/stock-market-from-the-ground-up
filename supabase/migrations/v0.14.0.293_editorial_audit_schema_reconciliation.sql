-- v0.14.0.293 | Non-mutating verification of already-installed B01 editorial controls.
-- Earlier v0.14.0.280 and v0.14.0.281 source files correspond to live objects
-- but are absent as individual Supabase migration history entries.
-- DO NOT invent historical application timestamps or replay either migration.
-- This establishes a NEW reproducible 2026-10-26 schema-gate record only.
BEGIN;
SET LOCAL statement_timeout='30s';
DO $gate$
DECLARE
 r record;
BEGIN
 FOR r IN
  SELECT * FROM (VALUES
   ('public.lab_training_sets_v014'::regclass, 'gu_v014280_rubric_review_audit'::text,
    'gu_v014280_audit_lab_rubric_review'::text,'LAB_RUBRIC_REVIEW_APPROVED'::text),
   ('public.lab_instruction_v014'::regclass,'gu_v014281_lesson_review_audit',
    'gu_v014281_audit_lab_instruction_review','LAB_PRIVATE_LESSON_REVIEW_APPROVED')
  ) AS e(tbl,trigger_name,function_name,required_audit_action)
 LOOP
  IF NOT EXISTS (
   SELECT 1 FROM pg_trigger t
   JOIN pg_proc p ON p.oid=t.tgfoid
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE t.tgrelid=r.tbl AND t.tgname=r.trigger_name
    AND t.tgenabled='O' AND NOT t.tgisinternal
    AND n.nspname='public' AND p.proname=r.function_name AND p.prosecdef
    AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
    AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND EXISTS(SELECT 1 FROM unnest(p.proconfig) c WHERE c='search_path=pg_catalog')
    AND position(r.required_audit_action IN p.prosrc)>0
    AND position('admin_audit_log' IN p.prosrc)>0
  ) THEN
    RAISE EXCEPTION 'V014293_INSTALLED_APPROVAL_GUARD_DRIFT: %',r.function_name;
  END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
  AND table_name='lab_training_sets_v014' AND column_name='reviewed_by')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
  AND table_name='lab_training_sets_v014' AND column_name='reviewed_at')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
  AND table_name='lab_instruction_v014' AND column_name='reviewed_by')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
  AND table_name='lab_instruction_v014' AND column_name='reviewed_at')
 THEN RAISE EXCEPTION 'V014293_REVIEW_ATTRIBUTION_COLUMNS_MISSING';END IF;
END $gate$;
COMMIT;
