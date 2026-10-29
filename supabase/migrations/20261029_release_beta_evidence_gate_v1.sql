-- A product is not beta or sellable merely because the Owner edits a stage.
-- Every applicable gate must contain independently documented evidence.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_release_acceptance_gate_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path='pg_catalog','pg_temp' AS $fn$
DECLARE k text;value text;proof jsonb;
BEGIN
 IF NEW.phase IN ('beta_testing','retail_review','retail_accepted') THEN
  FOREACH k IN ARRAY NEW.required_gates LOOP
   value:=NEW.gates->>k;
   proof:=NEW.verified_evidence->k;
   IF value NOT IN ('passed','verified_not_applicable') OR value IS NULL
     OR jsonb_typeof(proof) IS DISTINCT FROM 'object'
     OR length(btrim(coalesce(proof->>'source_ref','')))<8
     OR length(btrim(coalesce(proof->>'checked_at','')))<10 THEN
    RAISE EXCEPTION 'Evidence missing for release gate % of %',k,NEW.code
      USING ERRCODE='23514';
   END IF;
  END LOOP;
 END IF;
 IF NEW.phase='retail_accepted' AND NEW.accepted_at IS NULL
  THEN RAISE EXCEPTION 'Retail acceptance timestamp required';END IF;
 IF OLD.phase='retail_accepted' AND NEW.phase<>'retail_accepted'
  THEN RAISE EXCEPTION 'Accepted release cannot be silently un-archived; open a new version';END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gu_release_acceptance_gate_check_v1 ON public.gu_release_acceptance_v1;
CREATE TRIGGER gu_release_acceptance_gate_check_v1
 BEFORE UPDATE ON public.gu_release_acceptance_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_release_acceptance_gate_v1();
REVOKE ALL ON FUNCTION public.gu_release_acceptance_gate_v1() FROM PUBLIC,anon,authenticated;
COMMIT;