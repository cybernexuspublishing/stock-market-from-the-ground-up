-- v0.14.0.105 | OWNER REVIEW — 419 Lab topic suggestions and optional knowledge-only evidence.
-- Single EXISTING Supabase project. This migration DOES NOT approve any mapping.
-- 419 source curriculum links are UNGRADED SUGGESTIONS until an Owner reviews
-- the Lab's CURRENT published rubric and an EXACTLY ONE skill mapping.
-- No fabricated four-dimension grades, market history, chart proof or mastery.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_lab_competency_knowledge_map_v014105 (
 lab_id text PRIMARY KEY REFERENCES public.platform_labs(lab_id) ON DELETE RESTRICT,
 competency_code text NOT NULL REFERENCES public.competency_definitions(competency_code),
 mapping_method text NOT NULL,
 review_state text NOT NULL DEFAULT 'candidate' CHECK(review_state IN ('candidate','approved','rejected')),
 rubric_version integer NOT NULL DEFAULT 0 CHECK(rubric_version>=0),
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gu_v014105_mapping_review_consistent CHECK (
 (review_state='approved' AND rubric_version>0 AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
 OR (review_state<>'approved' AND rubric_version=0 AND reviewed_by IS NULL AND reviewed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS gu_lab_competency_knowledge_map_v014105_skill_idx
 ON public.gu_lab_competency_knowledge_map_v014105(competency_code,review_state);
ALTER TABLE public.gu_lab_competency_knowledge_map_v014105 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lab_competency_knowledge_map_v014105 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_lab_competency_knowledge_map_v014105 TO service_role;
-- Canonical source-topic suggestion only, never "approved", review_count or pass.
INSERT INTO public.gu_lab_competency_knowledge_map_v014105
 (lab_id,competency_code,mapping_method)
VALUES
('F1-C02-L01','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('F1-C02-L02','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('F1-C04-L01','CANDIDATE_QUALITY','editorial_topic_bridge_ungraded'),
('F1-C06-L01','TAPE_READING','editorial_topic_bridge_ungraded'),
('F1-C07-L01','CANDIDATE_QUALITY','editorial_topic_bridge_ungraded'),
('F1-C07-L02','MARKET_REGIME','editorial_topic_bridge_ungraded'),
('F1-C08-L01','FLOAT_SUPPLY','editorial_topic_bridge_ungraded'),
('F1-C08-L02','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('F1-C08-L03','SLIPPAGE_SPREAD','editorial_topic_bridge_ungraded'),
('F1-C09-L01','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('F1-C10-L01','RISK_PER_SHARE','editorial_topic_bridge_ungraded'),
('F1-C10-L02','ORDER_SELECTION','editorial_topic_bridge_ungraded'),
('F1-C12-L01','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('F1-C13-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('F1-C13-L02','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('F2-C01-L01','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('F2-C02-L01','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('F2-C02-L02','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('F2-C02-L03','MARKET_REGIME','editorial_topic_bridge_ungraded'),
('F2-C03-L01','MARKET_REGIME','editorial_topic_bridge_ungraded'),
('F2-C03-L02','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('F2-C04-L01','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('F2-C04-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('F2-C05-L01','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C05-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('F2-C05-L03','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('F2-C06-L01','CHART_STRUCTURE','editorial_topic_bridge_ungraded'),
('F2-C06-L02','MULTI_TIMEFRAME','editorial_topic_bridge_ungraded'),
('F2-C07-L01','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C07-L02','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C07-L03','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C08-L01','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C08-L02','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C08-L03','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C08-L04','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C08-L05','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C08-L06','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C09-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C09-L02','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C09-L03','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C09-L04','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C09-L05','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C10-L01','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C10-L02','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C10-L03','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C11-L01','CANDLE_READING','topic_keyword_suggestion_ungraded'),
('F2-C11-L02','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C11-L03','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C11-L04','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('F2-C12-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C12-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C12-L03','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C12-L04','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C13-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C13-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C13-L03','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C13-L04','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C14-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C14-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C14-L03','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F2-C14-L04','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F3-C01-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F3-C01-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F3-C01-L03','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C01-L04','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C01-L05','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C01-L06','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C01-L07','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C02-L01','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C02-L02','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C02-L03','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C02-L04','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C02-L05','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('F3-C03-L01','CANDLE_READING','editorial_topic_bridge_ungraded'),
('F3-C03-L02','CANDLE_READING','editorial_topic_bridge_ungraded'),
('F3-C03-L03','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C03-L04','RCT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C04-L01','EMA_CONTEXT','editorial_topic_bridge_ungraded'),
('F3-C04-L02','EMA_CONTEXT','editorial_topic_bridge_ungraded'),
('F3-C04-L03','EMA_CONTEXT','editorial_topic_bridge_ungraded'),
('F3-C05-L01','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C05-L02','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C05-L03','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C05-L04','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C06-L01','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C06-L02','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C06-L03','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C06-L04','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C06-L05','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C06-L06','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('F3-C07-L01','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('F3-C07-L02','EMA_CONTEXT','editorial_topic_bridge_ungraded'),
('F3-C07-L03','CHASE_FOMO_DISCIPLINE','topic_keyword_suggestion_ungraded'),
('F3-C07-L04','SQUEEZE_CONTEXT','editorial_topic_bridge_ungraded'),
('DT-C01-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('DT-C01-L02','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C01-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C02-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('DT-C02-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C02-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C03-L01','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C03-L02','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C03-L03','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C04-L01','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('DT-C04-L02','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('DT-C04-L03','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('DT-C05-L01','RISK_PER_SHARE','editorial_topic_bridge_ungraded'),
('DT-C05-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C05-L03','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('DT-C06-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('DT-C06-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C06-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C07-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C07-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C07-L03','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C08-L01','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('DT-C08-L02','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('DT-C08-L03','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('DT-C09-L01','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C09-L02','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C09-L03','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C10-L01','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('DT-C10-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('DT-C10-L03','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('DT-C11-L01','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C11-L02','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C11-L03','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C12-L01','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C12-L02','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('DT-C12-L03','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C13-L01','MARKET_REGIME','editorial_topic_bridge_ungraded'),
('DT-C13-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C13-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C14-L01','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C14-L02','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C14-L03','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C15-L01','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('DT-C15-L02','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('DT-C15-L03','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('DT-C16-L01','CANDIDATE_QUALITY','editorial_topic_bridge_ungraded'),
('DT-C16-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C16-L03','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C17-L01','CATALYST_ANALYSIS','editorial_topic_bridge_ungraded'),
('DT-C17-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C17-L03','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C18-L01','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C18-L02','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C18-L03','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C19-L01','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C19-L02','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C19-L03','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C20-L01','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('DT-C20-L02','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('DT-C20-L03','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('DT-C21-L01','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C21-L02','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C21-L03','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C22-L01','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C22-L02','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C22-L03','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C23-L01','SEC_FILINGS','topic_keyword_suggestion_ungraded'),
('DT-C23-L02','SEC_FILINGS','topic_keyword_suggestion_ungraded'),
('DT-C23-L03','SEC_FILINGS','topic_keyword_suggestion_ungraded'),
('DT-C24-L01','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C24-L02','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C24-L03','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C25-L01','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C25-L02','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C25-L03','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C26-L01','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C26-L02','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C26-L03','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('DT-C27-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('DT-C27-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('DT-C27-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('DT-C28-L01','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C28-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C28-L03','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C29-L01','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C29-L02','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C29-L03','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('DT-C30-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('DT-C30-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C30-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C31-L01','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('DT-C31-L02','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('DT-C31-L03','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('DT-C32-L01','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('DT-C32-L02','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('DT-C32-L03','PULLBACK_RECOGNITION','topic_keyword_suggestion_ungraded'),
('DT-C33-L01','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C33-L02','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C33-L03','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('DT-C34-L01','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('DT-C34-L02','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('DT-C34-L03','BREAKOUT_RECOGNITION','topic_keyword_suggestion_ungraded'),
('DT-C35-L01','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C35-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C35-L03','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('DT-C36-L01','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('DT-C36-L02','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('DT-C36-L03','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('DT-C37-L01','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('DT-C37-L02','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('DT-C37-L03','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('DT-C38-L01','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('DT-C38-L02','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('DT-C38-L03','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('DT-C39-L01','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C39-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C39-L03','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C40-L01','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('DT-C40-L02','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('DT-C40-L03','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('DT-C41-L01','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('DT-C41-L02','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('DT-C41-L03','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('DT-C42-L01','INVALIDATION_DISCIPLINE','topic_keyword_suggestion_ungraded'),
('DT-C42-L02','INVALIDATION_DISCIPLINE','topic_keyword_suggestion_ungraded'),
('DT-C42-L03','INVALIDATION_DISCIPLINE','topic_keyword_suggestion_ungraded'),
('DT-C43-L01','RISK_REWARD','topic_keyword_suggestion_ungraded'),
('DT-C43-L02','RISK_REWARD','topic_keyword_suggestion_ungraded'),
('DT-C43-L03','RISK_REWARD','topic_keyword_suggestion_ungraded'),
('DT-C44-L01','INVALIDATION_DISCIPLINE','editorial_topic_bridge_ungraded'),
('DT-C44-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C44-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C45-L01','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('DT-C45-L02','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('DT-C45-L03','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('DT-C46-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('DT-C46-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C46-L03','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C47-L01','CHASE_FOMO_DISCIPLINE','topic_keyword_suggestion_ungraded'),
('DT-C47-L02','CHASE_FOMO_DISCIPLINE','editorial_topic_bridge_ungraded'),
('DT-C48-L01','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C48-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('DT-C49-L01','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C49-L02','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('DT-C50-L01','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C50-L02','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('DT-C51-L01','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('DT-C51-L02','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('DT-C52-L01','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('DT-C52-L02','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('TAPE-C01-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C01-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C01-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C02-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C02-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C02-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C03-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C03-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C03-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C04-L01','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C04-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C04-L03','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C05-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C05-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C05-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C06-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C06-L02','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('TAPE-C06-L03','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('TAPE-C07-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C07-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C07-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C08-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C08-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C08-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C09-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C09-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C09-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C10-L01','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C10-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C10-L03','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C11-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C11-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C11-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C12-L01','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('TAPE-C12-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C12-L03','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C13-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C13-L02','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('TAPE-C13-L03','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C14-L01','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('TAPE-C14-L02','VWAP_CONTEXT','topic_keyword_suggestion_ungraded'),
('TAPE-C14-L03','HOD_PM_LEVELS','topic_keyword_suggestion_ungraded'),
('TAPE-C15-L01','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('TAPE-C15-L02','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('TAPE-C15-L03','FAILED_BREAKOUT','topic_keyword_suggestion_ungraded'),
('TAPE-C16-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C16-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C17-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C17-L02','EMA_CONTEXT','topic_keyword_suggestion_ungraded'),
('TAPE-C18-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C18-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C19-L01','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('TAPE-C19-L02','MARKET_REGIME','topic_keyword_suggestion_ungraded'),
('TAPE-C20-L01','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('TAPE-C20-L02','ENTER_WATCH_NO_TRADE','topic_keyword_suggestion_ungraded'),
('TAPE-C21-L01','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('TAPE-C21-L02','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('TAPE-C22-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C22-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C23-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C23-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C24-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C24-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C25-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C25-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C26-L01','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('TAPE-C26-L02','VOLUME_ANALYSIS','topic_keyword_suggestion_ungraded'),
('TAPE-C27-L01','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C27-L02','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('TAPE-C28-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C28-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C29-L01','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C29-L02','TAPE_READING','topic_keyword_suggestion_ungraded'),
('TAPE-C30-L01','SQUEEZE_CONTEXT','topic_keyword_suggestion_ungraded'),
('TAPE-C30-L02','SQUEEZE_CONTEXT','topic_keyword_suggestion_ungraded'),
('SITE-001','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-002','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-003','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-004','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-005','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-006','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-007','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-008','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-009','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-010','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-011','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-012','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-013','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-014','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-015','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-016','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-017','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-018','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-019','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-020','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-021','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-022','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-023','INDEPENDENT_PLAN','editorial_topic_bridge_ungraded'),
('SITE-024','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-025','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-026','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-027','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-028','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-029','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-030','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-031','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-032','CANDIDATE_QUALITY','topic_keyword_suggestion_ungraded'),
('SITE-033','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('SITE-034','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('SITE-035','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('SITE-036','INDEPENDENT_PLAN','topic_keyword_suggestion_ungraded'),
('SITE-037','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-038','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-039','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-040','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-041','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('SITE-042','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('SITE-043','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('SITE-044','FLOAT_SUPPLY','topic_keyword_suggestion_ungraded'),
('SITE-045','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('SITE-046','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('SITE-047','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('SITE-048','CHART_STRUCTURE','topic_keyword_suggestion_ungraded'),
('SITE-049','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('SITE-050','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('SITE-051','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('SITE-052','MULTI_TIMEFRAME','topic_keyword_suggestion_ungraded'),
('SITE-053','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('SITE-054','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('SITE-055','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('SITE-056','POSITION_SIZING','topic_keyword_suggestion_ungraded'),
('SITE-057','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-058','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-059','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-060','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-061','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('SITE-062','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('SITE-063','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('SITE-064','SLIPPAGE_SPREAD','topic_keyword_suggestion_ungraded'),
('SITE-065','TAPE_READING','topic_keyword_suggestion_ungraded'),
('SITE-066','TAPE_READING','topic_keyword_suggestion_ungraded'),
('SITE-067','TAPE_READING','topic_keyword_suggestion_ungraded'),
('SITE-068','TAPE_READING','topic_keyword_suggestion_ungraded'),
('SITE-069','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-070','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-071','MFE_MAE_REVIEW','editorial_topic_bridge_ungraded'),
('SITE-072','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-073','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-074','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-075','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-076','CATALYST_ANALYSIS','topic_keyword_suggestion_ungraded'),
('SITE-077','FLOAT_SUPPLY','editorial_topic_bridge_ungraded'),
('SITE-078','FLOAT_SUPPLY','editorial_topic_bridge_ungraded'),
('SITE-079','FLOAT_SUPPLY','editorial_topic_bridge_ungraded'),
('SITE-080','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-081','SQUEEZE_CONTEXT','topic_keyword_suggestion_ungraded'),
('SITE-082','SQUEEZE_CONTEXT','topic_keyword_suggestion_ungraded'),
('SITE-083','SQUEEZE_CONTEXT','topic_keyword_suggestion_ungraded'),
('SITE-084','SQUEEZE_CONTEXT','topic_keyword_suggestion_ungraded'),
('SITE-085','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('SITE-086','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('SITE-087','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('SITE-088','HALTS_LULD','topic_keyword_suggestion_ungraded'),
('SITE-089','ORDER_SELECTION','editorial_topic_bridge_ungraded'),
('SITE-090','ORDER_SELECTION','editorial_topic_bridge_ungraded'),
('SITE-091','ORDER_SELECTION','editorial_topic_bridge_ungraded'),
('SITE-092','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-093','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-094','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-095','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-096','ORDER_SELECTION','topic_keyword_suggestion_ungraded'),
('SITE-097','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-098','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-099','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded'),
('SITE-100','MFE_MAE_REVIEW','topic_keyword_suggestion_ungraded')
ON CONFLICT (lab_id) DO NOTHING;

-- An explicitly reviewed CURRENT/EXACT rubric version, Owner-approved mapping
-- and completed actual server-graded attempt can award at most ONE "knowledge"
-- dimension record for the primary approved competency.
CREATE OR REPLACE FUNCTION public.gu_v014105_sync_reviewed_knowledge(
 p_actor uuid,p_attempt uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $$
DECLARE a record; m record; d record; v_rows integer;
BEGIN
 IF p_actor IS NULL OR p_attempt IS NULL THEN
  RETURN jsonb_build_object('ok',false,'reason','invalid_attempt'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_attempt::text,140105));
 SELECT t.*,s.review_state AS rubric_state,s.reviewed_by AS rubric_reviewer,
        s.reviewed_at AS rubric_reviewed_at,s.source_status
 INTO a FROM public.lab_training_attempts_v014 t
 JOIN public.lab_training_sets_v014 s ON s.lab_id=t.lab_id AND s.version=t.set_version
 WHERE t.id=p_attempt AND t.user_id=p_actor;
 IF NOT FOUND OR a.completed_at IS NULL OR a.score IS NULL OR
    a.score NOT BETWEEN 0 AND 100 OR a.rubric_state<>'reviewed' OR
    a.rubric_reviewer IS NULL OR a.rubric_reviewed_at IS NULL THEN
   RETURN jsonb_build_object('ok',false,'reason','no_reviewed_completed_assessment');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_actor AND p.account_kind='member')
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor
  AND lower(f.status) IN ('restricted','suspended')) THEN
  RETURN jsonb_build_object('ok',false,'reason','ineligible_member'); END IF;
 SELECT * INTO m FROM public.gu_lab_competency_knowledge_map_v014105
 WHERE lab_id=a.lab_id AND review_state='approved' AND rubric_version=a.set_version;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','topic_mapping_not_individually_approved'); END IF;
 SELECT * INTO d FROM public.competency_definitions
 WHERE competency_code=m.competency_code AND active=true;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','competency_not_active'); END IF;
 INSERT INTO public.competency_evidence
 (user_id,competency_code,source_type,source_id,dimension,score,passed,critical_error,difficulty,weight,metadata,assessed_at)
 VALUES(p_actor,d.competency_code,'quiz','v014-assessment:'||p_attempt::text,'knowledge',
        a.score,a.score>=d.pass_score,false,a.mode,1.0,
        jsonb_build_object('evidence_kind','reviewed_conceptual_quiz',
           'knowledge_only',true,'critical_error_not_assessed',true,
           'market_history_verified',false,'lab_id',a.lab_id,
           'rubric_version',a.set_version,'mapping_reviewed_by',m.reviewed_by),
        a.completed_at)
 ON CONFLICT(user_id,competency_code,source_type,source_id,dimension) DO NOTHING;
 GET DIAGNOSTICS v_rows = ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'knowledgeRecorded',v_rows=1,
  'alreadyRecorded',v_rows=0,'competencyCode',d.competency_code,
  'scope','knowledge_only_conceptual_quiz','masteryAwarded',false);
END $$;
REVOKE ALL ON FUNCTION public.gu_v014105_sync_reviewed_knowledge(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014105_sync_reviewed_knowledge(uuid,uuid)
 TO service_role;
-- Exact-version Owner approval with transactionally linked audit logging.
-- Approval is not a blanket certification of 419 Labs; every review is explicit.
CREATE OR REPLACE FUNCTION public.gu_v014105_approve_lab_knowledge_map(
 p_actor uuid,p_lab text,p_rubric integer,p_competency text,p_confirm text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $
DECLARE r record; v_update integer;
BEGIN
 IF p_actor IS NULL OR p_lab IS NULL OR p_rubric IS NULL OR
    p_rubric<1 OR p_competency IS NULL OR
    p_confirm<>'APPROVE KNOWLEDGE ONLY' THEN
   RETURN jsonb_build_object('ok',false,'reason','explicit_owner_review_required'); END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.admin_user_roles a JOIN public.profiles p ON p.id=a.user_id
  WHERE a.user_id=p_actor AND a.role_code='OWNER'
  AND (a.expires_at IS NULL OR a.expires_at>now()) AND p.account_kind='member')
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor
  AND lower(f.status) IN ('restricted','suspended'))
 THEN RETURN jsonb_build_object('ok',false,'reason','owner_not_eligible'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.competency_definitions WHERE competency_code=p_competency AND active=true)
 THEN RETURN jsonb_build_object('ok',false,'reason','unknown_competency'); END IF;
 SELECT s.lab_id,s.version INTO r FROM public.lab_training_sets_v014 s
 WHERE s.lab_id=p_lab AND s.version=p_rubric
 AND s.review_state='reviewed' AND s.reviewed_by IS NOT NULL AND s.reviewed_at IS NOT NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','rubric_not_individually_reviewed'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_lab,140105));
 -- Once a member's genuine quiz score has been attributed to a competency,
 -- do not silently reclassify historic evidence to another skill.
 IF EXISTS(
  SELECT 1 FROM public.gu_lab_competency_knowledge_map_v014105 m
  JOIN public.competency_evidence e ON e.competency_code=m.competency_code
  WHERE m.lab_id=p_lab AND m.competency_code<>p_competency
    AND e.source_type='quiz' AND e.dimension='knowledge'
    AND e.metadata->>'lab_id'=p_lab
    AND e.metadata->>'evidence_kind'='reviewed_conceptual_quiz'
 ) THEN RETURN jsonb_build_object('ok',false,'reason','existing_evidence_requires_manual_reclassification'); END IF;
 UPDATE public.gu_lab_competency_knowledge_map_v014105
 SET competency_code=p_competency,review_state='approved',
 rubric_version=p_rubric,reviewed_by=p_actor,reviewed_at=now(),updated_at=now()
 WHERE lab_id=p_lab;
 GET DIAGNOSTICS v_update=ROW_COUNT;
 IF v_update<>1 THEN RETURN jsonb_build_object('ok',false,'reason','canonical_mapping_missing'); END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'v014105.knowledge_mapping_review','lab',p_lab,
  jsonb_build_object('rubricVersion',p_rubric,'competencyCode',p_competency,
  'evidenceScope','knowledge_only','historicalVerified',false));
 RETURN jsonb_build_object('ok',true,'labId',p_lab,'rubricVersion',p_rubric,
 'competencyCode',p_competency,'knowledgeOnly',true,'historicalVerified',false);
END $;
REVOKE ALL ON FUNCTION public.gu_v014105_approve_lab_knowledge_map(uuid,text,integer,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014105_approve_lab_knowledge_map(uuid,text,integer,text,text)
 TO service_role;


-- Recover qualifying historical attempts AFTER individual reviewed mapping approval.
-- The caller must be the authenticated user via Cloudflare's entitlement gate;
-- this RPC additionally rejects non-member/restricted profiles.
CREATE OR REPLACE FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(
 p_actor uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $
DECLARE r record; v jsonb; v_scanned integer:=0; v_added integer:=0; v_eligible integer:=0;
BEGIN
 IF p_actor IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND account_kind='member')
 OR EXISTS(SELECT 1 FROM public.admin_user_flags WHERE user_id=p_actor
 AND lower(status) IN ('restricted','suspended'))
 THEN RETURN jsonb_build_object('ok',false,'reason','ineligible_member'); END IF;
 FOR r IN SELECT a.id FROM public.lab_training_attempts_v014 a
 JOIN public.gu_lab_competency_knowledge_map_v014105 m
 ON m.lab_id=a.lab_id AND m.review_state='approved' AND m.rubric_version=a.set_version
 WHERE a.user_id=p_actor AND a.completed_at IS NOT NULL AND a.score BETWEEN 0 AND 100
 ORDER BY a.completed_at DESC,a.id DESC LIMIT 500 LOOP
  v_scanned:=v_scanned+1;
  v:=public.gu_v014105_sync_reviewed_knowledge(p_actor,r.id);
  IF coalesce((v->>'ok')::boolean,false) THEN
   v_eligible:=v_eligible+1;
   IF coalesce((v->>'knowledgeRecorded')::boolean,false) THEN
    v_added:=v_added+1; END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'attemptsInspected',v_scanned,
 'approvedEligible',v_eligible,'knowledgeRowsAdded',v_added,
 'reviewedLimit',500,'scope','knowledge_only','masteryAwarded',false);
END $;
REVOKE ALL ON FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014105_sync_member_reviewed_knowledge(uuid)
 TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
-- Expected: 419 mappings, 419 CANDIDATE, ZERO approved, ZERO fabricated
-- competency evidence. API will record only after private Owner approval
-- of BOTH exact rubric version and explicit one-skill knowledge mapping.
