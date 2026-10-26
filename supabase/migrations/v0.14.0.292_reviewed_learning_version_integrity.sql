-- v0.14.0.292_reviewed_learning_version_integrity
-- Enforce individual reviewer attribution and immutable graded evidence after the first approval.
-- Versions already reviewed must be superseded with new version numbers; never overwrite pinned grading history.
-- Non-destructive migration; existing 439 draft sets and 94 private instructional records are retained.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $pre$ BEGIN
 IF to_regclass('public.lab_training_sets_v014') IS NULL
 OR to_regclass('public.lab_instruction_v014') IS NULL
 OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
     AND table_name='lab_training_sets_v014' AND column_name='review_frozen_at')
 THEN RAISE EXCEPTION 'V014292_EXPECTED_REVIEW_SCHEMA_CHANGED'; END IF;
 IF EXISTS (SELECT 1 FROM public.lab_training_sets_v014
   WHERE review_state='reviewed' AND (reviewed_by IS NULL OR reviewed_at IS NULL))
 OR EXISTS (SELECT 1 FROM public.lab_instruction_v014
   WHERE source_status ~ '^(editorially_reviewed|owner_reviewed)(_|$)'
     AND (reviewed_by IS NULL OR reviewed_at IS NULL))
 THEN RAISE EXCEPTION 'V014292_PREEXISTING_APPROVAL_MISSING_ATTRIBUTION'; END IF;
END $pre$;
ALTER TABLE public.lab_training_sets_v014
 ADD COLUMN review_frozen_at timestamptz;
ALTER TABLE public.lab_training_sets_v014
 ADD CONSTRAINT gu_v014292_graded_review_attribution
 CHECK (review_state <> 'reviewed' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL));
ALTER TABLE public.lab_instruction_v014
 ADD CONSTRAINT gu_v014292_lesson_review_attribution
 CHECK (source_status !~ '^(editorially_reviewed|owner_reviewed)(_|$)'
        OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL));
CREATE FUNCTION public.gu_v014292_guard_graded_revision()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path='pg_catalog','pg_temp'
AS $body$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.review_state='reviewed' THEN
     RAISE EXCEPTION 'V014292_REVIEW_REQUIRES_DRAFT_TO_REVIEWED_TRANSITION';
   END IF;
   NEW.review_frozen_at:=NULL;
   RETURN NEW;
 END IF;
 IF OLD.review_frozen_at IS NOT NULL THEN
  IF NEW.review_frozen_at IS DISTINCT FROM OLD.review_frozen_at THEN
    RAISE EXCEPTION 'V014292_FIRST_APPROVAL_TIMESTAMP_IMMUTABLE';
  END IF;
  IF NEW.questions IS DISTINCT FROM OLD.questions
   OR NEW.answer_key IS DISTINCT FROM OLD.answer_key
   OR NEW.title IS DISTINCT FROM OLD.title
   OR NEW.source_status IS DISTINCT FROM OLD.source_status
   OR NEW.lab_id IS DISTINCT FROM OLD.lab_id
   OR NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'V014292_GRADED_CONTENT_IMMUTABLE_CREATE_NEW_VERSION';
  END IF;
  IF OLD.review_state='reviewed' AND NEW.review_state='reviewed'
    AND (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
    RAISE EXCEPTION 'V014292_REVIEW_ATTRIBUTION_IMMUTABLE_WHILE_APPROVED';
  END IF;
 END IF;
 IF NEW.review_state='reviewed' AND OLD.review_state IS DISTINCT FROM NEW.review_state THEN
  IF NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.admin_user_roles r
      JOIN public.profiles p ON p.id=r.user_id
      WHERE r.user_id=NEW.reviewed_by AND r.role_code='OWNER'
        AND (r.expires_at IS NULL OR r.expires_at>now())
        AND p.account_kind='member' AND p.deleted_at IS NULL
    ) THEN
    RAISE EXCEPTION 'V014292_REVIEW_REQUIRES_ATTRIBUTABLE_ACTIVE_OWNER';
  END IF;
  NEW.review_frozen_at:=coalesce(OLD.review_frozen_at,NEW.reviewed_at);
 END IF;
 RETURN NEW;
END
$body$;
REVOKE ALL ON FUNCTION public.gu_v014292_guard_graded_revision()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014292_guard_graded_revision()
 TO service_role;
CREATE TRIGGER gu_v014292_graded_revision_guard
 BEFORE INSERT OR UPDATE ON public.lab_training_sets_v014
 FOR EACH ROW EXECUTE FUNCTION public.gu_v014292_guard_graded_revision();
COMMIT;
