-- v0.14.0.101 | EXISTING 30-COMPETENCY CATALOG — READ-ONLY RECONCILIATION
-- The v0.13.4 seed already contains 30 approved competency codes.
-- v0.14.0.99 falsely counted 29 because a test regex excluded the digit
-- in LEVEL2_READING. REPLAY_DISCIPLINE was an erroneous proposed 31st code.
-- This query does not change the existing database, assessment records, or catalogs.
-- Result set 1: totals. Result set 2: exact code reconciliation and aggregate evidence.
BEGIN READ ONLY;
SELECT COUNT(*) AS live_competencies,
       COUNT(*) FILTER (WHERE active) AS live_active_competencies,
       COUNT(*) FILTER (WHERE competency_code='LEVEL2_READING') AS level2_present,
       COUNT(*) FILTER (WHERE competency_code='REPLAY_DISCIPLINE') AS erroneous_31st_present
FROM public.competency_definitions;

WITH canonical(competency_code) AS (
  VALUES
    ('CHART_STRUCTURE'),
    ('CANDLE_READING'),
    ('VWAP_CONTEXT'),
    ('EMA_CONTEXT'),
    ('VOLUME_ANALYSIS'),
    ('MULTI_TIMEFRAME'),
    ('BREAKOUT_RECOGNITION'),
    ('FAILED_BREAKOUT'),
    ('PULLBACK_RECOGNITION'),
    ('HOD_PM_LEVELS'),
    ('RCT_RECOGNITION'),
    ('SQUEEZE_CONTEXT'),
    ('RISK_PER_SHARE'),
    ('POSITION_SIZING'),
    ('RISK_REWARD'),
    ('ORDER_SELECTION'),
    ('SLIPPAGE_SPREAD'),
    ('CATALYST_ANALYSIS'),
    ('FLOAT_SUPPLY'),
    ('SEC_FILINGS'),
    ('CANDIDATE_QUALITY'),
    ('MARKET_REGIME'),
    ('TAPE_READING'),
    ('LEVEL2_READING'),
    ('HALTS_LULD'),
    ('ENTER_WATCH_NO_TRADE'),
    ('INVALIDATION_DISCIPLINE'),
    ('CHASE_FOMO_DISCIPLINE'),
    ('MFE_MAE_REVIEW'),
    ('INDEPENDENT_PLAN')
), evidence_counts AS (
  SELECT competency_code, COUNT(*) AS evidence_rows
  FROM public.competency_evidence
  GROUP BY competency_code
)
SELECT CASE WHEN live.competency_code IS NULL THEN 'MISSING_FROM_LIVE'
            WHEN canonical.competency_code IS NULL THEN 'NONCANONICAL_LIVE_CODE'
            ELSE 'MATCH' END AS reconciliation_status,
       COALESCE(live.competency_code,canonical.competency_code) AS competency_code,
       live.name AS live_name,live.category AS live_category,live.active AS live_active,
       COALESCE(ev.evidence_rows,0) AS existing_evidence_rows
FROM canonical FULL OUTER JOIN public.competency_definitions live USING (competency_code)
LEFT JOIN evidence_counts ev ON ev.competency_code=live.competency_code
ORDER BY CASE WHEN live.competency_code IS NULL THEN 0
              WHEN canonical.competency_code IS NULL THEN 1
              ELSE 2 END,
         COALESCE(live.competency_code,canonical.competency_code);
ROLLBACK;
-- PASS: 30 live competencies, level2_present=1, erroneous_31st_present=0,
-- and all reconciliation_status values MATCH.
-- Any mismatch requires source review, NOT deletion, renaming or a 31st insert.
