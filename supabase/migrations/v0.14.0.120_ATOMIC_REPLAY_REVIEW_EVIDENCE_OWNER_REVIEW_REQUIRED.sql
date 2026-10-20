-- v0.14.0.120 | Owner review required | existing single Supabase project.
-- Fix v119 multi-request authorization/revocation race using ONE atomic
-- Postgres service-only evidence RPC. Install AFTER v118 and v95.
-- Does not seed historical bars, grades, journal entries, products or users.
-- Dedicated readonly production diagnostics accompany this migration.
BEGIN;
DO $dep$
BEGIN
 IF to_regclass('public.gu_replay_review_locks_v014118') IS NULL OR
    to_regclass('public.gu_replay_journal_links_v01494') IS NULL OR
    to_regclass('public.gu_replay_sessions_v01492') IS NULL OR
    to_regclass('public.gu_replay_bars_v01492') IS NULL OR
    to_regclass('public.market_datasets') IS NULL OR
    to_regclass('public.journal_reviews') IS NULL OR
    to_regprocedure('public.gu_v014118_review_transaction(uuid,bigint,text,text)') IS NULL THEN
   RAISE EXCEPTION 'v120 requires installed v118 private replay and Journal lifecycle. Run read-only preflight.';
 END IF;
END $dep$;

CREATE OR REPLACE FUNCTION public.gu_v014120_replay_review_evidence(
 p_actor uuid,p_review bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $v120$
DECLARE
 stage public.journal_reviews%ROWTYPE;
 lock_note public.gu_replay_review_locks_v014118%ROWTYPE;
 link public.gu_replay_journal_links_v01494%ROWTYPE;
 session public.gu_replay_sessions_v01492%ROWTYPE;
 source public.market_datasets%ROWTYPE;
 bars jsonb;
 n integer;
 first_index integer;
 last_index integer;
 consistent boolean;
BEGIN
 IF p_actor IS NULL OR p_review IS NULL OR p_review<=0 THEN
  RAISE EXCEPTION 'Missing review owner or review ID';
 END IF;
 -- Lock stages, review decision and source in a consistent order. These
 -- locks remain held until the function's read transaction is completed.
 SELECT * INTO stage FROM public.journal_reviews
  WHERE id=p_review AND user_id=p_actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review is not owned by the requesting member'; END IF;
 SELECT * INTO lock_note FROM public.gu_replay_review_locks_v014118
  WHERE review_id=stage.id AND journal_id=stage.journal_id AND user_id=p_actor
  AND revealed_at IS NOT NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lock initial evidence and reveal before viewing later observations'; END IF;
 SELECT * INTO link FROM public.gu_replay_journal_links_v01494
  WHERE journal_id=stage.journal_id AND user_id=p_actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Linked replay owner or Journal evidence mismatched'; END IF;
 SELECT * INTO session FROM public.gu_replay_sessions_v01492
  WHERE id=link.session_id AND user_id=p_actor
   AND dataset_code=link.dataset_code AND status='finished'
   AND decision_locked=true AND locked_at IS NOT NULL FOR SHARE;
 IF NOT FOUND OR session.current_index<0 THEN
  RAISE EXCEPTION 'No completed authenticated replay source'; END IF;
 -- Holding the dataset row lock prevents revocation or unpublish from
 -- interleaving with bar selection. The v95 published-bar guard also shares
 -- this row lock and therefore blocks changing published observations.
 SELECT * INTO source FROM public.market_datasets
  WHERE dataset_code=session.dataset_code FOR SHARE;
 IF NOT FOUND OR source.status<>'published' OR source.dataset_type<>'ohlcv'
    OR source.metadata->>'licensed_for_member_display' IS DISTINCT FROM 'true'
    OR source.metadata->>'evidence_verified' IS DISTINCT FROM 'true'
    OR coalesce(btrim(source.source_attribution),'')='' OR
    coalesce(btrim(source.license_note),'')='' OR
    coalesce(btrim(source.metadata->>'corporate_action_policy'),'')='' THEN
  RAISE EXCEPTION 'Verified publication and educational display rights must remain active';
 END IF;

 -- The client never supplies a bar index or dataset code. The server-owned
 -- cursor is the ONLY upper bound. Window is 40 already-observed bars.
 WITH bounded AS (
  SELECT b.bar_index,b.bar_at,b.open,b.high,b.low,b.close,b.volume
  FROM public.gu_replay_bars_v01492 b
  WHERE b.dataset_code=session.dataset_code
    AND b.bar_index<=session.current_index
  ORDER BY b.bar_index DESC LIMIT 40
 ), ordered AS (
  SELECT *,lag(bar_index) OVER(ORDER BY bar_index) AS previous_index,
    lag(bar_at) OVER(ORDER BY bar_index) AS previous_at
  FROM bounded
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'index',bar_index,'timestamp',bar_at,
   'open',open,'high',high,'low',low,'close',close,'volume',volume
  ) ORDER BY bar_index),'[]'::jsonb),count(*)::int,
  min(bar_index),max(bar_index),
  coalesce(bool_and(
   bar_index>=0 AND open>0 AND high>0 AND low>0 AND close>0 AND
   volume>=0 AND high>=GREATEST(open,close) AND
   low<=LEAST(open,close) AND high>=low AND
   (previous_index IS NULL OR
      (bar_index=previous_index+1 AND bar_at>previous_at))
  ),false)
 INTO bars,n,first_index,last_index,consistent FROM ordered;
 IF NOT consistent OR n NOT BETWEEN 1 AND 40 OR
   last_index IS DISTINCT FROM session.current_index OR
   first_index<0 THEN
  RAISE EXCEPTION 'Replay observations are incomplete, invalid or nonchronological';
 END IF;
 RETURN jsonb_build_object(
  'ok',true,'reviewId',stage.id,'sessionId',session.id,
  'observedThroughIndex',session.current_index,'hasEarlierBars',first_index>0,
  'observations',bars,
  'originalSynthetic',(source.metadata->>'original_synthetic')='true',
  'sourceAttribution',left(source.source_attribution,300)
 );
END $v120$;
REVOKE ALL ON FUNCTION public.gu_v014120_replay_review_evidence(uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014120_replay_review_evidence(uuid,bigint)
 TO service_role;
COMMENT ON FUNCTION public.gu_v014120_replay_review_evidence(uuid,bigint) IS
 'v120: atomic owner-authenticated Journal review evidence read; rights/locks and 40 server-bounded already-seen OHLCV observations; no future/grade/PnL.';
NOTIFY pgrst,'reload schema';
COMMIT;
