-- ADDITIVE COMPATIBILITY: site-lab.html and lab-player.html share one
-- site_lab_progress row, with different namespaces in responses JSONB.
-- A stale legacy full upsert must not erase or regress a newer v3.3 checkpoint.
-- No old member records are rewritten; existing official grades are untouched.
CREATE OR REPLACE FUNCTION public.gu_v33_preserve_checkpoint_on_legacy_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $guard$
DECLARE
 old_rev bigint := 0;
 new_rev bigint := -1;
 old_raw text;
 new_raw text;
BEGIN
 IF TG_OP<>'UPDATE' OR
    jsonb_typeof(OLD.responses) IS DISTINCT FROM 'object' OR
    NOT (OLD.responses ? 'learning_journey_v33') THEN
  RETURN NEW;
 END IF;
 IF jsonb_typeof(NEW.responses) IS DISTINCT FROM 'object' THEN
  NEW.responses='{}'::jsonb;
 END IF;
 old_raw:=OLD.responses->'learning_journey_v33'->>'rev';
 new_raw:=NEW.responses->'learning_journey_v33'->>'rev';
 IF coalesce(old_raw,'') ~ '^[0-9]{1,12}$' THEN old_rev:=old_raw::bigint; END IF;
 IF coalesce(new_raw,'') ~ '^[0-9]{1,12}$' THEN new_rev:=new_raw::bigint; END IF;
 IF new_rev<=old_rev THEN
  NEW.responses=jsonb_set(
   NEW.responses,'{learning_journey_v33}',OLD.responses->'learning_journey_v33',true
  );
 END IF;
 RETURN NEW;
END;
$guard$;
DROP TRIGGER IF EXISTS gu_v33_preserve_checkpoint_legacy ON public.site_lab_progress;
CREATE TRIGGER gu_v33_preserve_checkpoint_legacy
BEFORE UPDATE OF responses ON public.site_lab_progress
FOR EACH ROW
EXECUTE FUNCTION public.gu_v33_preserve_checkpoint_on_legacy_update();
COMMENT ON FUNCTION public.gu_v33_preserve_checkpoint_on_legacy_update() IS
 'Preserves newer ungraded v3.3 checkpoint against legacy Site Lab response upserts.';
REVOKE ALL ON FUNCTION public.gu_v33_preserve_checkpoint_on_legacy_update()
 FROM PUBLIC,anon,authenticated;
