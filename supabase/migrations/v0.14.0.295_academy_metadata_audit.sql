-- v0.14.0.295_academy_metadata_audit
-- First-party Academy audit metadata, NOT a second progress source.
-- New successful enrollment/progress writes append an event in the SAME transaction.
-- Never store student reflection text, private lessons, exam questions, market data
-- or protected answer keys in this service-only table.
-- No existing member rows, grants, Founding plan data or LIVE payments are changed.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $pre$ BEGIN
 IF to_regclass('public.gu_bootcamp_academy_enrollments_v014168') IS NULL OR
    to_regclass('public.gu_bootcamp_academy_progress_v014168') IS NULL OR
    to_regclass('public.gu_bootcamp_academy_audit_v014295') IS NOT NULL
 THEN RAISE EXCEPTION 'V014295_EXPECTED_ACADEMY_SCHEMA_CHANGED';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname='gu_bootcamp_academy_save_v014168'
  AND pronamespace='public'::regnamespace)
 THEN RAISE EXCEPTION 'V014295_AUTHORITATIVE_SAVE_RPC_MISSING';END IF;
END $pre$;
CREATE TABLE public.gu_bootcamp_academy_audit_v014295 (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 program_code text NOT NULL CHECK (program_code IN
  ('truth5','watchlist7','scanners10','charts45','risk60','practicum90')),
 day_number smallint,
 event_kind text NOT NULL CHECK (event_kind IN
  ('enrollment_created','enrollment_updated','day_started','reflection_saved','reflection_updated','progress_updated')),
 revision_before bigint,
 revision_after bigint,
 old_status text,
 new_status text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gu_v014295_day_consistency CHECK(
  (event_kind IN('enrollment_created','enrollment_updated') AND day_number IS NULL AND revision_before IS NULL AND revision_after IS NULL)
  OR (event_kind NOT IN('enrollment_created','enrollment_updated') AND day_number BETWEEN 1 AND 90 AND revision_after>=1))
);
CREATE INDEX gu_v014295_member_audit_time ON public.gu_bootcamp_academy_audit_v014295
  (member_id,occurred_at DESC,event_id DESC);
ALTER TABLE public.gu_bootcamp_academy_audit_v014295 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gu_bootcamp_academy_audit_v014295 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.gu_bootcamp_academy_audit_v014295 TO service_role;
REVOKE ALL ON SEQUENCE public.gu_bootcamp_academy_audit_v014295_event_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.gu_bootcamp_academy_audit_v014295_event_id_seq TO service_role;

CREATE FUNCTION public.gu_v014295_academy_event()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path='pg_catalog','pg_temp'
AS $body$
DECLARE kind text;
BEGIN
 IF TG_TABLE_NAME='gu_bootcamp_academy_enrollments_v014168' THEN
  kind:=CASE WHEN TG_OP='INSERT' THEN 'enrollment_created' ELSE 'enrollment_updated' END;
  INSERT INTO public.gu_bootcamp_academy_audit_v014295
   (member_id,program_code,event_kind,old_status,new_status)
  VALUES(NEW.user_id,NEW.program_code,kind,
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status);
 ELSIF TG_TABLE_NAME='gu_bootcamp_academy_progress_v014168' THEN
  kind:=CASE
   WHEN TG_OP='INSERT' AND NEW.status='in_progress' THEN 'day_started'
   WHEN TG_OP='INSERT' AND NEW.status='reflection_saved' THEN 'reflection_saved'
   WHEN TG_OP='UPDATE' AND NEW.status='reflection_saved' AND NEW.revision>OLD.revision THEN 'reflection_updated'
   ELSE 'progress_updated' END;
  INSERT INTO public.gu_bootcamp_academy_audit_v014295
   (member_id,program_code,day_number,event_kind,revision_before,revision_after,old_status,new_status)
  VALUES(NEW.user_id,NEW.program_code,NEW.day_number,kind,
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.revision END,NEW.revision,
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status);
 ELSE
  RAISE EXCEPTION 'V014295_UNEXPECTED_SOURCE_RELATION';
 END IF;
 RETURN NEW;
END
$body$;
REVOKE ALL ON FUNCTION public.gu_v014295_academy_event() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014295_academy_event() TO service_role;
CREATE TRIGGER gu_v014295_enrollment_audit
AFTER INSERT OR UPDATE ON public.gu_bootcamp_academy_enrollments_v014168
FOR EACH ROW EXECUTE FUNCTION public.gu_v014295_academy_event();
CREATE TRIGGER gu_v014295_progress_audit
AFTER INSERT OR UPDATE ON public.gu_bootcamp_academy_progress_v014168
FOR EACH ROW EXECUTE FUNCTION public.gu_v014295_academy_event();
COMMIT;
