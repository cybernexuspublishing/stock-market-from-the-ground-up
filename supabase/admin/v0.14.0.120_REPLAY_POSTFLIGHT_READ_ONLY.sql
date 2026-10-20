-- v0.14.0.120 | SINGLE project READ-ONLY acceptance (after install).
-- Contains no identifying member information, personal notes or OHLCV prices.
BEGIN READ ONLY;
SELECT
 to_regprocedure('public.gu_v014120_replay_review_evidence(uuid,bigint)') IS NOT NULL AS rpc_installed,
 to_regprocedure('public.gu_v014118_review_transaction(uuid,bigint,text,text)') IS NOT NULL AS review_rpc_installed,
 to_regprocedure('public.v01494_replay_finish_to_journal(uuid,uuid)') IS NOT NULL AS journal_rpc_installed;
SELECT
 has_function_privilege('anon','public.gu_v014120_replay_review_evidence(uuid,bigint)','EXECUTE') AS anon_can_read,
 has_function_privilege('authenticated','public.gu_v014120_replay_review_evidence(uuid,bigint)','EXECUTE') AS member_direct_can_read,
 has_function_privilege('service_role','public.gu_v014120_replay_review_evidence(uuid,bigint)','EXECUTE') AS authorized_backend_can_read;
SELECT COUNT(*) AS published_rights_reviewed_datasets
 FROM public.market_datasets
 WHERE status='published' AND dataset_type='ohlcv'
  AND metadata->>'licensed_for_member_display'='true'
  AND metadata->>'evidence_verified'='true'
  AND nullif(btrim(source_attribution),'') IS NOT NULL
  AND nullif(btrim(license_note),'') IS NOT NULL
  AND nullif(btrim(metadata->>'corporate_action_policy'),'') IS NOT NULL;
SELECT count(*) AS linked_completed_sessions,
 count(*) FILTER(WHERE s.status<>'finished' OR s.user_id IS DISTINCT FROM l.user_id
  OR j.user_id IS DISTINCT FROM l.user_id OR j.id IS NULL) AS invalid_member_links
 FROM public.gu_replay_journal_links_v01494 l
 LEFT JOIN public.gu_replay_sessions_v01492 s ON s.id=l.session_id
 LEFT JOIN public.decision_journal j ON j.id=l.journal_id;
SELECT COUNT(*) AS replay_review_stages,
 COUNT(*) FILTER(WHERE rl.revealed_at IS NOT NULL
  AND (rl.pre_reveal_note IS NULL OR length(btrim(rl.pre_reveal_note))<20)) AS invalid_pre_reveal_notes,
 COUNT(*) FILTER(WHERE rl.completed_at IS NOT NULL AND
  (rl.post_reveal_note IS NULL OR rl.revealed_at IS NULL)) AS invalid_review_completion
 FROM public.gu_replay_review_locks_v014118 rl;
SELECT COUNT(*) AS replay_journals_with_fabricated_outcome
 FROM public.decision_journal j JOIN public.gu_replay_journal_links_v01494 l
 ON l.journal_id=j.id
 WHERE j.actual_entry IS NOT NULL OR j.actual_exit IS NOT NULL
 OR j.net_pnl IS NOT NULL OR j.process_grade IS NOT NULL;
ROLLBACK;
-- PASS requires rpc_installed, review/finish RPCs, backend_can_read true,
-- both public/direct roles false, 0 invalid/graded counts.
-- Zero linked sessions means NO live lifecycle acceptance evidence, not PASS.
