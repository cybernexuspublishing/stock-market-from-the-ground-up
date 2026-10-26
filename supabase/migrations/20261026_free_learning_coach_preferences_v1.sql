-- 20261026_free_learning_coach_preferences_v1
-- Non-destructive, independent *preferences*; Academy free5 remains the ONLY study-progress ledger.
-- No existing user records, grants, grades, payments or replay positions modified.
BEGIN;
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s';
DO $pre$ BEGIN
 IF to_regclass('public.gu_free_learning_preferences_v1') IS NOT NULL OR
    to_regclass('public.gu_free_learning_preference_events_v1') IS NOT NULL
 THEN RAISE EXCEPTION 'FREE_COACH_V1_ALREADY_INSTALLED'; END IF;
END $pre$;
CREATE TABLE public.gu_free_learning_preferences_v1(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 focus text NOT NULL DEFAULT 'START_BASICS' CHECK(focus IN
 ('START_BASICS','CANDLES','VERIFY_SOURCES','WATCHLIST','RISK')),
 session_minutes smallint NOT NULL DEFAULT 10 CHECK(session_minutes IN(5,10,15,20)),
 experience text NOT NULL DEFAULT 'NEW' CHECK(experience IN('NEW','SOME_BASICS','RETURNING')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_free_learning_preferences_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_free_learning_preferences_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_free_learning_preferences_v1 TO service_role;
CREATE TABLE public.gu_free_learning_preference_events_v1(
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK(event_type IN ('created','updated')),
 previous_revision integer,
 new_revision integer NOT NULL CHECK(new_revision>0),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_free_learning_preference_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_free_learning_preference_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_free_learning_preference_events_v1 TO service_role;
REVOKE ALL ON SEQUENCE public.gu_free_learning_preference_events_v1_event_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.gu_free_learning_preference_events_v1_event_id_seq TO service_role;
CREATE FUNCTION public.gu_free_learning_preferences_audit_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='pg_catalog','pg_temp'
AS $fn$ BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.revision<>OLD.revision+1 THEN
    RAISE EXCEPTION 'FREE_LEARNING_PREFERENCE_OWNER_OR_REVISION_INVALID';
  END IF;
  NEW.updated_at=now();
 END IF;
 INSERT INTO public.gu_free_learning_preference_events_v1(user_id,event_type,previous_revision,new_revision)
 VALUES(NEW.user_id,CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'updated' END,
  CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.revision END,NEW.revision);
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_free_learning_preferences_audit_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_free_learning_preferences_audit_v1() TO service_role;
CREATE TRIGGER gu_free_learning_preferences_event_v1
BEFORE INSERT OR UPDATE ON public.gu_free_learning_preferences_v1
FOR EACH ROW EXECUTE FUNCTION public.gu_free_learning_preferences_audit_v1();
COMMIT;
