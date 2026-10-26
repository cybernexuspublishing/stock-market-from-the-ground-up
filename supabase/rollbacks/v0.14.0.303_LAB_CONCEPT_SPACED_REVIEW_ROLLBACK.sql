-- Rollback the new, isolated Lab recall feature only.
-- Deliberately refuses to discard ANY member's saved review records.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.lab_concept_reviews_v014') IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.lab_concept_reviews_v014)
 THEN RAISE EXCEPTION 'Lab recall records exist. Back up and explicitly migrate them before removing this feature.'; END IF;
END $guard$;
DROP FUNCTION IF EXISTS public.gu_lab_concept_review_complete_v014(text,text,text);
DROP FUNCTION IF EXISTS public.gu_lab_concept_review_schedule_v014(text);
DROP TABLE IF EXISTS public.lab_concept_reviews_v014;
COMMIT;
