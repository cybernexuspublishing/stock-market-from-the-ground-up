-- v0.14.0.281: Owner lesson editorial approval (B01), additive and reversible.
-- No grading key, member record, existing lesson text or attempt is changed.
BEGIN;
DO $pre$
BEGIN
 IF to_regclass('public.lab_instruction_v014') IS NULL OR
    to_regclass('public.admin_audit_log') IS NULL THEN
  RAISE EXCEPTION 'Lab teaching and audit tables must exist'; END IF;
 IF has_table_privilege('anon','public.lab_instruction_v014','UPDATE') OR
    has_table_privilege('authenticated','public.lab_instruction_v014','UPDATE') THEN
  RAISE EXCEPTION 'Private instructional content unexpectedly editable by ordinary members';END IF;
END $pre$;
ALTER TABLE public.lab_instruction_v014
 ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
 ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE OR REPLACE FUNCTION public.gu_v014281_audit_lab_instruction_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $body$
BEGIN
 IF OLD.source_status IS NOT DISTINCT FROM NEW.source_status THEN RETURN NEW;END IF;
 IF NEW.source_status LIKE 'editorially_reviewed_%' THEN
  IF NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL OR
    NOT EXISTS (
     SELECT 1 FROM public.admin_user_roles r
     JOIN public.profiles p ON p.id=r.user_id
     WHERE r.user_id=NEW.reviewed_by AND r.role_code='OWNER'
     AND (r.expires_at IS NULL OR r.expires_at>now())
     AND p.account_kind='member'
    ) THEN
   RAISE EXCEPTION 'Editorial release requires an active attributable Owner session';END IF;
 END IF;
 INSERT INTO public.admin_audit_log
   (actor_user_id,action,target_type,target_id,details)
 VALUES (COALESCE(NEW.reviewed_by,OLD.reviewed_by),
  CASE WHEN NEW.source_status LIKE 'editorially_reviewed_%'
   THEN 'LAB_PRIVATE_LESSON_REVIEW_APPROVED'
   ELSE 'LAB_PRIVATE_LESSON_REVIEW_CHANGED' END,
  'lab_instruction_v014',NEW.lab_id,
  jsonb_build_object('from',OLD.source_status,'to',NEW.source_status,
   'reviewed_at',NEW.reviewed_at,'revision_updated_at',NEW.updated_at));
 RETURN NEW;
END $body$;
REVOKE ALL ON FUNCTION public.gu_v014281_audit_lab_instruction_review()
 FROM PUBLIC,anon,authenticated;
DO $install$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE
    tgrelid='public.lab_instruction_v014'::regclass
    AND tgname='gu_v014281_lesson_review_audit') THEN
  CREATE TRIGGER gu_v014281_lesson_review_audit
   AFTER UPDATE OF source_status ON public.lab_instruction_v014
   FOR EACH ROW EXECUTE FUNCTION public.gu_v014281_audit_lab_instruction_review();
 END IF;
END $install$;
COMMIT;
