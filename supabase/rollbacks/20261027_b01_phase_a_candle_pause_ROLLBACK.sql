-- Safe Phase A candle-draft correction rollback.
-- Requires unchanged protected prompt digest, no reviewed rubric and no attempts.
-- Does NOT undo the earlier 100-choice editorial corrections.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $rollback$
DECLARE snapshot record;current_record record;affected integer;
BEGIN
 SELECT * INTO snapshot FROM private.b01_candle_pause_backup_20261027
  WHERE lab_id='F1-C02-L01' AND version=97 FOR UPDATE;
 IF NOT FOUND OR snapshot.revised_md5 IS NULL
 THEN RAISE EXCEPTION 'Phase A private candle backup missing'; END IF;
 SELECT * INTO current_record FROM public.lab_training_sets_v014
  WHERE lab_id=snapshot.lab_id AND version=snapshot.version FOR UPDATE;
 IF NOT FOUND OR current_record.review_state<>'draft'
  OR current_record.reviewed_at IS NOT NULL
  OR md5(current_record.questions::text)<>snapshot.revised_md5
  OR EXISTS(SELECT 1 FROM public.lab_training_attempts_v014 a
    WHERE a.lab_id=snapshot.lab_id AND a.set_version=snapshot.version)
 THEN RAISE EXCEPTION 'B01 candle rollback refused; reconcile publication, attempts or changed draft'; END IF;
 IF NOT EXISTS (SELECT 1 FROM private.b01_question_backups_20261027 b
  WHERE b.lab_id=snapshot.lab_id AND b.version=snapshot.version
   AND b.applied_md5=snapshot.revised_md5)
 THEN RAISE EXCEPTION 'Original editorial rollback checkpoint mismatch'; END IF;
 UPDATE public.lab_training_sets_v014
 SET questions=snapshot.prior_questions,updated_at=now(),
  source_status=snapshot.prior_source_status
 WHERE lab_id=snapshot.lab_id AND version=snapshot.version
  AND review_state='draft' AND md5(questions::text)=snapshot.revised_md5;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'Protected draft CAS mismatch'; END IF;
 UPDATE private.b01_question_backups_20261027 b
 SET applied_md5=snapshot.prior_applied_md5
 WHERE b.lab_id=snapshot.lab_id AND b.version=snapshot.version
  AND applied_md5=snapshot.revised_md5;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'Original checkpoint CAS mismatch'; END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(NULL,'B01_CANDLE_PAUSE_DRAFT_CORRECTION_ROLLBACK',
  'lab_training_sets_v014',snapshot.lab_id||':v'||snapshot.version,
  jsonb_build_object('only_draft_candle_clarification_reverted',true,
  'formal_review','unchanged','answer_keys','unchanged'));
END $rollback$;
COMMIT;
