-- v0.14.0.179 Founder issue attribution: real staff actor recorded with each update.
ALTER TABLE public.gu_founder_issues_v014176 ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);
CREATE OR REPLACE FUNCTION public.gu_founder_issue_audit_v014176()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $audit$
BEGIN
 IF TG_OP='INSERT' OR NEW.issue_state IS DISTINCT FROM OLD.issue_state
 OR NEW.staff_response IS DISTINCT FROM OLD.staff_response THEN
  INSERT INTO public.gu_founder_issue_events_v014176(topic_id,old_state,new_state,changed_by,staff_note)
  VALUES(NEW.topic_id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.issue_state END,
   NEW.issue_state,COALESCE(NEW.updated_by,auth.uid()),NEW.staff_response);
 END IF;
 RETURN NEW;
END $audit$;
REVOKE ALL ON FUNCTION public.gu_founder_issue_audit_v014176() FROM PUBLIC,anon,authenticated;