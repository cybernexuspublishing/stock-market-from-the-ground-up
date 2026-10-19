-- v0.14.0.94 | Run against the ONE EXISTING Supabase project.
-- Read-only inspection; do not re-run legacy migrations if anything is missing.
BEGIN READ ONLY;
SELECT identifier, installed FROM (VALUES
 ('market_datasets',to_regclass('public.market_datasets') IS NOT NULL),
 ('gu_replay_bars_v01492',to_regclass('public.gu_replay_bars_v01492') IS NOT NULL),
 ('gu_replay_sessions_v01492',to_regclass('public.gu_replay_sessions_v01492') IS NOT NULL),
 ('decision_journal',to_regclass('public.decision_journal') IS NOT NULL),
 ('trade_plan_snapshots',to_regclass('public.trade_plan_snapshots') IS NOT NULL)
) AS c(identifier,installed);
SELECT table_name,column_name,data_type
 FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN
 ('market_datasets','gu_replay_sessions_v01492','gu_replay_bars_v01492',
  'decision_journal','trade_plan_snapshots')
 AND column_name IN ('ticker','decision','reasoning','decision_plan',
  'locked_at','status','journal_type','plan_locked_at','snapshot',
  'bar_at','bar_index','dataset_type','metadata','source_attribution','license_note')
 ORDER BY table_name,column_name;
SELECT p.proname,p.prosecdef,r.rolname AS owner,
 p.proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 JOIN pg_roles r ON r.oid=p.proowner
 WHERE n.nspname='public' AND p.proname IN
 ('v01492_replay_advance','lock_trade_plan','v01494_replay_finish_to_journal');
ROLLBACK;
