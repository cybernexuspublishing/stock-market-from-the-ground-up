-- Safe rollback: remove the added trigger and its function only.
-- Does not delete audit records, approved rubrics or member attempts.
BEGIN;
DROP TRIGGER IF EXISTS gu_v014280_rubric_review_audit ON public.lab_training_sets_v014;
DROP FUNCTION IF EXISTS public.gu_v014280_audit_lab_rubric_review();
COMMIT;
