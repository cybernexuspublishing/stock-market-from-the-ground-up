-- v0.14.0.95 | Harden the EXISTING replay engine. Owner review required.
-- INSTALLATION: Existing Supabase project, AFTER v0.14.0.94 succeeds.
-- Preserves market_datasets, gu_replay_*, all journals, Labs and Stripe.
-- No new tables, data inserts, synthetic market data, lab grades or paid SKUs.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.market_datasets') IS NULL OR
    to_regclass('public.gu_replay_bars_v01492') IS NULL OR
    to_regclass('public.gu_replay_sessions_v01492') IS NULL OR
    to_regclass('public.gu_replay_journal_links_v01494') IS NULL OR
    to_regclass('public.trade_plan_snapshots') IS NULL OR
    to_regclass('public.decision_journal') IS NULL THEN
  RAISE EXCEPTION 'Missing pre-existing replay/journal object. Run dependency preflight; do not recreate an existing system.';
 END IF;
END $$;
-- Refuse server-only changes to price observations while they are published.
-- An Owner must unpublish a dataset first, which also revokes active replay
-- rights, then correct/revalidate its source evidence, and republish.
CREATE OR REPLACE FUNCTION public.v01495_guard_published_replay_bars()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $$
DECLARE old_status text; new_status text;
BEGIN
 IF TG_OP <> 'INSERT' THEN
  SELECT status INTO old_status FROM public.market_datasets
   WHERE dataset_code=OLD.dataset_code FOR SHARE;
  IF old_status='published' THEN
   RAISE EXCEPTION 'Published historical replay observations are immutable; unpublish before an Owner-authorized correction';
  END IF;
 END IF;
 IF TG_OP <> 'DELETE' THEN
  SELECT status INTO new_status FROM public.market_datasets
   WHERE dataset_code=NEW.dataset_code FOR SHARE;
  IF new_status='published' THEN
   RAISE EXCEPTION 'Published historical replay observations are immutable; unpublish before an Owner-authorized correction';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS gu_replay_published_immutability_v01495
 ON public.gu_replay_bars_v01492;
CREATE TRIGGER gu_replay_published_immutability_v01495
 BEFORE INSERT OR UPDATE OR DELETE ON public.gu_replay_bars_v01492
 FOR EACH ROW EXECUTE FUNCTION public.v01495_guard_published_replay_bars();
REVOKE ALL ON FUNCTION public.v01495_guard_published_replay_bars()
 FROM PUBLIC,anon,authenticated;

-- Upgrade the EXISTING v01492 RPC in place. No replacement session engine.
-- Row locks serialize concurrent replay requests; dataset lock serializes
-- revocation; each next observation MUST be later than the current one.
CREATE OR REPLACE FUNCTION public.v01492_replay_advance(
 p_session uuid,p_user uuid,p_expected_index integer
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $$
DECLARE
 s public.gu_replay_sessions_v01492%ROWTYPE;
 d public.market_datasets%ROWTYPE;
 current_at timestamptz;
 next_at timestamptz;
 next_index integer;
BEGIN
 IF p_session IS NULL OR p_user IS NULL OR p_expected_index IS NULL
    OR p_expected_index<0 THEN RETURN -1; END IF;
 SELECT * INTO s FROM public.gu_replay_sessions_v01492
  WHERE id=p_session AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR s.status<>'active' OR s.expires_at<=now() OR
   s.decision_locked IS DISTINCT FROM true OR
   s.current_index<>p_expected_index THEN RETURN -1; END IF;
 SELECT * INTO d FROM public.market_datasets
  WHERE dataset_code=s.dataset_code FOR SHARE;
 IF NOT FOUND OR d.status<>'published' OR d.dataset_type<>'ohlcv'
  OR d.metadata->>'licensed_for_member_display' IS DISTINCT FROM 'true'
  OR d.metadata->>'evidence_verified' IS DISTINCT FROM 'true'
  OR coalesce(btrim(d.source_attribution),'')=''
  OR coalesce(btrim(d.license_note),'')=''
  OR coalesce(btrim(d.metadata->>'corporate_action_policy'),'')='' THEN
  RETURN -1;
 END IF;
 SELECT bar_at INTO current_at FROM public.gu_replay_bars_v01492
  WHERE dataset_code=s.dataset_code AND bar_index=s.current_index;
 SELECT bar_at INTO next_at FROM public.gu_replay_bars_v01492
  WHERE dataset_code=s.dataset_code AND bar_index=s.current_index+1;
 IF current_at IS NULL OR next_at IS NULL OR next_at<=current_at THEN
  RETURN -1;
 END IF;
 UPDATE public.gu_replay_sessions_v01492
  SET current_index=current_index+1 WHERE id=s.id AND user_id=p_user
  AND status='active' AND current_index=p_expected_index
  RETURNING current_index INTO next_index;
 RETURN coalesce(next_index,-1);
END; $$;
REVOKE ALL ON FUNCTION public.v01492_replay_advance(uuid,uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v01492_replay_advance(uuid,uuid,integer)
 TO service_role;
COMMENT ON FUNCTION public.v01492_replay_advance(uuid,uuid,integer)
 IS 'v0.14.0.95: owner-scoped forward replay, strictly monotonic verified licensed bar timestamps, atomic cursor and concurrent revocation lock.';
NOTIFY pgrst,'reload schema';
COMMIT;
-- Reversible via CREATE OR REPLACE with the original v0.14.0.92 function.
-- A deliberate rollback must consider whether published observations have been
-- modified after withdrawal of this guard. No market data is deleted here.
