-- v0.14.0.95 | Owner read-only dependency + permission inspection.
-- This script can be run BEFORE applying v0.14.0.94 and v0.14.0.95.
-- Existing Supabase project ONLY. No tables, rows, indexes or settings changed.
BEGIN READ ONLY;
SELECT name,installed FROM (VALUES
 ('public.market_datasets',to_regclass('public.market_datasets') IS NOT NULL),
 ('public.gu_replay_bars_v01492',to_regclass('public.gu_replay_bars_v01492') IS NOT NULL),
 ('public.gu_replay_sessions_v01492',to_regclass('public.gu_replay_sessions_v01492') IS NOT NULL),
 ('public.decision_journal',to_regclass('public.decision_journal') IS NOT NULL),
 ('public.trade_plan_snapshots',to_regclass('public.trade_plan_snapshots') IS NOT NULL),
 ('public.gu_replay_journal_links_v01494',to_regclass('public.gu_replay_journal_links_v01494') IS NOT NULL),
 ('public.lab_instruction_v014',to_regclass('public.lab_instruction_v014') IS NOT NULL),
 ('public.lab_training_sets_v014',to_regclass('public.lab_training_sets_v014') IS NOT NULL),
 ('public.lab_training_attempts_v014',to_regclass('public.lab_training_attempts_v014') IS NOT NULL),
 ('public.journal_reviews',to_regclass('public.journal_reviews') IS NOT NULL)
) AS t(name,installed);
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS signature,
 p.prosecdef AS security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_exec,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('v01492_replay_advance','v01494_replay_finish_to_journal',
  'v014_training_answer','v014_training_start')
ORDER BY p.proname;
SELECT c.relname,c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT') AS member_select,
 has_table_privilege('service_role',c.oid,'SELECT') AS service_select
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('gu_replay_bars_v01492','gu_replay_sessions_v01492',
 'gu_replay_journal_links_v01494','lab_training_sets_v014',
 'lab_training_attempts_v014')
ORDER BY c.relname;
SELECT c.relname AS table_name, t.tgname AS trigger_name,
 pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
 AND c.relname IN ('decision_journal','gu_replay_bars_v01492')
ORDER BY c.relname,t.tgname;
ROLLBACK;
