-- Gate 1 rubric approval audit. Existing data unchanged; no member attempts touched.
-- Preflight: public lab_training_sets_v014 and admin_audit_log must exist.
-- Rollback: supabase/rollbacks/v0.14.0.280_b01_rubric_review_audit_ROLLBACK.sql
BEGIN;
DO $pre$
BEGIN
 IF to_regclass('public.lab_training_sets_v014') IS NULL OR
    to_regclass('public.admin_audit_log') IS NULL
 THEN RAISE EXCEPTION 'Required private assessment/admin audit tables are absent';END IF;
 IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='lab_training_sets_v014'
   AND column_name='reviewed_by')
 THEN RAISE EXCEPTION 'Expected reviewed_by provenance column missing';END IF;
 IF has_table_privilege('anon','public.admin_audit_log','INSERT') OR
    has_table_privilege('authenticated','public.admin_audit_log','INSERT')
 THEN RAISE EXCEPTION 'Admin audit ledger is writable by untrusted roles; refuse trigger deployment';END IF;
END $pre$;
CREATE OR REPLACE FUNCTION public.gu_v014280_audit_lab_rubric_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog
AS $audit$
BEGIN
 IF TG_OP <> 'UPDATE' OR OLD.review_state IS NOT DISTINCT FROM NEW.review_state
 THEN RETURN NEW;END IF;
 IF NEW.review_state='reviewed' AND (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL)
 THEN RAISE EXCEPTION 'Rubric approval must have an attributable reviewer and timestamp';END IF;
 INSERT INTO public.admin_audit_log
  (actor_user_id,action,target_type,target_id,details)
 VALUES
  (COALESCE(NEW.reviewed_by,OLD.reviewed_by),
   CASE WHEN NEW.review_state='reviewed' THEN 'LAB_RUBRIC_REVIEW_APPROVED'
        WHEN OLD.review_state='reviewed' THEN 'LAB_RUBRIC_REVIEW_WITHDRAWN'
        ELSE 'LAB_RUBRIC_REVIEW_STATE_CHANGED' END,
   'lab_training_sets_v014',NEW.lab_id||':v'||NEW.version,
   jsonb_build_object('lab_id',NEW.lab_id,'rubric_version',NEW.version,
    'from',OLD.review_state,'to',NEW.review_state,'source_status',NEW.source_status,
    'reviewed_at',NEW.reviewed_at,'revision_updated_at',NEW.updated_at));
 RETURN NEW;
END $audit$;
REVOKE ALL ON FUNCTION public.gu_v014280_audit_lab_rubric_review()
 FROM PUBLIC,anon,authenticated;
DO $install$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.lab_training_sets_v014'::regclass
     AND tgname='gu_v014280_rubric_review_audit')
 THEN
   CREATE TRIGGER gu_v014280_rubric_review_audit
   AFTER UPDATE OF review_state ON public.lab_training_sets_v014
   FOR EACH ROW EXECUTE FUNCTION public.gu_v014280_audit_lab_rubric_review();
 END IF;
END $install$;
COMMIT;
