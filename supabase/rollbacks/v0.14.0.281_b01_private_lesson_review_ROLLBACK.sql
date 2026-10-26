-- Non-destructive reversal of v0.14.0.281's new enforcement trigger.
-- Preserve review attribution columns and all audit history; never erase member data.
BEGIN;
DROP TRIGGER IF EXISTS gu_v014281_lesson_review_audit ON public.lab_instruction_v014;
DROP FUNCTION IF EXISTS public.gu_v014281_audit_lab_instruction_review();
COMMIT;
