-- v120 integration: actual v118 + v95 + v120 installed in disposable PG16.
-- NEVER run this fixture against a live Supabase database.
\set ON_ERROR_STOP on
DO $contract$
BEGIN
 IF has_function_privilege('anon','public.gu_v014120_replay_review_evidence(uuid,bigint)','EXECUTE') OR
    has_function_privilege('authenticated','public.gu_v014120_replay_review_evidence(uuid,bigint)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.gu_v014120_replay_review_evidence(uuid,bigint)','EXECUTE') THEN
  RAISE EXCEPTION 'Atomic market review evidence RPC is callable by public/member role';
 END IF;
END $contract$;
SET ROLE service_role;
DO $accept$
DECLARE
 member uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 foreign_member uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 sid uuid:='11111111-1111-4111-8111-111111111111';
 linked bigint;
 review bigint;
 v jsonb;
BEGIN
 -- Exactly one atomic first-decision Journal record (no invented grade).
 linked:=(public.v01494_replay_finish_to_journal(sid,member)->>'journalId')::bigint;
 IF linked IS NULL THEN RAISE EXCEPTION 'Journal not durably linked'; END IF;
 SELECT id INTO review FROM public.journal_reviews
 WHERE journal_id=linked AND user_id=member AND review_stage='1D';
 BEGIN
  PERFORM public.gu_v014120_replay_review_evidence(member,review);
  RAISE EXCEPTION 'FAIL: future bars disclosed before the review note';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: future bars disclosed before the review note' THEN RAISE; END IF;
 END;
 UPDATE public.journal_reviews SET due_at=now()-interval '1 minute' WHERE id=review;
 v:=public.gu_v014118_review_transaction(member,review,'lock',
  'The initial observation alone does not establish an executed trade.');
 BEGIN
  PERFORM public.gu_v014120_replay_review_evidence(member,review);
  RAISE EXCEPTION 'FAIL: future bars disclosed before explicit reveal';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: future bars disclosed before explicit reveal' THEN RAISE; END IF;
 END;
 PERFORM public.gu_v014118_review_transaction(member,review,'reveal',NULL);
 v:=public.gu_v014120_replay_review_evidence(member,review);
 IF (v->>'ok')::boolean IS DISTINCT FROM true OR
   (v->>'observedThroughIndex')::int<>1 OR
   jsonb_array_length(v->'observations')<>2 OR
   (v->'observations'->1->>'index')::int<>1 OR
   (v->>'originalSynthetic')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Evidence was not clipped exactly to the server cursor';
 END IF;
 IF (v->'observations') @> '[{"index":2}]'::jsonb OR
    v ? 'netPnl' OR v ? 'competencyGrade' OR
    (SELECT COUNT(*) FROM public.competency_evidence)>0 THEN
  RAISE EXCEPTION 'Future price, fabricated outcome or competency grade escaped';
 END IF;
 BEGIN
  PERFORM public.gu_v014120_replay_review_evidence(foreign_member,review);
  RAISE EXCEPTION 'FAIL: foreign owner read replay review';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: foreign owner read replay review' THEN RAISE; END IF;
 END;
 -- Revocation, exercised inside disposable environment only, fails closed.
 UPDATE public.market_datasets SET status='unpublished' WHERE dataset_code='GUSIM_ACCEPTANCE';
 BEGIN
  PERFORM public.gu_v014120_replay_review_evidence(member,review);
  RAISE EXCEPTION 'FAIL: revoked source observations were disclosed';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: revoked source observations were disclosed' THEN RAISE; END IF;
 END;
 RAISE NOTICE 'PASS v120: actual PostgreSQL atomic no-lookahead, cross-member, pre-reveal, source revocation and no fabricated grades';
END $accept$;
RESET ROLE;
