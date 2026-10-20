-- Run ONLY in the disposable CI postgres service after installing actual v118 SQL.
\set ON_ERROR_STOP on
SET ROLE service_role;
DO $v118$
DECLARE
 actor uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 other uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 sid uuid:='11111111-1111-4111-8111-111111111111';
 other_sid uuid:='22222222-2222-4222-8222-222222222222';
 revoked uuid:='33333333-3333-4333-8333-333333333333';
 unlocked uuid:='44444444-4444-4444-8444-444444444444';
 result jsonb; jid bigint;rid bigint;before_text text;
BEGIN
 -- Apply the REAL v95 chronological advancement RPC, not a fake bar cursor.
 -- It must never reveal a bar after a stale index or without a locked decision.
 INSERT INTO public.gu_replay_sessions_v01492(
  id,user_id,dataset_code,decision_locked,decision,reasoning,locked_at,current_index
 ) VALUES('55555555-5555-4555-8555-555555555555',actor,'GUSIM_ACCEPTANCE',
  true,'WATCH','Observe only the first known candle before revealing subsequent data.',now(),0);
 IF public.v01492_replay_advance(unlocked,actor,0)<>-1 OR
    public.v01492_replay_advance(revoked,actor,0)<>-1 OR
    public.v01492_replay_advance('55555555-5555-4555-8555-555555555555',other,0)<>-1 THEN
   RAISE EXCEPTION 'No-lookahead authorization or unreviewed market rights were bypassed';
 END IF;
 IF public.v01492_replay_advance('55555555-5555-4555-8555-555555555555',actor,0)<>1 OR
    public.v01492_replay_advance('55555555-5555-4555-8555-555555555555',actor,0)<>-1 OR
    public.v01492_replay_advance('55555555-5555-4555-8555-555555555555',actor,1)<>2 OR
    public.v01492_replay_advance('55555555-5555-4555-8555-555555555555',actor,2)<>-1 THEN
  RAISE EXCEPTION 'Actual v95 server cursor allowed skipped or duplicate future candles';
 END IF;
 BEGIN
  UPDATE public.gu_replay_bars_v01492 SET close=999
   WHERE dataset_code='GUSIM_ACCEPTANCE' AND bar_index=2;
  RAISE EXCEPTION 'FAIL: published training observations were altered';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: published training observations were altered' THEN RAISE; END IF;
 END;
 -- Transaction cannot be used to impersonate another replay owner.
 BEGIN
  PERFORM public.v01494_replay_finish_to_journal(sid,other);
  RAISE EXCEPTION 'FAIL: cross-member finalization permitted';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: cross-member finalization permitted' THEN RAISE;END IF;
 END;
 BEGIN
  PERFORM public.v01494_replay_finish_to_journal(revoked,actor);
  RAISE EXCEPTION 'FAIL: revoked source was finalized';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: revoked source was finalized' THEN RAISE;END IF;
 END;
 BEGIN
  PERFORM public.v01494_replay_finish_to_journal(unlocked,actor);
  RAISE EXCEPTION 'FAIL: unlocked first decision was finalized';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: unlocked first decision was finalized' THEN RAISE;END IF;
 END;
 -- Actual service-role RPC, not a mock: single authoritative link and snapshot.
 result:=public.v01494_replay_finish_to_journal(sid,actor);
 jid:=(result->>'journalId')::bigint;
 IF jid IS NULL OR (result->>'barsSeen')::int<>2 OR
    (result->>'alreadyLinked')::boolean THEN
   RAISE EXCEPTION 'Finalization returned incorrect linked record';
 END IF;
 IF (SELECT COUNT(*) FROM public.trade_plan_snapshots
      WHERE journal_id=jid AND user_id=actor AND snapshot->>'originalSynthetic'='true'
       AND snapshot->>'outcomeVerified'='false' AND snapshot->>'graded'='false')<>1 THEN
   RAISE EXCEPTION 'Linked immutable source snapshot was not written';
 END IF;
 IF (SELECT COUNT(*) FROM public.journal_reviews WHERE journal_id=jid
       AND user_id=actor)<>3 THEN
   RAISE EXCEPTION 'First-decision replay did not schedule all three spaced reviews';
 END IF;
 IF (SELECT COUNT(*) FROM public.decision_journal
     WHERE id=jid AND status='planned' AND actual_entry IS NULL AND actual_exit IS NULL
     AND net_pnl IS NULL AND process_grade IS NULL)<>1 THEN
   RAISE EXCEPTION 'Unverified outcome was promoted to a real trade';
 END IF;
 result:=public.v01494_replay_finish_to_journal(sid,actor);
 IF (result->>'journalId')::bigint<>jid OR
   (result->>'alreadyLinked')::boolean IS DISTINCT FROM true OR
   (SELECT COUNT(*) FROM public.gu_replay_journal_links_v01494 WHERE session_id=sid)<>1 THEN
   RAISE EXCEPTION 'Idempotent retry produced duplicate or different Journal evidence';
 END IF;
 -- A NO_TRADE owner on the same dataset cannot be linked to another member.
 result:=public.v01494_replay_finish_to_journal(other_sid,other);
 IF (SELECT decision FROM public.decision_journal
       WHERE id=(result->>'journalId')::bigint)<>'NO TRADE' OR
   (SELECT status FROM public.decision_journal
       WHERE id=(result->>'journalId')::bigint)<>'no_trade' THEN
   RAISE EXCEPTION 'No-trade first-decision mapping changed';
 END IF;
 IF (SELECT count(*) FROM public.gu_replay_journal_links_v01494)<>2 OR
    (SELECT count(*) FROM public.competency_evidence)<>0 THEN
   RAISE EXCEPTION 'Replay contaminated distinct member records or graded competencies';
 END IF;
 -- Direct trusted database attempts to rewrite frozen decisions/results fail.
 BEGIN
  UPDATE public.gu_replay_sessions_v01492 SET reasoning='I knew the outcome'
   WHERE id=sid;
  RAISE EXCEPTION 'FAIL: locked replay decision was altered';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: locked replay decision was altered' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE public.gu_replay_sessions_v01492 SET current_index=2 WHERE id=unlocked;
  RAISE EXCEPTION 'FAIL: replay advanced without first decision';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: replay advanced without first decision' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE public.decision_journal SET net_pnl=99999,process_grade='GOOD'
   WHERE id=jid;
  RAISE EXCEPTION 'FAIL: fake replay profits were stored';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: fake replay profits were stored' THEN RAISE; END IF;
 END;
 BEGIN
  DELETE FROM public.decision_journal WHERE id=jid;
  RAISE EXCEPTION 'FAIL: linked journal evidence was deleted';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: linked journal evidence was deleted' THEN RAISE; END IF;
 END;
 UPDATE public.decision_journal SET lesson='This was educational observation, not execution.'
  WHERE id=jid;
 IF (SELECT lesson FROM public.decision_journal WHERE id=jid) NOT LIKE 'This was%' THEN
  RAISE EXCEPTION 'Legitimate private reflection failed';
 END IF;
 SELECT id INTO rid FROM public.journal_reviews WHERE journal_id=jid AND review_stage='1D';
 BEGIN
  PERFORM public.gu_v014118_review_transaction(actor,rid,'lock',
   'I will evaluate the first observation without looking at the outcome.');
  RAISE EXCEPTION 'FAIL: future review stage permitted';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: future review stage permitted' THEN RAISE;END IF;
 END;
 UPDATE public.journal_reviews SET due_at=now()-interval '1 hour' WHERE id=rid;
 BEGIN
  PERFORM public.gu_v014118_review_transaction(actor,rid,'reveal',NULL);
  RAISE EXCEPTION 'FAIL: outcome revealed before notes locked';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: outcome revealed before notes locked' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.gu_v014118_review_transaction(actor,rid,'complete',
   'Outcomes must not be used to rewrite the original decision.');
  RAISE EXCEPTION 'FAIL: review completed without locked notes';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: review completed without locked notes' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.gu_v014118_review_transaction(other,rid,'lock',
   'Trying to change evidence belonging to a different user.');
  RAISE EXCEPTION 'FAIL: foreign review accepted';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: foreign review accepted' THEN RAISE; END IF;
 END;
 result:=public.gu_v014118_review_transaction(actor,rid,'lock',
  'I will review the original candle and uncertainty before considering later bars.');
 IF result->>'alreadyLocked'<>'false' THEN RAISE EXCEPTION 'First review lock did not commit';END IF;
 SELECT pre_reveal_note INTO before_text
 FROM public.gu_replay_review_locks_v014118 WHERE review_id=rid;
 result:=public.gu_v014118_review_transaction(actor,rid,'lock',
  'Different draft text must never overwrite the original decision review note.');
 IF (result->>'alreadyLocked')::boolean IS DISTINCT FROM true OR
  (SELECT pre_reveal_note FROM public.gu_replay_review_locks_v014118
    WHERE review_id=rid) IS DISTINCT FROM before_text THEN
   RAISE EXCEPTION 'Idempotent review locking overwrote the first impression';
 END IF;
 BEGIN
  UPDATE public.gu_replay_review_locks_v014118
   SET pre_reveal_note='Retrospective fictional certainty' WHERE review_id=rid;
  RAISE EXCEPTION 'FAIL: pre-reveal notes could be edited after lock';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: pre-reveal notes could be edited after lock' THEN RAISE; END IF;
 END;
 result:=public.gu_v014118_review_transaction(actor,rid,'reveal',NULL);
 IF (result->>'revealed')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Review did not enter revealed state';
 END IF;
 result:=public.gu_v014118_review_transaction(actor,rid,'complete',
  'The later candle was hypothetical, and its path does not prove an order fill. The original decision should be judged on visible first-bar evidence.');
 IF (result->>'completed')::boolean IS DISTINCT FROM true OR
  (SELECT completed_at FROM public.journal_reviews WHERE id=rid) IS NULL THEN
  RAISE EXCEPTION 'Post-reveal comparison was not atomically completed';
 END IF;
 result:=public.gu_v014118_review_transaction(actor,rid,'complete',NULL);
 IF (result->>'alreadyComplete')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Review completion retry was not idempotent';
 END IF;
 IF (SELECT COUNT(*) FROM public.competency_evidence)<>0 THEN
  RAISE EXCEPTION 'Review improperly awarded competency grades';
 END IF;
 RAISE NOTICE 'PASS v118: real PostgreSQL cross-owner denial, revocation, first-decision immutability, no fabricated fills, atomic Journal+reviews, staged outcome-hidden notes and no competency auto-grade';
END $v118$;
RESET ROLE;

-- Explicit member-role bypass test: authenticated direct table update cannot
-- complete a replay review without the authorized server sequencing RPC.
SET ROLE authenticated;
DO $member_v118$
DECLARE rid bigint;
BEGIN
 -- Authenticated members must NOT gain SELECT over private replay links
 -- merely to run an authorized review; use the known existing stage instead.
 SELECT id INTO rid FROM public.journal_reviews
 WHERE review_stage='7D' ORDER BY id LIMIT 1;
 BEGIN
  UPDATE public.journal_reviews
   SET review_notes='Unaudited backfilled answer',completed_at=now() WHERE id=rid;
  RAISE EXCEPTION 'FAIL: direct authenticated review edit bypassed server lock';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: direct authenticated review edit bypassed server lock' THEN RAISE;END IF;
 END;
END $member_v118$;
RESET ROLE;
