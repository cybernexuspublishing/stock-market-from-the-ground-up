-- Real PostgreSQL RPC integration regression for the existing server-owned fictional replay.
-- NO staged authentication bypass. This is a DATABASE transaction test, not a
-- genuine member login, client test, or proof of GoTrue/Turnstile acceptance.
-- ALL inserted/updated records roll back. Existing account rows are not updated.
-- Uses two pre-existing Auth user UUIDs as foreign keys, NEVER displays them.
BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '2s';
DO $qa$
DECLARE
  qa_owner uuid; qa_other uuid; qa_session uuid;
  first_at timestamptz; second_at timestamptz;
  advance_ok integer; stale integer; other_user integer;
  cursor integer; session_state text; barred boolean:=false;
BEGIN
  SELECT id INTO qa_owner FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO qa_other FROM auth.users
    WHERE id IS DISTINCT FROM qa_owner ORDER BY created_at ASC LIMIT 1;
  IF qa_owner IS NULL OR qa_other IS NULL THEN
    RAISE EXCEPTION 'QA_REQUIRES_TWO_EXISTING_USERS_NO_ACCOUNTS_CREATED';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.market_datasets d WHERE
      d.dataset_code='GUSIM_DT_C01_L01' AND d.dataset_type='ohlcv'
      AND d.status='published'
      AND d.metadata->>'original_synthetic'='true'
      AND d.metadata->>'real_market_security'='false'
      AND d.metadata->>'historical_evidence_verified'='false'
      AND d.metadata->>'evidence_verified'='true'
      AND d.metadata->>'educational_only'='true'
      AND d.metadata->>'licensed_for_member_display'='true'
      AND d.metadata->>'invented_timestamp_year'='2040'
  ) THEN RAISE EXCEPTION 'FICTIONAL_SOURCE_METADATA_DRIFT'; END IF;
  SELECT bar_at INTO first_at FROM public.gu_replay_bars_v01492
    WHERE dataset_code='GUSIM_DT_C01_L01' AND bar_index=0;
  SELECT bar_at INTO second_at FROM public.gu_replay_bars_v01492
    WHERE dataset_code='GUSIM_DT_C01_L01' AND bar_index=1;
  IF first_at IS NULL OR second_at IS NULL OR second_at<=first_at THEN
    RAISE EXCEPTION 'FICTIONAL_FIRST_TWO_BARS_INVALID';
  END IF;
  IF has_function_privilege('anon','public.v01492_replay_advance(uuid,uuid,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.v01492_replay_advance(uuid,uuid,integer)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.v01492_replay_advance(uuid,uuid,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'REPLAY_RPC_PRIVILEGE_BOUNDARY_DRIFT'; END IF;
  INSERT INTO public.gu_replay_sessions_v01492(user_id,dataset_code)
    VALUES(qa_owner,'GUSIM_DT_C01_L01') RETURNING id INTO qa_session;
  SELECT public.v01492_replay_advance(qa_session,qa_owner,0) INTO advance_ok;
  IF advance_ok<>-1 THEN RAISE EXCEPTION 'UNLOCKED_REPLAY_ADVANCED'; END IF;
  UPDATE public.gu_replay_sessions_v01492 SET
    decision='NO_TRADE',reasoning='This fictional example is not evidence of a market trade; observe, verify sources, and avoid trading.',
    decision_locked=true,locked_at=now()
    WHERE id=qa_session AND user_id=qa_owner AND current_index=0;
  SELECT public.v01492_replay_advance(qa_session,qa_owner,0) INTO advance_ok;
  IF advance_ok<>1 THEN RAISE EXCEPTION 'FICTIONAL_CURSOR_NOT_ADVANCED_TO_ONE: %',advance_ok; END IF;
  SELECT current_index,status INTO cursor,session_state FROM public.gu_replay_sessions_v01492 WHERE id=qa_session;
  IF cursor<>1 OR session_state<>'active' THEN RAISE EXCEPTION 'SAVED_CURSOR_INCONSISTENT'; END IF;
  SELECT public.v01492_replay_advance(qa_session,qa_owner,0) INTO stale;
  SELECT public.v01492_replay_advance(qa_session,qa_other,1) INTO other_user;
  IF stale<>-1 OR other_user<>-1 THEN RAISE EXCEPTION 'REPLAY_STALE_OR_FOREIGN_USER_ADVANCED'; END IF;
  UPDATE public.gu_replay_sessions_v01492
    SET status='finished',finished_at=now() WHERE id=qa_session AND user_id=qa_owner;
  SELECT public.v01492_replay_advance(qa_session,qa_owner,1) INTO stale;
  IF stale<>-1 THEN RAISE EXCEPTION 'FINISHED_REPLAY_STILL_ADVANCES'; END IF;
  BEGIN
    UPDATE public.gu_replay_sessions_v01492 SET current_index=2 WHERE id=qa_session;
  EXCEPTION WHEN OTHERS THEN
    barred:=position('immutable' in lower(SQLERRM))>0;
  END;
  IF NOT barred THEN RAISE EXCEPTION 'COMPLETED_REPLAY_MUTABLE'; END IF;
  RAISE NOTICE 'PASS RPC: unlocked denied; lock -> next candle; stale and other member denied; completed cannot resume; all fixture writes rolled back.';

END $qa$;
ROLLBACK;
