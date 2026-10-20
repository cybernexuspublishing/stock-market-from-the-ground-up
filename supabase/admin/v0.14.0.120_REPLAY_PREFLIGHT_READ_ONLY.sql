-- v0.14.0.120 | ONE production project | NON-MUTATING PRE-INSTALL INSPECTION.
-- Run in Supabase SQL Editor before applying v120; does not need v120.
-- True/false and aggregate-only. Never prints member identifiers or Journal notes.
BEGIN READ ONLY;
SELECT requirement,present FROM (VALUES
 ('market dataset registry',to_regclass('public.market_datasets') IS NOT NULL),
 ('private observed candles',to_regclass('public.gu_replay_bars_v01492') IS NOT NULL),
 ('private replay sessions',to_regclass('public.gu_replay_sessions_v01492') IS NOT NULL),
 ('first-decision Journal link',to_regclass('public.gu_replay_journal_links_v01494') IS NOT NULL),
 ('review scheduling table',to_regclass('public.journal_reviews') IS NOT NULL),
 ('immutable pre-reveal notes',to_regclass('public.gu_replay_review_locks_v014118') IS NOT NULL),
 ('v118 atomic review RPC',to_regprocedure('public.gu_v014118_review_transaction(uuid,bigint,text,text)') IS NOT NULL),
 ('v95 chronological cursor RPC',to_regprocedure('public.v01492_replay_advance(uuid,uuid,integer)') IS NOT NULL),
 ('v118 first-decision finisher',to_regprocedure('public.v01494_replay_finish_to_journal(uuid,uuid)') IS NOT NULL)
) AS checks(requirement,present);
SELECT relation_name,enabled FROM (
 SELECT 'v95 published bar immutability'::text relation_name,
 EXISTS(SELECT 1 FROM pg_trigger
 WHERE tgrelid=to_regclass('public.gu_replay_bars_v01492')
  AND tgname='gu_replay_published_immutability_v01495' AND tgenabled IN('O','A')) enabled
 UNION ALL SELECT 'v118 first decision immutability',
 EXISTS(SELECT 1 FROM pg_trigger
 WHERE tgrelid=to_regclass('public.gu_replay_sessions_v01492')
  AND tgname='gu_replay_first_decision_integrity_v014118' AND tgenabled IN('O','A'))
 UNION ALL SELECT 'v118 review completion guard',
 EXISTS(SELECT 1 FROM pg_trigger
 WHERE tgrelid=to_regclass('public.journal_reviews')
  AND tgname='gu_replay_review_write_guard_v014118' AND tgenabled IN('O','A'))
) t;
SELECT table_name,column_name,data_type FROM information_schema.columns
 WHERE table_schema='public' AND (
  (table_name='market_datasets' AND column_name IN
   ('dataset_code','status','dataset_type','metadata','source_attribution','license_note'))
  OR (table_name='gu_replay_sessions_v01492' AND column_name IN
   ('id','user_id','dataset_code','status','current_index','decision_locked','locked_at'))
  OR (table_name='gu_replay_review_locks_v014118' AND column_name IN
   ('review_id','journal_id','user_id','revealed_at'))
 ) ORDER BY table_name,column_name;
ROLLBACK;
-- STOP if ANY requirement/guard is false or column differs.
-- No zero-cost/free test product or bogus OHLCV records are required.
