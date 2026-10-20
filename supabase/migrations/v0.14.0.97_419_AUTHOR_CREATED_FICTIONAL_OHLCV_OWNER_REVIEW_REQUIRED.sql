-- v0.14.0.97 | FIRST-PARTY ORIGINAL FICTIONAL OHLCV | OWNER REVIEW REQUIRED.
-- Existing Supabase project ONLY. No new tables, services, Stripe plans, Lab IDs.
-- Dependency: installed v0.14.0.92, v0.14.0.94, v0.14.0.95 migrations.
-- Model: reuse market_datasets, gu_replay_bars_v01492, gu_replay_sessions,
-- v01492 atomic chronological advance, and v01494 Journal atomic completion.
-- 419 * 24 = 10,056 small private made-up bars; no historical prices imported.
-- These are CREATED by Crown & Lantern Press; NEVER claim market verification.
-- Refuse to apply if any source Lab count/status or dataset-code conflicts.
BEGIN;
DO $$
DECLARE n integer;
BEGIN
 IF to_regclass('public.platform_labs') IS NULL OR
    to_regclass('public.market_datasets') IS NULL OR
    to_regclass('public.gu_replay_bars_v01492') IS NULL OR
    to_regclass('public.gu_replay_sessions_v01492') IS NULL OR
    to_regclass('public.gu_replay_journal_links_v01494') IS NULL OR
    to_regprocedure('public.v01492_replay_advance(uuid,uuid,integer)') IS NULL OR
    to_regprocedure('public.v01494_replay_finish_to_journal(uuid,uuid)') IS NULL THEN
  RAISE EXCEPTION 'Missing existing first-party replay or Journal objects; no replacement objects are created';
 END IF;
 SELECT count(*) INTO n FROM public.platform_labs;
 IF n<>419 THEN RAISE EXCEPTION 'Canonical registry must contain 419 Labs before simulation publication, found %',n; END IF;
 IF EXISTS (
  SELECT 1 FROM public.market_datasets d
  JOIN public.platform_labs l ON d.dataset_code='GUSIM_'||replace(l.lab_id,'-','_')
  WHERE d.metadata->>'original_synthetic' IS DISTINCT FROM 'true'
 ) THEN RAISE EXCEPTION 'Dataset identifier collides with a non-fictional source; Owner review required'; END IF;
END $$;
-- Original names and conspicuous provenance distinguish made-up lessons
-- from actual tickers, actual trading sessions or redistributed exchange data.
INSERT INTO public.market_datasets(
 dataset_code,title,ticker,provider_code,dataset_type,interval_label,
 timezone,start_at,end_at,raw_adjusted,source_attribution,license_note,status,metadata
)
SELECT
 'GUSIM_'||replace(l.lab_id,'-','_'),
 left('ORIGINAL FICTIONAL SCENARIO | '||l.title,250),
 'SIMULATION',NULL,'ohlcv','5-minute (invented)','UTC',
 timestamptz '2040-01-03 14:30:00+00',
 timestamptz '2040-01-03 16:25:00+00',
 'raw',
 'Crown & Lantern Press — original computer-created teaching scenario; not an actual market event',
 'Original first-party fictional example; no external market data or license required',
 'draft',
 jsonb_build_object(
  'original_synthetic',true,
  'historical_evidence_verified',false,
  'evidence_verified',true,
  'evidence_verification_scope','Internal OHLCV arithmetic and ordered timestamps ONLY, not stock-market history',
  'licensed_for_member_display',true,
  'corporate_action_policy','Not applicable: original fictional symbols and synthetic price path',
  'source_lab_id',l.lab_id,
  'real_market_security',false,
  'educational_only',true,
  'invented_timestamp_year',2040
 )
