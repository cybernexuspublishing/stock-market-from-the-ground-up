-- Operator-only rollback of v3.3 legacy merge protection.
-- Removing this guard may reintroduce stale Site Lab checkpoint overwrites.
-- No member progress or official grades are deleted.
DROP TRIGGER IF EXISTS gu_v33_preserve_checkpoint_legacy
 ON public.site_lab_progress;
DROP FUNCTION IF EXISTS public.gu_v33_preserve_checkpoint_on_legacy_update();
