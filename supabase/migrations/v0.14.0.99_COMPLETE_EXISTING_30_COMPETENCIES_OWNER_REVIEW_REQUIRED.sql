-- v0.14.0.99 | CORRECTED / SUPERSEDED BY v0.14.0.101
-- WARNING: original version tried to add REPLAY_DISCIPLINE as a 31st skill.
-- Root cause: test parser excluded the digit in existing LEVEL2_READING.
-- No competency insert is required. Retain the 30 seeded by v0.13.4.
-- Read-only guard: never modify production member evidence or approved definitions.
BEGIN READ ONLY;
DO $$
DECLARE current_count integer; missing_codes text;
BEGIN
  IF to_regclass('public.competency_definitions') IS NULL THEN
    RAISE EXCEPTION 'Existing competency_definitions table is missing; do not recreate it here';
  END IF;
  SELECT COUNT(*) INTO current_count FROM public.competency_definitions;
  SELECT string_agg(want.code,', ' ORDER BY want.code) INTO missing_codes
  FROM (VALUES
    ('CHART_STRUCTURE'::text),
    ('CANDLE_READING'::text),
    ('VWAP_CONTEXT'::text),
    ('EMA_CONTEXT'::text),
    ('VOLUME_ANALYSIS'::text),
    ('MULTI_TIMEFRAME'::text),
    ('BREAKOUT_RECOGNITION'::text),
    ('FAILED_BREAKOUT'::text),
    ('PULLBACK_RECOGNITION'::text),
    ('HOD_PM_LEVELS'::text),
    ('RCT_RECOGNITION'::text),
    ('SQUEEZE_CONTEXT'::text),
    ('RISK_PER_SHARE'::text),
    ('POSITION_SIZING'::text),
    ('RISK_REWARD'::text),
    ('ORDER_SELECTION'::text),
    ('SLIPPAGE_SPREAD'::text),
    ('CATALYST_ANALYSIS'::text),
    ('FLOAT_SUPPLY'::text),
    ('SEC_FILINGS'::text),
    ('CANDIDATE_QUALITY'::text),
    ('MARKET_REGIME'::text),
    ('TAPE_READING'::text),
    ('LEVEL2_READING'::text),
    ('HALTS_LULD'::text),
    ('ENTER_WATCH_NO_TRADE'::text),
    ('INVALIDATION_DISCIPLINE'::text),
    ('CHASE_FOMO_DISCIPLINE'::text),
    ('MFE_MAE_REVIEW'::text),
    ('INDEPENDENT_PLAN'::text)
  ) AS want(code)
  WHERE NOT EXISTS (SELECT 1 FROM public.competency_definitions AS live
                    WHERE live.competency_code=want.code);
  IF current_count <> 30 OR missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Live competency catalog mismatch: % definitions; missing approved codes: %. Run v0.14.0.101 read-only reconciliation, do not add a 31st.',current_count,COALESCE(missing_codes,'none');
  END IF;
  RAISE NOTICE 'Verified existing 30 v0.13.4 competencies including LEVEL2_READING; no migration required.';
END $$;
ROLLBACK;
