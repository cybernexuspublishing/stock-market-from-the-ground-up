-- v0.14.0.92 | Review required, EXISTING Supabase project, additive ONLY.
-- No historical data is fabricated, licensed, inserted or published here.
-- This is the private durable foundation for verified licensed OHLCV replay.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_replay_bars_v01492 (
 dataset_code text NOT NULL REFERENCES public.market_datasets(dataset_code),
 bar_index integer NOT NULL CHECK(bar_index>=0),
 bar_at timestamptz NOT NULL,
 open numeric(20,8) NOT NULL CHECK(open>0),
 high numeric(20,8) NOT NULL CHECK(high>0),
 low numeric(20,8) NOT NULL CHECK(low>0),
 close numeric(20,8) NOT NULL CHECK(close>0),
 volume bigint NOT NULL CHECK(volume>=0),
 PRIMARY KEY(dataset_code,bar_index),
 UNIQUE(dataset_code,bar_at),
 CHECK(high>=GREATEST(open,close) AND low<=LEAST(open,close) AND high>=low)
);
CREATE TABLE IF NOT EXISTS public.gu_replay_sessions_v01492 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 dataset_code text NOT NULL REFERENCES public.market_datasets(dataset_code),
 current_index integer NOT NULL DEFAULT 0 CHECK(current_index>=0),
 decision_locked boolean NOT NULL DEFAULT false,
 decision text CHECK(decision IN ('ENTER','WATCH','NO_TRADE','OBSERVE')),
 reasoning text,
 decision_plan jsonb,
 locked_at timestamptz,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '24 hours'),
 finished_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS gu_replay_one_active_v01492
 ON public.gu_replay_sessions_v01492(user_id,dataset_code) WHERE status='active';
CREATE INDEX IF NOT EXISTS gu_replay_session_owner_v01492
 ON public.gu_replay_sessions_v01492(user_id,created_at DESC);
ALTER TABLE public.gu_replay_bars_v01492 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_replay_sessions_v01492 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_replay_bars_v01492,public.gu_replay_sessions_v01492 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_replay_bars_v01492 TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.gu_replay_sessions_v01492 TO service_role;

-- Atomic cursor advance. A repeated/concurrent advance with stale expected
-- index returns -1, so no duplicate bar is presented as a fresh observation.
CREATE OR REPLACE FUNCTION public.v01492_replay_advance(
 p_session uuid,p_user uuid,p_expected_index integer
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE next_index integer;
BEGIN
 UPDATE public.gu_replay_sessions_v01492 s SET current_index=current_index+1
 WHERE s.id=p_session AND s.user_id=p_user AND s.status='active'
   AND s.decision_locked=true AND s.expires_at>now()
   AND s.current_index=p_expected_index
   AND EXISTS(
      SELECT 1 FROM public.gu_replay_bars_v01492 b
      WHERE b.dataset_code=s.dataset_code AND b.bar_index=s.current_index+1
   )
 RETURNING current_index INTO next_index;
 RETURN coalesce(next_index,-1);
END;$$;
REVOKE ALL ON FUNCTION public.v01492_replay_advance(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v01492_replay_advance(uuid,uuid,integer) TO service_role;
COMMIT;
-- Owner must verify grants and roles and never manually seed future-looking
-- charts or missing market data. Data verification/license is a separate gate.
