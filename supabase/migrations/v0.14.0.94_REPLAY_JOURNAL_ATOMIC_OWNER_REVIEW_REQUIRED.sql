-- v0.14.0.94 | Review required. Existing Supabase project ONLY.
-- Dependency: installed v0.6 decision_journal, v0.7 trade_plan_snapshots,
-- and v0.14.0.92 private replay objects. No data seeded or altered during
-- review. Do not install before the separate read-only dependency preflight.
-- One RPC call commits session finish, first-decision Journal snapshot, link.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gu_replay_journal_links_v01494 (
 session_id uuid PRIMARY KEY REFERENCES public.gu_replay_sessions_v01492(id) ON DELETE CASCADE,
 journal_id bigint NOT NULL UNIQUE REFERENCES public.decision_journal(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 dataset_code text NOT NULL REFERENCES public.market_datasets(dataset_code),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_replay_journal_links_user_v01494
 ON public.gu_replay_journal_links_v01494(user_id,recorded_at DESC);
ALTER TABLE public.gu_replay_journal_links_v01494 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_replay_journal_links_v01494 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_replay_journal_links_v01494 TO service_role;

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
 first_date:=(b.bar_at AT TIME ZONE 'UTC')::date;
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
  p_user,canonical_ticker,first_date,'historical_lab',journal_status,
  canonical_decision,direction_value,'Historical replay',
  'Verified historical replay ('||s.dataset_code||')',
  s.reasoning,
  'Educational OHLCV replay. First bar recorded at '||
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
    'journal_type','historical_lab','ticker',canonical_ticker,
    'trade_date',first_date,'direction',direction_value,
    'session_label','Historical replay',
    'setup','Verified historical replay ('||s.dataset_code||')',
    'decision',canonical_decision,'evidence',s.reasoning,
    'market_context','Educational OHLCV replay, not a real fill',
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
COMMIT;
-- ROLLBACK: revoke EXECUTE first, then drop this function and link table only
-- after dependency/retention review. Never delete linked journal records.
