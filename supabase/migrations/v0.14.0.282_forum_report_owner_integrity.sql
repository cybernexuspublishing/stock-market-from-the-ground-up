-- v0.14.0.282 | Legacy/current forum-report owner-identity integrity
-- Supabase only: reversible schema hardening, no member data/payment updates.
-- Rollback: supabase/rollbacks/v0.14.0.282_forum_report_owner_integrity_ROLLBACK.sql
BEGIN;
DO $pre$
BEGIN
 IF to_regclass('public.forum_reports') IS NULL
  OR NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='forum_reports' AND column_name='reporter_id')
  OR NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='forum_reports' AND column_name='reporter_user_id')
 THEN RAISE EXCEPTION 'V014282_REQUIRED_SCHEMA_NOT_FOUND'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.forum_reports
    WHERE reporter_id IS NOT NULL AND reporter_user_id IS NOT NULL AND reporter_id<>reporter_user_id
 ) THEN RAISE EXCEPTION 'V014282_CONFLICTING_REPORT_OWNER_DATA'; END IF;
 IF (SELECT count(*) FROM pg_policies
       WHERE schemaname='public' AND tablename='forum_reports'
         AND policyname IN ('read own forum reports','users read own reports')
         AND cmd='SELECT' AND permissive='PERMISSIVE'
         AND roles=ARRAY['authenticated']::name[])<>2
 THEN RAISE EXCEPTION 'V014282_LEGACY_READ_POLICIES_CHANGED'; END IF;
 IF EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.forum_reports'::regclass
      AND conname='forum_reports_reporter_identity_consistency_v014282')
 THEN RAISE EXCEPTION 'V014282_PREVIOUS_SCHEMA_PATCH_FOUND'; END IF;
END $pre$;
-- Both fields are nullable because legacy and modern services populate different fields.
-- If both exist in a row, they must refer to the identical reporter.
ALTER TABLE public.forum_reports
 ADD CONSTRAINT forum_reports_reporter_identity_consistency_v014282
 CHECK (reporter_id IS NULL OR reporter_user_id IS NULL OR reporter_id=reporter_user_id);
-- Preserve combined read semantics; retain independently RESTRICTIVE policies.
DROP POLICY "read own forum reports" ON public.forum_reports;
DROP POLICY "users read own reports" ON public.forum_reports;
CREATE POLICY "forum_reports_own_identity_v014282"
 ON public.forum_reports AS PERMISSIVE FOR SELECT TO authenticated
 USING (((SELECT auth.uid())=reporter_id) OR ((SELECT auth.uid())=reporter_user_id));
COMMIT;
