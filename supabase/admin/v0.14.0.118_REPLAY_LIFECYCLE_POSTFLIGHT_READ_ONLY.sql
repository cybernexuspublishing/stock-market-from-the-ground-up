-- v0.14.0.118 | POST-INSTALL ONLY | existing ONE Supabase project.
-- READ ONLY: aggregate counters; NEVER outputs member UUIDs, order notes,
-- private rubric answer keys, price bar arrays, tokens or external finance data.
-- Requires v118 installed. Missing relation/function is a BLOCKER, not success.
BEGIN READ ONLY;
SELECT
 to_regclass('public.gu_replay_journal_links_v01494') IS NOT NULL AS linked_evidence_table,
 to_regclass('public.gu_replay_review_locks_v014118') IS NOT NULL AS review_lock_table,
 to_regprocedure('public.v01494_replay_finish_to_journal(uuid,uuid)') IS NOT NULL AS existing_atomic_finisher,
 to_regprocedure('public.gu_v014118_review_transaction(uuid,bigint,text,text)') IS NOT NULL AS review_transaction,
 to_regprocedure('public.v01492_replay_advance(uuid,uuid,integer)') IS NOT NULL AS existing_no_lookahead_advance;
SELECT
 c.relname,c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') AS public_read,
 has_table_privilege('authenticated',c.oid,'SELECT') AS member_direct_read,
 has_table_privilege('authenticated',c.oid,'INSERT') AS member_direct_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') AS member_direct_update
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('gu_replay_bars_v01492','gu_replay_sessions_v01492',
  'gu_replay_journal_links_v01494','gu_replay_review_locks_v014118')
ORDER BY c.relname;
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') AS public_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS member_direct_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS server_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('v01492_replay_advance','v01494_replay_finish_to_journal',
  'gu_v014118_review_transaction')
ORDER BY p.proname;
SELECT tgname,tgenabled IN ('O','A') AS enabled
FROM pg_trigger WHERE tgrelid IN (
 'public.gu_replay_sessions_v01492'::regclass,'public.decision_journal'::regclass,
 'public.gu_replay_review_locks_v014118'::regclass,
 'public.journal_reviews'::regclass,'public.gu_replay_bars_v01492'::regclass
) AND tgname IN ('gu_replay_first_decision_integrity_v014118',
 'gu_replay_journal_immutable_v014118','gu_replay_review_immutable_v014118',
 'gu_replay_review_write_guard_v014118','gu_replay_published_immutability_v01495');
SELECT count(*) AS linked_replays,
 count(*) FILTER(WHERE s.id IS NULL OR j.id IS NULL OR
  s.user_id IS DISTINCT FROM l.user_id OR j.user_id IS DISTINCT FROM l.user_id OR
  s.status<>'finished' OR
  p.journal_id IS NULL OR
  (p.snapshot->>'firstDecisionLockedAt') IS NULL
 ) AS invalid_links,
 count(*) FILTER(WHERE j.actual_entry IS NOT NULL OR j.actual_exit IS NOT NULL OR
   j.net_pnl IS NOT NULL OR j.gross_pnl IS NOT NULL OR
   j.r_multiple IS NOT NULL OR j.process_grade IS NOT NULL) AS replay_outcomes_wrongly_recorded,
 count(*) FILTER(WHERE p.snapshot->>'outcomeVerified'<>'false' OR
  p.snapshot->>'graded'<>'false') AS unapproved_replay_grades
FROM public.gu_replay_journal_links_v01494 l
LEFT JOIN public.gu_replay_sessions_v01492 s ON s.id=l.session_id
LEFT JOIN public.decision_journal j ON j.id=l.journal_id
LEFT JOIN public.trade_plan_snapshots p ON p.journal_id=l.journal_id;
SELECT count(*) AS missing_spaced_review_stages FROM (
 SELECT l.journal_id,v.stage
 FROM public.gu_replay_journal_links_v01494 l
 CROSS JOIN (VALUES('1D'),('7D'),('30D')) AS v(stage)
 LEFT JOIN public.journal_reviews r
  ON r.journal_id=l.journal_id AND r.review_stage=v.stage
 WHERE r.id IS NULL
) missing;
SELECT count(*) AS replay_reviews_completed_before_v118_lock FROM public.journal_reviews r
 JOIN public.gu_replay_journal_links_v01494 l ON l.journal_id=r.journal_id
 LEFT JOIN public.gu_replay_review_locks_v014118 rl ON rl.review_id=r.id
 WHERE r.completed_at IS NOT NULL AND rl.review_id IS NULL;
SELECT count(*) AS locked_review_stages,
 count(*) FILTER(WHERE rl.user_id IS DISTINCT FROM j.user_id OR
   rl.journal_id IS DISTINCT FROM r.journal_id OR
   r.journal_id IS NULL OR l.journal_id IS NULL) AS owner_integrity_errors,
 count(*) FILTER(WHERE rl.completed_at IS NOT NULL AND
  (rl.revealed_at IS NULL OR r.completed_at IS NULL OR
   r.review_notes IS DISTINCT FROM rl.post_reveal_note)) AS stage_sequence_errors
FROM public.gu_replay_review_locks_v014118 rl
LEFT JOIN public.journal_reviews r ON r.id=rl.review_id
LEFT JOIN public.decision_journal j ON j.id=rl.journal_id
LEFT JOIN public.gu_replay_journal_links_v01494 l ON l.journal_id=rl.journal_id;
WITH chronology AS (
 SELECT dataset_code,bar_index,bar_at,
  lag(bar_index) OVER(PARTITION BY dataset_code ORDER BY bar_index) AS prev_index,
  lag(bar_at) OVER(PARTITION BY dataset_code ORDER BY bar_index) AS prev_at
 FROM public.gu_replay_bars_v01492)
SELECT count(*) AS total_private_bars,
 count(*) FILTER(WHERE prev_index IS NOT NULL AND bar_index<>prev_index+1) AS missing_observations,
 count(*) FILTER(WHERE prev_at IS NOT NULL AND bar_at<=prev_at) AS nonmonotonic_timestamps
FROM chronology;
ROLLBACK;
-- Acceptance requires present RPCs, 5 enabled guards, zero mismatch counts,
-- no non-server private permissions and nonempty reviewed datasets.
-- Numeric zero rows means no real lifecycle E2E evidence exists yet.
