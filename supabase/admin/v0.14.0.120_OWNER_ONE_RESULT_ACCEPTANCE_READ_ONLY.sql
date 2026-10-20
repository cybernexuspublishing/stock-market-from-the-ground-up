-- v0.14.0.120 | OWNER-SAFE Supabase SQL Editor readiness check.
-- ONE SELECT / ONE RESULTS TABLE. All statements read only.
-- Do NOT use files from tests/fixtures/ in the live SQL Editor:
-- those are for disposable PostgreSQL, may SET ROLE and mutate test data,
-- and contain psql-only commands such as backslash-set.
-- Expected: all 15 rows PASS. This is NOT an end-to-end member test.
WITH evidence AS (
 SELECT to_regprocedure('public.gu_v014120_replay_review_evidence(uuid,bigint)') AS oid
), checks(check_name, pass) AS (
 VALUES
  ('01 replay sessions installed',to_regclass('public.gu_replay_sessions_v01492') IS NOT NULL),
  ('02 replay observations installed',to_regclass('public.gu_replay_bars_v01492') IS NOT NULL),
  ('03 replay Journal links installed',to_regclass('public.gu_replay_journal_links_v01494') IS NOT NULL),
  ('04 pre-reveal review locks installed',to_regclass('public.gu_replay_review_locks_v014118') IS NOT NULL),
  ('05 historical/fictional market dataset registry installed',to_regclass('public.market_datasets') IS NOT NULL),
  ('06 v95 chronological cursor installed',to_regprocedure('public.v01492_replay_advance(uuid,uuid,integer)') IS NOT NULL),
  ('07 v118 atomic Journal finish installed',to_regprocedure('public.v01494_replay_finish_to_journal(uuid,uuid)') IS NOT NULL),
  ('08 v118 review stages installed',to_regprocedure('public.gu_v014118_review_transaction(uuid,bigint,text,text)') IS NOT NULL),
  ('09 v120 atomic evidence installed',(SELECT oid IS NOT NULL FROM evidence)),
  ('10 v120 anonymous execute blocked',COALESCE(
   (SELECT NOT has_function_privilege('anon',oid,'EXECUTE') FROM evidence),false)),
  ('11 v120 authenticated direct execute blocked',COALESCE(
   (SELECT NOT has_function_privilege('authenticated',oid,'EXECUTE') FROM evidence),false)),
  ('12 v120 server execute permitted',COALESCE(
   (SELECT has_function_privilege('service_role',oid,'EXECUTE') FROM evidence),false)),
  ('13 v120 invoker function (not definer)',EXISTS(
   SELECT 1 FROM pg_proc p WHERE p.oid=(SELECT oid FROM evidence) AND NOT p.prosecdef)),
  ('14 v95 published-bar immutability enabled',EXISTS(
   SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.gu_replay_bars_v01492')
    AND t.tgname='gu_replay_published_immutability_v01495' AND t.tgenabled IN ('O','A'))),
  ('15 v118 immutable first decision enabled',EXISTS(
   SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.gu_replay_sessions_v01492')
    AND t.tgname='gu_replay_first_decision_integrity_v014118' AND t.tgenabled IN ('O','A'))),
  ('16 v118 linked Journal tamper guard enabled',EXISTS(
   SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.decision_journal')
    AND t.tgname='gu_replay_journal_immutable_v014118' AND t.tgenabled IN ('O','A'))),
  ('17 v118 pre-reveal note tamper guard enabled',EXISTS(
   SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.gu_replay_review_locks_v014118')
    AND t.tgname='gu_replay_review_immutable_v014118' AND t.tgenabled IN ('O','A'))),
  ('18 v118 direct review-write guard enabled',EXISTS(
   SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.journal_reviews')
    AND t.tgname='gu_replay_review_write_guard_v014118' AND t.tgenabled IN ('O','A')))
)
SELECT check_name,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END AS result
 FROM checks ORDER BY check_name;
-- No changes are made. 18 PASS rows establish OBJECT/ACL/TRIGGER
-- readiness only; owner-scoped live browser acceptance is still required.
