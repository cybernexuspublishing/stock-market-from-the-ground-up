-- B01 Phase A: correct a fictional 2-decimal percentage grading precision.
-- Back up complete private draft before a compare-and-swap update. No keys are
-- included in this public migration; no review/grading/member state is promoted.
-- Apply to production stock-market Supabase ONLY, transactionally.
CREATE TABLE IF NOT EXISTS private.b01_numeric_precision_backup_20261027 (
  lab_id text NOT NULL,
  version integer NOT NULL,
  prior_questions jsonb NOT NULL,
  prior_updated_at timestamptz NOT NULL,
  prior_applied_md5 text NOT NULL,
  revised_md5 text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lab_id,version)
);
ALTER TABLE private.b01_numeric_precision_backup_20261027 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.b01_numeric_precision_backup_20261027 FROM PUBLIC, anon, authenticated;

DO $fix$
DECLARE
  old_questions jsonb;
  old_updated timestamptz;
  old_hash text;
  new_hash text;
  changed integer;
BEGIN
  SELECT s.questions,s.updated_at,md5(s.questions::text)
    INTO old_questions,old_updated,old_hash
  FROM public.lab_training_sets_v014 s
  JOIN private.b01_question_backups_20261027 b USING(lab_id,version)
  WHERE s.lab_id='F2-C03-L01' AND s.version=97
    AND s.review_state='draft' AND s.reviewed_by IS NULL
    AND jsonb_array_length(s.questions)=6
    AND s.questions->2->>'id'='ORIGINAL_MATH'
    AND s.questions->2->>'kind'='number'
    AND (s.questions->2->>'tolerance')::numeric=0.02
    AND s.questions->2->>'prompt' LIKE 'FICTIONAL:%'
    AND s.questions->2->>'prompt' ILIKE '%two decimals%'
    AND b.applied_md5=md5(s.questions::text)
    AND md5(s.questions::text)='770cafb2d6d4b73a30ac461919fdd869'
  FOR UPDATE OF s,b;
  IF old_questions IS NULL THEN
    RAISE EXCEPTION 'B01 numeric preflight changed; no migration performed';
  END IF;
  IF EXISTS(SELECT 1 FROM public.lab_training_attempts_v014
            WHERE lab_id='F2-C03-L01' AND set_version=97) THEN
    RAISE EXCEPTION 'Cannot alter a rubric already used by a member';
  END IF;

  INSERT INTO private.b01_numeric_precision_backup_20261027
    (lab_id,version,prior_questions,prior_updated_at,prior_applied_md5)
  VALUES ('F2-C03-L01',97,old_questions,old_updated,old_hash);

  UPDATE public.lab_training_sets_v014 s
  SET questions=jsonb_set(s.questions,'{2,tolerance}',to_jsonb(0::numeric),false),
      updated_at=clock_timestamp()
  WHERE s.lab_id='F2-C03-L01' AND s.version=97
    AND s.review_state='draft' AND s.reviewed_by IS NULL
    AND s.updated_at=old_updated AND md5(s.questions::text)=old_hash;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'B01 numeric compare-and-swap failed'; END IF;

  SELECT md5(questions::text) INTO new_hash
  FROM public.lab_training_sets_v014
  WHERE lab_id='F2-C03-L01' AND version=97;
  UPDATE private.b01_question_backups_20261027
  SET applied_md5=new_hash
  WHERE lab_id='F2-C03-L01' AND version=97 AND applied_md5=old_hash;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'B01 integrity checkpoint update failed'; END IF;
  UPDATE private.b01_numeric_precision_backup_20261027
  SET revised_md5=new_hash
  WHERE lab_id='F2-C03-L01' AND version=97 AND revised_md5 IS NULL;
END $fix$;
