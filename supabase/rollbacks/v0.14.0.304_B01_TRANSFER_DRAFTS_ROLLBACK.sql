-- v0.14.0.304 rollback: only remove untouched unreviewed transfer drafts.
-- The rollback REFUSES deletion after content edits or individual approval.
BEGIN;
DO $guard$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.lab_instruction_v014
 WHERE content->>'transferDraftBatch'='B01_20261026_v304';
 IF n<>20 THEN RAISE EXCEPTION 'Expected 20 original transfer drafts, found %',n;END IF;
 IF EXISTS(
  SELECT 1 FROM public.lab_instruction_v014 WHERE content->>'transferDraftBatch'='B01_20261026_v304'
   AND (reviewed_at IS NOT NULL OR reviewed_by IS NOT NULL
    OR source_status<>'original_hypothetical_unreviewed_v01496'
    OR md5(content->>'transfer')<>content->>'transferFingerprint')
 ) THEN RAISE EXCEPTION 'Lesson was approved or edited; preserve content and refuse rollback';END IF;
END $guard$;
UPDATE public.lab_instruction_v014 SET
 content=content-'transfer'-'transferDraftBatch'-'transferFingerprint'
WHERE content->>'transferDraftBatch'='B01_20261026_v304'
 AND reviewed_by IS NULL AND reviewed_at IS NULL
 AND md5(content->>'transfer')=content->>'transferFingerprint';
COMMIT;
