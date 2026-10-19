-- v0.14.0.95 | Owner read-only acceptance, run AFTER installing 0.94 and 0.95.
-- If prerequisite objects are absent: STOP and run dependency preflight.
-- Returns summary ONLY, no learner identifiers, trading notes or answer keys.
BEGIN READ ONLY;
SELECT
 to_regclass('public.gu_replay_journal_links_v01494') IS NOT NULL AS journal_link_table,
 to_regprocedure('public.v01494_replay_finish_to_journal(uuid,uuid)') IS NOT NULL AS journal_finish_rpc,
 to_regprocedure('public.v01492_replay_advance(uuid,uuid,integer)') IS NOT NULL AS chronological_advance_rpc;
SELECT c.relname AS private_table,c.relrowsecurity AS rls_on,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_read,
 has_table_privilege('authenticated',c.oid,'SELECT') AS member_read
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('gu_replay_bars_v01492','gu_replay_sessions_v01492','gu_replay_journal_links_v01494')
ORDER BY c.relname;
SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS member_can_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS server_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('v01492_replay_advance','v01494_replay_finish_to_journal');
SELECT
 count(*) AS total_bar_rows,
 count(DISTINCT dataset_code) AS datasets_with_bars
FROM public.gu_replay_bars_v01492;
WITH timeline AS (
 SELECT dataset_code,bar_index,bar_at,
  lag(bar_index) OVER (PARTITION BY dataset_code ORDER BY bar_index) AS prior_index,
  lag(bar_at) OVER (PARTITION BY dataset_code ORDER BY bar_index) AS prior_at
 FROM public.gu_replay_bars_v01492
)
SELECT
 count(*) FILTER (WHERE prior_index IS NOT NULL AND bar_index<>prior_index+1) AS missing_index_gaps,
 count(*) FILTER (WHERE prior_at IS NOT NULL AND bar_at<=prior_at) AS nonchronological_prices
FROM timeline;
SELECT
 count(*) AS all_journal_links,
 count(*) FILTER (WHERE s.id IS NULL OR j.id IS NULL OR
  s.user_id IS DISTINCT FROM l.user_id OR j.user_id IS DISTINCT FROM l.user_id OR
  s.status<>'finished') AS inconsistent_journal_links
FROM public.gu_replay_journal_links_v01494 l
LEFT JOIN public.gu_replay_sessions_v01492 s ON s.id=l.session_id
LEFT JOIN public.decision_journal j ON j.id=l.journal_id;
SELECT
 count(*) AS snapshots_without_corresponding_journal
FROM public.trade_plan_snapshots p
LEFT JOIN public.decision_journal j ON j.id=p.journal_id
WHERE j.id IS NULL;
SELECT EXISTS(
 SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 WHERE c.oid='public.gu_replay_bars_v01492'::regclass
 AND t.tgname='gu_replay_published_immutability_v01495'
 AND t.tgenabled IN ('O','A')
) AS published_bar_immutability_trigger_enabled;
ROLLBACK;
-- Expected: no public/member privileges; server_can_execute=true;
-- zero missing gaps, nonchronological prices, inconsistent links, or orphan
-- snapshots. No historical data (0 rows) is an onboarding blocker, not a pass.
