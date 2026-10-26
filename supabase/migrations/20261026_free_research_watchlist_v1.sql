-- 20261026_free_research_watchlist_v1
-- Original research-watchlist feature for eligible member accounts. No trades,
-- broker credentials, speculative price data, unverified market history, or mastery.
-- Service-role-only via a JWT-verifying Cloudflare API; never expose direct grants
-- to anon/authenticated. Quota/cross-tab insertion serialized by advisory lock.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $gate$ BEGIN
 IF to_regclass('public.gu_free_research_watchlist_v1') IS NOT NULL
 OR to_regclass('public.gu_free_research_watchlist_events_v1') IS NOT NULL
 THEN RAISE EXCEPTION 'FREE_WATCHLIST_EXISTING_SCHEMA_DRIFT';END IF;
END $gate$;
CREATE TABLE public.gu_free_research_watchlist_v1 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 symbol text NOT NULL CHECK(symbol~'^[A-Z][A-Z0-9.\\-]{0,11}$'),
 status text NOT NULL DEFAULT 'RESEARCH' CHECK(status IN('RESEARCH','WAITING_FOR_SOURCE','NO_TRADE','ARCHIVED')),
 source_kind text NOT NULL DEFAULT 'UNVERIFIED' CHECK(source_kind IN('UNVERIFIED','USER_RESEARCH','FICTIONAL')),
 research_note text NOT NULL CHECK(char_length(research_note) BETWEEN 30 AND 600),
 source_note text NOT NULL DEFAULT '' CHECK(char_length(source_note)<=400),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,symbol)
);
CREATE INDEX gu_free_watchlist_recent_v1 ON public.gu_free_research_watchlist_v1(user_id,updated_at DESC);
ALTER TABLE public.gu_free_research_watchlist_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_free_research_watchlist_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_free_research_watchlist_v1 TO service_role;
CREATE TABLE public.gu_free_research_watchlist_events_v1(
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 symbol text NOT NULL,
 action text NOT NULL CHECK(action IN('ADD','UPDATE','REMOVE')),
 old_status text,
 new_status text,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gu_free_watchlist_events_owner_v1 ON public.gu_free_research_watchlist_events_v1(user_id,occurred_at DESC);
ALTER TABLE public.gu_free_research_watchlist_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_free_research_watchlist_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_free_research_watchlist_events_v1 TO service_role;
REVOKE ALL ON SEQUENCE public.gu_free_research_watchlist_events_v1_event_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.gu_free_research_watchlist_events_v1_event_id_seq TO service_role;
CREATE FUNCTION public.gu_free_watchlist_limit_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='pg_catalog','pg_temp'
AS $body$
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('free_watchlist:'||NEW.user_id::text,0));
  IF (SELECT count(*) FROM public.gu_free_research_watchlist_v1 WHERE user_id=NEW.user_id)>=20
  THEN RAISE EXCEPTION 'FREE_WATCHLIST_MAX_20_ENTRIES';END IF;
 ELSE
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.symbol IS DISTINCT FROM OLD.symbol
  THEN RAISE EXCEPTION 'FREE_WATCHLIST_IDENTITY_IMMUTABLE';END IF;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $body$;
CREATE FUNCTION public.gu_free_watchlist_audit_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='pg_catalog','pg_temp'
AS $body$
BEGIN
 INSERT INTO public.gu_free_research_watchlist_events_v1(user_id,symbol,action,old_status,new_status)
 VALUES(CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END,
  CASE WHEN TG_OP='DELETE' THEN OLD.symbol ELSE NEW.symbol END,
  CASE WHEN TG_OP='INSERT' THEN 'ADD' WHEN TG_OP='DELETE' THEN 'REMOVE' ELSE 'UPDATE' END,
  CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,
  CASE WHEN TG_OP='DELETE' THEN NULL ELSE NEW.status END);
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;
 RETURN NEW;
END $body$;
REVOKE ALL ON FUNCTION public.gu_free_watchlist_limit_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_free_watchlist_audit_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_free_watchlist_limit_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_free_watchlist_audit_v1() TO service_role;
CREATE TRIGGER gu_free_watchlist_limit_before_v1 BEFORE INSERT OR UPDATE
 ON public.gu_free_research_watchlist_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_free_watchlist_limit_v1();
CREATE TRIGGER gu_free_watchlist_audit_after_v1 AFTER INSERT OR UPDATE OR DELETE
 ON public.gu_free_research_watchlist_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_free_watchlist_audit_v1();
COMMIT;
