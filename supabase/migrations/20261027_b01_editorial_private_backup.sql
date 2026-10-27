-- B01 source-correction backup (source only; NO private prompts or keys).
-- Run once before correcting any of the eight draft v97 rubrics.
-- The actual private question JSON is stored ONLY inside the unexposed schema.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS private.b01_question_backups_20261027(
 lab_id text NOT NULL,
 version integer NOT NULL,
 prior_questions jsonb NOT NULL,
 prior_updated_at timestamptz NOT NULL,
 prior_source_status text NOT NULL,
 applied_md5 text,
 backup_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(lab_id,version)
);
ALTER TABLE private.b01_question_backups_20261027 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.b01_question_backups_20261027 FROM PUBLIC,anon,authenticated,service_role;
DO $preflight$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='private'
  AND has_schema_privilege('anon',oid,'USAGE'))
 THEN RAISE EXCEPTION 'Private backup schema accidentally public'; END IF;
END $preflight$;
COMMIT;
