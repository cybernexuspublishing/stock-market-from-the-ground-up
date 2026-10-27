-- B01 private draft editorial rollback. NEVER drop archived originals.
-- Run ONLY after independent preflight; restores exactly the eight archived
-- draft question bodies without touching answer keys or member attempts.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $rollback$
DECLARE item record; current_row record;
BEGIN
 IF to_regclass('private.b01_question_backups_20261027') IS NULL
 THEN RAISE EXCEPTION 'Original private question backup is missing'; END IF;
 FOR item IN SELECT * FROM private.b01_question_backups_20261027 LOOP
  SELECT s.* INTO current_row
  FROM public.lab_training_sets_v014 s
  WHERE s.lab_id=item.lab_id AND s.version=item.version FOR UPDATE;
  IF NOT FOUND OR current_row.review_state<>'draft'
   OR EXISTS(SELECT 1 FROM public.lab_training_attempts_v014 a
     WHERE a.lab_id=item.lab_id AND a.set_version=item.version)
   OR item.applied_md5 IS NULL
   OR md5(current_row.questions::text)<>item.applied_md5
  THEN RAISE EXCEPTION 'B01 protected source changed; reconcile before rollback: %',item.lab_id;
  END IF;
  UPDATE public.lab_training_sets_v014 SET
   questions=item.prior_questions,
   source_status=item.prior_source_status,
   updated_at=now()
   WHERE lab_id=item.lab_id AND version=item.version
     AND review_state='draft' AND md5(questions::text)=item.applied_md5;
  IF NOT FOUND THEN RAISE EXCEPTION 'B01 rollback CAS mismatch for %',item.lab_id; END IF;
  INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
  VALUES(NULL,'B01_EDITORIAL_SOURCE_ROLLBACK','lab_training_sets_v014',item.lab_id||':v'||item.version,
   jsonb_build_object('reason','reversible private draft feedback correction',
   'restore_from_private_backup',true,'review_state','draft'));
 END LOOP;
END $rollback$;
COMMIT;
