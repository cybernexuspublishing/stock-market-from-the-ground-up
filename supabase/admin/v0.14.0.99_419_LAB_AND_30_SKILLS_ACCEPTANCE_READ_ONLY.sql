-- v0.14.0.99 | Existing Supabase Owner-only, read-only acceptance.
-- Zero changes. Do NOT interpret SQL success as complete historical instruction.
BEGIN READ ONLY;
SELECT count(*) AS canonical_labs,
 count(*) FILTER(WHERE book_code='FOUNDATION_BOOK_1') AS foundations_i,
 count(*) FILTER(WHERE book_code='FOUNDATION_BOOK_2') AS foundations_ii,
 count(*) FILTER(WHERE book_code='FOUNDATION_BOOK_3') AS foundations_iii,
 count(*) FILTER(WHERE book_code='DAY_TRADING_BOOK_1') AS day_trading,
 count(*) FILTER(WHERE book_code='READING_THE_TAPE') AS reading_the_tape,
 count(*) FILTER(WHERE book_code='SITE_EXCLUSIVE') AS site_exclusive
FROM public.platform_labs;
SELECT count(*) AS official_competency_definitions,
 count(*) FILTER(WHERE active) AS active_definitions,
 count(*) FILTER(WHERE competency_code='LEVEL2_READING') AS level2_present,
 count(*) FILTER(WHERE competency_code='REPLAY_DISCIPLINE') AS erroneous_31st_present
FROM public.competency_definitions;
WITH inventory AS (
 SELECT l.lab_id,l.metadata,
 s.lab_id IS NOT NULL AS draft_present,s.review_state,
 s.questions,s.answer_key,d.dataset_code,d.status,d.ticker,d.metadata AS dataset_meta
 FROM public.platform_labs l
 LEFT JOIN public.lab_training_sets_v014 s ON s.lab_id=l.lab_id AND s.version=96
 LEFT JOIN public.market_datasets d ON d.dataset_code='GUSIM_'||replace(l.lab_id,'-','_')
)
SELECT count(*) AS registered,
 count(*) FILTER(WHERE draft_present) AS draft_sets,
 count(*) FILTER(WHERE draft_present AND review_state='draft') AS still_unreviewed,
 count(*) FILTER(WHERE draft_present AND jsonb_typeof(questions)='array' AND jsonb_array_length(questions)=4) AS four_questions,
 count(*) FILTER(WHERE draft_present AND jsonb_typeof(answer_key)='object' AND
  answer_key ?& ARRAY['EVIDENCE','FOCUS','ORIGINAL_MATH','BOUNDARY']) AS four_private_keys,
 count(*) FILTER(WHERE dataset_code IS NOT NULL AND status='published'
  AND ticker='SIMULATION' AND dataset_meta->>'original_synthetic'='true'
  AND dataset_meta->>'historical_evidence_verified'='false') AS clearly_original_simulations,
 count(*) FILTER(WHERE jsonb_typeof(metadata->'how')='array'
   AND jsonb_array_length(metadata->'how')>=3) AS existing_extended_narratives
FROM inventory;
WITH streams AS (
 SELECT b.dataset_code,b.bar_index,b.bar_at,b.open,b.high,b.low,b.close,b.volume,
 lag(b.bar_index) OVER(PARTITION BY b.dataset_code ORDER BY b.bar_index) AS prev_index,
 lag(b.bar_at) OVER(PARTITION BY b.dataset_code ORDER BY b.bar_index) AS prev_at
 FROM public.gu_replay_bars_v01492 b JOIN public.market_datasets d
  ON d.dataset_code=b.dataset_code
 WHERE d.metadata->>'original_synthetic'='true' AND
  EXISTS(SELECT 1 FROM public.platform_labs l
   WHERE d.dataset_code='GUSIM_'||replace(l.lab_id,'-','_'))
)
SELECT count(*) AS original_private_bars,
 count(DISTINCT dataset_code) AS original_scenarios,
 count(*) FILTER(WHERE open<=0 OR close<=0 OR
  high<greatest(open,close) OR low>least(open,close) OR low<=0 OR volume<0) AS invalid_bar_values,
 count(*) FILTER(WHERE prev_at IS NOT NULL AND bar_at<=prev_at) AS nonchronological_observations,
 count(*) FILTER(WHERE prev_index IS NOT NULL AND bar_index<>prev_index+1) AS missing_indices
FROM streams;
SELECT c.relname AS private_table,c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') AS anonymous_read_forbidden,
 has_table_privilege('authenticated',c.oid,'SELECT') AS direct_member_read_forbidden
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('gu_replay_bars_v01492','gu_replay_sessions_v01492','lab_training_sets_v014',
  'lab_training_attempts_v014','gu_replay_journal_links_v01494')
ORDER BY c.relname;
ROLLBACK;
-- Expected: 419 Lab IDs, 30 ORIGINAL v0.13.4 skills (including LEVEL2), 419 draft
-- sets, 419 fictional scenarios, 10056 private bars, 0 invalid/chronological
-- failures. 419 DRAFTS are NOT 419 editorially accepted graded lessons.
-- No student PII, answer keys, trade details, secrets or invented historical
-- sources are returned by this verification.
