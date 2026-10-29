-- Optimistic, versioned Owner price approval for fixed-term Lumen-only offers.
BEGIN;
ALTER TABLE public.gu_lumen_tool_offers_v1
 ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS updated_by uuid;
CREATE TABLE IF NOT EXISTS public.gu_lumen_tool_offer_audit_v1(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 offer_code text NOT NULL,
 changed_by uuid,
 previous jsonb NOT NULL,
 next jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_lumen_tool_offer_audit_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_tool_offer_audit_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_lumen_tool_offer_audit_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_lumen_tool_offer_audit_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $body$
BEGIN
 INSERT INTO public.gu_lumen_tool_offer_audit_v1(offer_code,changed_by,previous,next)
 VALUES(NEW.offer_code,NEW.updated_by,to_jsonb(OLD),to_jsonb(NEW));
 RETURN NEW;
END $body$;
DROP TRIGGER IF EXISTS gu_lumen_offer_audit_update_v1 ON public.gu_lumen_tool_offers_v1;
CREATE TRIGGER gu_lumen_offer_audit_update_v1
 AFTER UPDATE ON public.gu_lumen_tool_offers_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_lumen_tool_offer_audit_trigger_v1();
REVOKE ALL ON FUNCTION public.gu_lumen_tool_offer_audit_trigger_v1() FROM PUBLIC,anon,authenticated;
COMMIT;