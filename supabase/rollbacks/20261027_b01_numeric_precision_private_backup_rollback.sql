-- Emergency rollback of B01 F2-C03-L01 numeric precision change ONLY.
-- Requires separate Owner authorization, draft status, zero attempts, same checksum.
DO $revert$
DECLARE
  b record;
  changed integer;
BEGIN
  SELECT * INTO b FROM private.b01_numeric_precision_backup_20261027
  WHERE lab_id='F2-C03-L01' AND version=97 FOR UPDATE;
  IF b.lab_id IS NULL OR b.revised_md5 IS NULL
  THEN RAISE EXCEPTION 'No verified B01 precision backup'; END IF;
  IF EXISTS (SELECT 1 FROM public.lab_training_attempts_v014
             WHERE lab_id='F2-C03-L01' AND set_version=97)
  THEN RAISE EXCEPTION 'Member attempts exist: rollback forbidden'; END IF;
  UPDATE public.lab_training_sets_v014 s
  SET questions=b.prior_questions,updated_at=clock_timestamp()
  WHERE s.lab_id=b.lab_id AND s.version=b.version
    AND s.review_state='draft' AND s.reviewed_by IS NULL
    AND md5(s.questions::text)=b.revised_md5;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Review state changed, refuse rollback'; END IF;
  UPDATE private.b01_question_backups_20261027
  SET applied_md5=b.prior_applied_md5
  WHERE lab_id=b.lab_id AND version=b.version AND applied_md5=b.revised_md5;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Audit checkpoint mismatch'; END IF;
END $revert$;
