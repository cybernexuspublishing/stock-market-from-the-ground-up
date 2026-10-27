-- MANUAL OPERATOR ROLLBACK ONLY; stop new v3.3 checkpoint writes.
-- Non-destructive to member data: preserve site_lab_progress.responses.
-- Run ONLY if release has a demonstrated defect, with a source backup/review.
REVOKE ALL ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb,bigint)
 FROM PUBLIC,anon,authenticated;
DROP FUNCTION IF EXISTS public.gu_v33_save_lab_journey(text,jsonb,bigint);
-- Do NOT delete 'learning_journey_v33' from site_lab_progress.responses:
-- retention and original user-owned learning notes must remain intact.
