-- v0.14.0.97 | Existing database's original simulations read-only verification.
BEGIN READ ONLY;
SELECT count(*) AS original_simulation_datasets,
 count(*) FILTER(WHERE status='published') AS published_original_simulations,
 count(*) FILTER(WHERE metadata->>'historical_evidence_verified'='false') AS explicitly_not_historical
FROM public.market_datasets
WHERE metadata->>'original_synthetic'='true' AND dataset_code LIKE 'GUSIM_%';
SELECT count(*) AS invented_private_bars,
 count(DISTINCT b.dataset_code) AS original_scenarios_with_bars
FROM public.gu_replay_bars_v01492 b
JOIN public.market_datasets d ON d.dataset_code=b.dataset_code
WHERE d.metadata->>'original_synthetic'='true' AND d.dataset_code LIKE 'GUSIM_%';
WITH timeline AS (
 SELECT b.dataset_code,b.bar_index,b.bar_at,
 lag(bar_at) OVER(PARTITION BY b.dataset_code ORDER BY b.bar_index) AS prior_at
 FROM public.gu_replay_bars_v01492 b
 JOIN public.market_datasets d ON d.dataset_code=b.dataset_code
 WHERE d.metadata->>'original_synthetic'='true'
)
SELECT count(*) FILTER(WHERE prior_at IS NOT NULL AND bar_at<=prior_at) AS backwards_future_observations
FROM timeline;
SELECT has_function_privilege('anon','public.v01494_replay_finish_to_journal(uuid,uuid)','EXECUTE') AS anon_must_be_false,
 has_function_privilege('authenticated','public.v01494_replay_finish_to_journal(uuid,uuid)','EXECUTE') AS member_must_be_false,
 has_function_privilege('service_role','public.v01494_replay_finish_to_journal(uuid,uuid)','EXECUTE') AS server_must_be_true;
ROLLBACK;
