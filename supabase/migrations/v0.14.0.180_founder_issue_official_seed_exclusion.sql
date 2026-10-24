-- v0.14.0.180 Distinguish official starter guidance from submitted member issues.
CREATE OR REPLACE FUNCTION public.gu_founder_issue_created_v014176()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fun$
BEGIN
 IF NEW.is_official IS DISTINCT FROM true AND NEW.forum_code IN ('F600_BUGS','F600_SUGGESTIONS') THEN
   INSERT INTO public.gu_founder_issues_v014176(topic_id,issue_kind)
   VALUES(NEW.id,CASE WHEN NEW.forum_code='F600_BUGS' THEN 'bug' ELSE 'suggestion' END)
   ON CONFLICT(topic_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $fun$;
REVOKE ALL ON FUNCTION public.gu_founder_issue_created_v014176() FROM PUBLIC,anon,authenticated;
-- Remove only mistakenly tracked system-authored guide topics, never real member issues.
DELETE FROM public.gu_founder_issues_v014176 i
USING public.commons_topics t
WHERE i.topic_id=t.id AND t.is_official IS TRUE
AND t.legacy_source_code LIKE 'F600_OFFICIAL_V1_%'
AND t.forum_code IN ('F600_BUGS','F600_SUGGESTIONS');