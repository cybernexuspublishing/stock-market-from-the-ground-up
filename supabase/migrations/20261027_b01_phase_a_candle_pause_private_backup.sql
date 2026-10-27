-- Phase A reversible private backup for a single B01 Draft candle-finality clarification.
-- Contains NO assessment text or answer keys. Private data remain in production DB.
CREATE TABLE IF NOT EXISTS private.b01_candle_pause_backup_20261027(
 lab_id text NOT NULL,
 version integer NOT NULL,
 prior_questions jsonb NOT NULL,
 prior_updated_at timestamptz NOT NULL,
 prior_source_status text NOT NULL,
 prior_applied_md5 text NOT NULL,
 revised_md5 text,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(lab_id,version)
);
ALTER TABLE private.b01_candle_pause_backup_20261027 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.b01_candle_pause_backup_20261027 FROM PUBLIC,anon,authenticated,service_role;
DO $guard$
BEGIN
 IF has_schema_privilege('anon','private','USAGE')
  OR has_schema_privilege('authenticated','private','USAGE')
  OR has_table_privilege('anon','private.b01_candle_pause_backup_20261027','SELECT')
  OR has_table_privilege('authenticated','private.b01_candle_pause_backup_20261027','SELECT')
 THEN RAISE EXCEPTION 'Private draft backup exposure would violate assessment secrecy';
 END IF;
END $guard$;