FROM public.platform_labs l
ON CONFLICT(dataset_code) DO NOTHING;
-- Create a new set of private fictional bars for each unpopulated draft.
-- random() is evaluated during installation; frozen stored bars are later
-- reproducible and unpublished future steps cannot be queried by browser.
-- Distinct scenario trajectories contain original random variation.
WITH drafts AS MATERIALIZED (
 SELECT d.dataset_code,(abs(hashtext(d.dataset_code)::bigint)%700)::numeric AS spread_offset
 FROM public.market_datasets d
 WHERE d.status='draft' AND d.metadata->>'original_synthetic'='true'
   AND EXISTS(SELECT 1 FROM public.platform_labs l
     WHERE d.dataset_code='GUSIM_'||replace(l.lab_id,'-','_'))
),
raw AS MATERIALIZED (
 SELECT d.dataset_code,series.bar_index,
   timestamptz '2040-01-03 14:30:00+00'+series.bar_index*interval '5 minutes' AS bar_at,
   round((18+d.spread_offset/30+sin(series.bar_index::double precision/3.0)::numeric*0.8+
      (random()-0.5)::numeric*0.35),2) AS first_price,
   round((18+d.spread_offset/30+sin((series.bar_index+1)::double precision/3.0)::numeric*0.8+
      (random()-0.5)::numeric*0.35),2) AS last_price,
   (10000+floor(random()*40000))::bigint AS simulated_volume
 FROM drafts d CROSS JOIN generate_series(0,23) AS series(bar_index)
),
bar_rows AS MATERIALIZED (
 SELECT r.dataset_code,r.bar_index,r.bar_at,
   r.first_price AS open,r.last_price AS close,
   round(greatest(r.first_price,r.last_price)+0.05+(random()*0.25)::numeric,2) AS high,
   round(least(r.first_price,r.last_price)-0.05-(random()*0.25)::numeric,2) AS low,
   r.simulated_volume AS volume
 FROM raw r
)
INSERT INTO public.gu_replay_bars_v01492(
 dataset_code,bar_index,bar_at,open,high,low,close,volume)
SELECT b.dataset_code,b.bar_index,b.bar_at,b.open,b.high,b.low,b.close,b.volume
FROM bar_rows b
WHERE NOT EXISTS(
 SELECT 1 FROM public.gu_replay_bars_v01492 prev
 WHERE prev.dataset_code=b.dataset_code)
ON CONFLICT(dataset_code,bar_index) DO NOTHING;
-- Gate publication per dataset on exact complete ordered 24-bar evidence,
-- not merely on the existence of the parent catalog row.
UPDATE public.market_datasets d SET status='published',updated_at=now()
WHERE d.status='draft' AND d.metadata->>'original_synthetic'='true'
AND EXISTS(SELECT 1 FROM public.platform_labs l
 WHERE d.dataset_code='GUSIM_'||replace(l.lab_id,'-','_'))
AND (SELECT count(*) FROM public.gu_replay_bars_v01492 b
 WHERE b.dataset_code=d.dataset_code)=24
AND (SELECT min(bar_index) FROM public.gu_replay_bars_v01492 b
 WHERE b.dataset_code=d.dataset_code)=0
AND (SELECT max(bar_index) FROM public.gu_replay_bars_v01492 b
 WHERE b.dataset_code=d.dataset_code)=23
AND NOT EXISTS(
 SELECT 1 FROM (
  SELECT b.bar_index,b.bar_at,
    lag(b.bar_at) OVER (ORDER BY b.bar_index) AS prior_at
  FROM public.gu_replay_bars_v01492 b WHERE b.dataset_code=d.dataset_code
 ) timeline WHERE prior_at IS NOT NULL AND bar_at<=prior_at
);
DO $$
DECLARE published_count integer;bar_count integer;
BEGIN
 SELECT count(*) INTO published_count FROM public.market_datasets d
 JOIN public.platform_labs l ON d.dataset_code='GUSIM_'||replace(l.lab_id,'-','_')
 WHERE d.status='published' AND d.metadata->>'original_synthetic'='true';
 SELECT count(*) INTO bar_count FROM public.gu_replay_bars_v01492 b
 JOIN public.market_datasets d ON d.dataset_code=b.dataset_code
 WHERE d.status='published' AND d.metadata->>'original_synthetic'='true'
 AND d.dataset_code LIKE 'GUSIM_%';
 IF published_count<>419 OR bar_count<>10056 THEN
  RAISE EXCEPTION 'Rollback: expected 419 published ORIGINAL FICTIONAL scenarios and 10056 private bars, got % and %',published_count,bar_count;
 END IF;
