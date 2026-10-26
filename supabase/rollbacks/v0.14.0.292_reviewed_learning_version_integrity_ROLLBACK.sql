-- v0.14.0.292_reviewed_learning_version_integrity rollback.
-- Revert enforcement while retaining the additive review_frozen_at column:
-- dropping recorded review provenance would be destructive after future approvals.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP TRIGGER IF EXISTS gu_v014292_graded_revision_guard ON public.lab_training_sets_v014;
DROP FUNCTION IF EXISTS public.gu_v014292_guard_graded_revision();
ALTER TABLE public.lab_training_sets_v014
 DROP CONSTRAINT IF EXISTS gu_v014292_graded_review_attribution;
ALTER TABLE public.lab_instruction_v014
 DROP CONSTRAINT IF EXISTS gu_v014292_lesson_review_attribution;
COMMIT;
