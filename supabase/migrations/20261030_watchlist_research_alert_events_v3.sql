-- Watchlist V3: persisted member-only IN-APP research review events.
-- Events are based exclusively on explicitly supplied member observations,
-- not an implied live quote, price feed, trading signal, or scheduled service.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_watchlist_alert_events_v3 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES public.tool_workspace_records(id) ON DELETE CASCADE,
  rule_index smallint NOT NULL CHECK (rule_index BETWEEN 0 AND 9),
  observation_at timestamptz NOT NULL,
  price numeric NOT NULL CHECK (price>0 AND price<10000000),
  rule_kind text NOT NULL CHECK (rule_kind IN('ABOVE_REFERENCE','BELOW_REFERENCE','INSIDE_RANGE','OUTSIDE_RANGE')),
  source_note text NOT NULL CHECK (char_length(source_note) BETWEEN 8 AND 180),
  kind text NOT NULL DEFAULT 'MANUAL_RESEARCH_REVIEW' CHECK (kind='MANUAL_RESEARCH_REVIEW'),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,candidate_id,rule_index,observation_at)
);
CREATE INDEX IF NOT EXISTS gu_watchlist_alert_events_v3_owner_idx
 ON public.gu_watchlist_alert_events_v3(user_id,created_at DESC);
ALTER TABLE public.gu_watchlist_alert_events_v3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_watchlist_alert_events_v3 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_watchlist_alert_events_v3 TO service_role;
COMMIT;