END $$;
-- Replace the EXISTING finish-to-Journal function IN PLACE, do not create
-- another Journal or duplicate transaction system. Fictional records use
-- Journal type "paper", with explicit false-real-history/source labels.
CREATE OR REPLACE FUNCTION public.v01494_replay_finish_to_journal(
 p_session uuid,p_user uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $$
DECLARE
 s public.gu_replay_sessions_v01492%ROWTYPE;
 m public.market_datasets%ROWTYPE;
 b public.gu_replay_bars_v01492%ROWTYPE;
 existing_id bigint;
 new_journal_id bigint;
 canonical_ticker text;
 canonical_decision text;
 journal_status text;
 first_date date;
 direction_value text;
BEGIN
 IF p_user IS NULL OR p_session IS NULL THEN
  RAISE EXCEPTION 'Missing replay identity';
 END IF;
 -- Protect every finalization from duplicate/reordered concurrent requests.
 SELECT * INTO s FROM public.gu_replay_sessions_v01492
  WHERE id=p_session AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Replay not found for this member'; END IF;

 SELECT journal_id INTO existing_id
  FROM public.gu_replay_journal_links_v01494
  WHERE session_id=p_session AND user_id=p_user;
 IF FOUND THEN
  IF s.status <> 'finished' THEN
   RAISE EXCEPTION 'Replay/Journal consistency check failed';
  END IF;
  RETURN jsonb_build_object('journalId',existing_id,
    'barsSeen',s.current_index+1,'alreadyLinked',true);
 END IF;
 IF s.status <> 'active' OR s.expires_at<=now() OR
    NOT s.decision_locked OR s.locked_at IS NULL OR
    s.decision NOT IN ('ENTER','WATCH','NO_TRADE','OBSERVE') OR
    length(btrim(coalesce(s.reasoning,''))) NOT BETWEEN 20 AND 2000 THEN
  RAISE EXCEPTION 'Replay is not eligible for finalization';
 END IF;

 -- Hold the source row lock through the transaction so an Owner revocation
 -- and a replay finalization cannot cross without a deterministic ordering.
 SELECT * INTO m FROM public.market_datasets
  WHERE dataset_code=s.dataset_code FOR SHARE;
 IF NOT FOUND OR m.status <> 'published' OR m.dataset_type <> 'ohlcv'
  OR m.metadata->>'licensed_for_member_display' IS DISTINCT FROM 'true'
  OR m.metadata->>'evidence_verified' IS DISTINCT FROM 'true'
  OR coalesce(btrim(m.source_attribution),'')=''
  OR coalesce(btrim(m.license_note),'')=''
  OR coalesce(btrim(m.metadata->>'corporate_action_policy'),'')='' THEN
  RAISE EXCEPTION 'Historical dataset rights or verification withdrawn';
 END IF;

 SELECT * INTO b FROM public.gu_replay_bars_v01492
  WHERE dataset_code=s.dataset_code AND bar_index=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'Verified first observation not available'; END IF;
 IF s.current_index<0 OR NOT EXISTS (
  SELECT 1 FROM public.gu_replay_bars_v01492
  WHERE dataset_code=s.dataset_code AND bar_index=s.current_index
 ) THEN RAISE EXCEPTION 'Replay cursor does not reference observed evidence'; END IF;

 canonical_ticker:=upper(btrim(coalesce(m.ticker,'')));
 IF canonical_ticker !~ '^[A-Z0-9.-]{1,12}$' THEN
  RAISE EXCEPTION 'Dataset ticker requires Owner correction';
 END IF;
 first_date:=CASE WHEN m.metadata->>'original_synthetic'='true'
  THEN (s.locked_at AT TIME ZONE 'America/New_York')::date
  ELSE (b.bar_at AT TIME ZONE 'UTC')::date END;
 canonical_decision:=CASE s.decision
  WHEN 'NO_TRADE' THEN 'NO TRADE'
  WHEN 'OBSERVE' THEN 'OBSERVATION ONLY'
  ELSE s.decision END;
 journal_status:=CASE WHEN s.decision='ENTER' THEN 'planned' ELSE 'no_trade' END;
 direction_value:=CASE WHEN s.decision='ENTER' THEN
  CASE s.decision_plan->>'side' WHEN 'BUY' THEN 'LONG'
   WHEN 'SELL' THEN 'SHORT' ELSE NULL END ELSE NULL END;

 -- No actual entry/exit, fill, P&L, R-multiple, grading or skill score:
 -- OHLCV cannot prove any of them. This is a first-decision observation.
 INSERT INTO public.decision_journal(
  user_id,ticker,trade_date,journal_type,status,decision,
  direction,session_label,setup,evidence,market_context,
  plan_locked_at,share_quantity
 ) VALUES (
  p_user,canonical_ticker,first_date,
  CASE WHEN m.metadata->>'original_synthetic'='true' THEN 'paper' ELSE 'historical_lab' END,journal_status,
  canonical_decision,direction_value,CASE WHEN m.metadata->>'original_synthetic'='true' THEN 'Original fictional simulation' ELSE 'Historical replay' END,
  CASE WHEN m.metadata->>'original_synthetic'='true'
    THEN 'Original fictional replay ('||s.dataset_code||')'
    ELSE 'Verified historical replay ('||s.dataset_code||')' END',
  s.reasoning,
  CASE WHEN m.metadata->>'original_synthetic'='true'
    THEN 'ORIGINAL FICTIONAL SIMULATION. No actual stock, market event, historical price, brokerage fill or verified outcome. Invented observation at '
    ELSE 'Educational OHLCV historical replay. First bar recorded at ' END||
    (b.bar_at AT TIME ZONE 'UTC')::text||
    ' UTC. Licensed source: '||left(m.source_attribution,200)||
    '. This is not a confirmed trade.',
  s.locked_at,
  CASE WHEN s.decision='ENTER' AND s.decision_plan->>'quantity' ~ '^[0-9]{1,7}$'
   THEN (s.decision_plan->>'quantity')::numeric ELSE NULL END
 ) RETURNING id INTO new_journal_id;

 -- Existing Journal UI treats presence of a snapshot as immutable plan.
 INSERT INTO public.trade_plan_snapshots(journal_id,user_id,snapshot,locked_at)
 VALUES (new_journal_id,p_user,
  jsonb_build_object(
    'journal_type',CASE WHEN m.metadata->>'original_synthetic'='true' THEN 'paper' ELSE 'historical_lab' END,'ticker',canonical_ticker,
    'trade_date',first_date,'direction',direction_value,
    'session_label',CASE WHEN m.metadata->>'original_synthetic'='true' THEN 'Original fictional simulation' ELSE 'Historical replay' END,
    'setup',CASE WHEN m.metadata->>'original_synthetic'='true'
    THEN 'Original fictional replay ('||s.dataset_code||')'
    ELSE 'Verified historical replay ('||s.dataset_code||')' END',
    'decision',canonical_decision,'evidence',s.reasoning,
    'market_context',CASE WHEN m.metadata->>'original_synthetic'='true'
       THEN 'ORIGINAL FICTIONAL OHLCV simulation, no real feed, historical market event or fill'
       ELSE 'Educational historical OHLCV replay, not a real fill' END,
    'originalSynthetic',m.metadata->>'original_synthetic'='true',
    'replaySessionId',s.id,'datasetCode',s.dataset_code,
    'firstBarAt',b.bar_at,'firstDecisionLockedAt',s.locked_at,
    'firstDecisionReasoning',s.reasoning,
    'initialOrderAssumptions',s.decision_plan,
    'outcomeVerified',false,'graded',false),
  s.locked_at);
 INSERT INTO public.gu_replay_journal_links_v01494(
   session_id,journal_id,user_id,dataset_code
 ) VALUES(s.id,new_journal_id,p_user,s.dataset_code);
 UPDATE public.gu_replay_sessions_v01492
  SET status='finished',finished_at=now()
  WHERE id=s.id AND user_id=p_user AND status='active';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Concurrent replay finalization conflict';
 END IF;
 RETURN jsonb_build_object('journalId',new_journal_id,
  'barsSeen',s.current_index+1,'alreadyLinked',false);
END;$$;

REVOKE ALL ON FUNCTION public.v01494_replay_finish_to_journal(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v01494_replay_finish_to_journal(uuid,uuid)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Rollback requires deliberate Owner review; do not delete prior member
-- journals/sessions. Unpublish original scenarios first if necessary.
