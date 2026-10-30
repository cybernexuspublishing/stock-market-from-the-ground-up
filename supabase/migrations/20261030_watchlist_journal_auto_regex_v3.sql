-- Normalize Postgres regex guards in the V3 Journal RPC.
-- Use explicit digit ranges and literal-dot character classes; never
-- depend on SQL escaping mode for regular-expression backslashes.
BEGIN;
DO $repair$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition
 FROM pg_proc WHERE pronamespace='public'::regnamespace
  AND proname='gu_watchlist_to_journal_v3'
  AND pg_get_function_identity_arguments(oid)='p_user uuid, p_plan bigint';
 IF definition IS NULL THEN RAISE EXCEPTION 'V3 transfer unavailable';END IF;
 definition:=regexp_replace(definition,
  'source_time !~ ''[^'']+''',
  'source_time !~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}T''');
 definition:=regexp_replace(definition,
  'IF field_value ~ ''[^'']+''',
  'IF field_value ~ ''^[0-9]{1,7}([.][0-9]{1,6})?$''','g');
 definition:=replace(definition,
  'IF field_value ~ ''^[0-9]{1,7}([.][0-9]{1,6})?$'' THEN shares',
  'IF field_value ~ ''^[0-9]{1,7}$'' THEN shares');
 IF strpos(definition,'source_time !~ ''^[0-9]{4}')=0
 OR strpos(definition,'field_value ~ ''^[0-9]{1,7}([.][0-9]{1,6})?$''')=0
 THEN RAISE EXCEPTION 'Failed to normalize V3 validators';END IF;
 EXECUTE definition;
END $repair$;
COMMIT;