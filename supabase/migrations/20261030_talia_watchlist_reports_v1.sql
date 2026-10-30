-- SMFGU: Talia Watchlist Research Reports V1
-- Private educational attempts and transactionally updated summary.
-- Not an official competency record, historical market claim, or paid product.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_talia_watchlist_checkpoints_v1 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_id uuid NOT NULL,
 topic_id text NOT NULL,
 research_action text NOT NULL,
 dimension text NOT NULL,
 answer text NOT NULL,
 misconception text NOT NULL DEFAULT 'NONE',
 fictional_case text NOT NULL,
 revealed_bars smallint NOT NULL,
 symbol text NULL,
 member_observed_at timestamptz NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,event_id),
 CONSTRAINT talia_topic_v1 CHECK (topic_id IN (
 'building','sector','pricevolume','rvol','company','catalyst','structure','trends',
 'candles','vwap','averages','indicators','levels','breakout','failure','thesis','risk','spread',
 'compare','reject','maintenance','hindsight','macd','rsi','bollinger','patterns','shorts')),
 CONSTRAINT talia_action_v1 CHECK(research_action IN
 ('Observe','Explain','Investigate','Interpret','Challenge','Plan','Practice','Review')),
 CONSTRAINT talia_dimension_v1 CHECK(
  dimension=CASE research_action
   WHEN 'Observe' THEN 'Recognition' WHEN 'Explain' THEN 'Knowledge'
   WHEN 'Investigate' THEN 'Process' WHEN 'Interpret' THEN 'Recognition'
   WHEN 'Challenge' THEN 'Decision' WHEN 'Plan' THEN 'Decision'
   WHEN 'Practice' THEN 'Decision' WHEN 'Review' THEN 'Process' ELSE '' END),
 CONSTRAINT talia_answer_v1 CHECK (char_length(answer) BETWEEN 25 AND 1400),
 CONSTRAINT talia_misconception_v1 CHECK(misconception IN
 ('NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY',
  'LIQUIDITY_RISK','NO_INVALIDATION','OTHER')),
 CONSTRAINT talia_case_v1 CHECK(fictional_case IN ('trend','range','failure')),
 CONSTRAINT talia_cutoff_v1 CHECK(revealed_bars BETWEEN 12 AND 48),
 CONSTRAINT talia_symbol_v1 CHECK(symbol IS NULL OR symbol ~ '^[A-Z][A-Z0-9.-]{0,11}$'),
 CONSTRAINT talia_member_time_v1 CHECK(member_observed_at IS NULL OR member_observed_at <= created_at + interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS gu_talia_watchlist_cp_history_idx
 ON public.gu_talia_watchlist_checkpoints_v1(user_id, created_at DESC, event_id DESC);
CREATE TABLE IF NOT EXISTS public.gu_talia_watchlist_reports_v1 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 total_attempts bigint NOT NULL DEFAULT 0 CHECK(total_attempts>=0),
 dimension_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
 misconception_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
 topic_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
 first_saved_at timestamptz NOT NULL DEFAULT now(),
 last_saved_at timestamptz NOT NULL DEFAULT now(),
 latest_topic text NOT NULL DEFAULT '',
 latest_action text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(),
 data_status text NOT NULL DEFAULT 'MEMBER_REPORTED_UNGRADED' CHECK(data_status='MEMBER_REPORTED_UNGRADED')
);
ALTER TABLE public.gu_talia_watchlist_checkpoints_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_talia_watchlist_reports_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_talia_watchlist_checkpoints_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_talia_watchlist_reports_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_talia_watchlist_checkpoints_v1 TO authenticated;
GRANT SELECT ON public.gu_talia_watchlist_reports_v1 TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.gu_talia_watchlist_checkpoints_v1 TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_talia_watchlist_reports_v1 TO service_role;
DROP POLICY IF EXISTS talia_checkpoint_member_read_v1 ON public.gu_talia_watchlist_checkpoints_v1;
CREATE POLICY talia_checkpoint_member_read_v1 ON public.gu_talia_watchlist_checkpoints_v1
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS talia_report_member_read_v1 ON public.gu_talia_watchlist_reports_v1;
CREATE POLICY talia_report_member_read_v1 ON public.gu_talia_watchlist_reports_v1
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.gu_talia_watchlist_rollup_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $talia$
BEGIN
 INSERT INTO public.gu_talia_watchlist_reports_v1 AS r
  (user_id,total_attempts,dimension_counts,misconception_counts,topic_counts,
   first_saved_at,last_saved_at,latest_topic,latest_action,updated_at)
 VALUES
  (NEW.user_id,1,jsonb_build_object(NEW.dimension,1),
   CASE WHEN NEW.misconception='NONE' THEN '{}'::jsonb
    ELSE jsonb_build_object(NEW.misconception,1) END,
   jsonb_build_object(NEW.topic_id,1),
   NEW.created_at,NEW.created_at,NEW.topic_id,NEW.research_action,now())
 ON CONFLICT(user_id) DO UPDATE
 SET total_attempts=r.total_attempts+1,
 dimension_counts=jsonb_set(r.dimension_counts, ARRAY[NEW.dimension],
  to_jsonb(COALESCE((r.dimension_counts->>NEW.dimension)::bigint,0)+1),true),
 misconception_counts=CASE WHEN NEW.misconception='NONE' THEN r.misconception_counts
  ELSE jsonb_set(r.misconception_counts,ARRAY[NEW.misconception],
   to_jsonb(COALESCE((r.misconception_counts->>NEW.misconception)::bigint,0)+1),true) END,
 topic_counts=jsonb_set(r.topic_counts,ARRAY[NEW.topic_id],
  to_jsonb(COALESCE((r.topic_counts->>NEW.topic_id)::bigint,0)+1),true),
 last_saved_at=NEW.created_at,latest_topic=NEW.topic_id,latest_action=NEW.research_action,updated_at=now();
 RETURN NEW;
END;
$talia$;
REVOKE ALL ON FUNCTION public.gu_talia_watchlist_rollup_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_talia_watchlist_rollup_v1 ON public.gu_talia_watchlist_checkpoints_v1;
CREATE TRIGGER gu_talia_watchlist_rollup_v1
 AFTER INSERT ON public.gu_talia_watchlist_checkpoints_v1
 FOR EACH ROW EXECUTE FUNCTION public.gu_talia_watchlist_rollup_v1();

-- Server-only transactional delete clears both notes and summary.
CREATE OR REPLACE FUNCTION public.gu_talia_watchlist_clear_v1(p_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $clear$
DECLARE n integer;
BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
 DELETE FROM public.gu_talia_watchlist_checkpoints_v1 WHERE user_id=p_user;
 GET DIAGNOSTICS n=ROW_COUNT;
 DELETE FROM public.gu_talia_watchlist_reports_v1 WHERE user_id=p_user;
 RETURN n;
END;
$clear$;
REVOKE ALL ON FUNCTION public.gu_talia_watchlist_clear_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_talia_watchlist_clear_v1(uuid) TO service_role;
COMMIT;