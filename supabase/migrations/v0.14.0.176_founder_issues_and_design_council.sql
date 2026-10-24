-- Founders Commons: issue lifecycle and Extended-only Design Council v0.14.0.176.
-- Modifications to issue state and ballots are server/Owner only. Members may comment via canonical Commons RPCs.
CREATE TABLE IF NOT EXISTS public.gu_founder_issues_v014176 (
 topic_id bigint PRIMARY KEY REFERENCES public.commons_topics(id) ON DELETE CASCADE,
 issue_kind text NOT NULL CHECK(issue_kind IN ('bug','suggestion')),
 issue_state text NOT NULL DEFAULT 'submitted' CHECK(issue_state IN ('submitted','under_review','accepted','in_development','released','deferred','declined')),
 staff_response text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_founder_issue_events_v014176 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 topic_id bigint NOT NULL REFERENCES public.gu_founder_issues_v014176(topic_id) ON DELETE CASCADE,
 old_state text,
 new_state text NOT NULL,
 changed_by uuid REFERENCES auth.users(id),
 changed_at timestamptz NOT NULL DEFAULT now(),
 staff_note text
);
ALTER TABLE public.gu_founder_issues_v014176 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_founder_issue_events_v014176 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_issues_v014176,public.gu_founder_issue_events_v014176 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_founder_issues_v014176,public.gu_founder_issue_events_v014176 TO authenticated;
GRANT ALL ON public.gu_founder_issues_v014176,public.gu_founder_issue_events_v014176 TO service_role;
DROP POLICY IF EXISTS f600_issue_read ON public.gu_founder_issues_v014176;
CREATE POLICY f600_issue_read ON public.gu_founder_issues_v014176 FOR SELECT TO authenticated
USING (public.gu_founder_commons_access_v014174('shared') AND EXISTS (
 SELECT 1 FROM public.commons_topics t WHERE t.id=topic_id AND t.forum_code IN ('F600_BUGS','F600_SUGGESTIONS')));
DROP POLICY IF EXISTS f600_issue_events_read ON public.gu_founder_issue_events_v014176;
CREATE POLICY f600_issue_events_read ON public.gu_founder_issue_events_v014176 FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.gu_founder_issues_v014176 i WHERE i.topic_id=gu_founder_issue_events_v014176.topic_id));
CREATE OR REPLACE FUNCTION public.gu_founder_issue_created_v014176()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fun$
BEGIN
 IF NEW.forum_code IN ('F600_BUGS','F600_SUGGESTIONS') THEN
  INSERT INTO public.gu_founder_issues_v014176(topic_id,issue_kind)
    VALUES(NEW.id,CASE WHEN NEW.forum_code='F600_BUGS' THEN 'bug' ELSE 'suggestion' END)
    ON CONFLICT(topic_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $fun$;
REVOKE ALL ON FUNCTION public.gu_founder_issue_created_v014176() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS f600_issue_created ON public.commons_topics;
CREATE TRIGGER f600_issue_created AFTER INSERT ON public.commons_topics
FOR EACH ROW EXECUTE FUNCTION public.gu_founder_issue_created_v014176();
CREATE OR REPLACE FUNCTION public.gu_founder_issue_audit_v014176()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $audit$
BEGIN
 IF TG_OP='INSERT' OR NEW.issue_state IS DISTINCT FROM OLD.issue_state
   OR NEW.staff_response IS DISTINCT FROM OLD.staff_response THEN
 INSERT INTO public.gu_founder_issue_events_v014176(topic_id,old_state,new_state,changed_by,staff_note)
 VALUES(NEW.topic_id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.issue_state END,NEW.issue_state,auth.uid(),NEW.staff_response);
 END IF;
 RETURN NEW;
END $audit$;
REVOKE ALL ON FUNCTION public.gu_founder_issue_audit_v014176() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS f600_issue_audit ON public.gu_founder_issues_v014176;
CREATE TRIGGER f600_issue_audit AFTER INSERT OR UPDATE ON public.gu_founder_issues_v014176
FOR EACH ROW EXECUTE FUNCTION public.gu_founder_issue_audit_v014176();
-- Pre-existing official starter discussions get an initial tracked Submitted state.
INSERT INTO public.gu_founder_issues_v014176(topic_id,issue_kind)
SELECT id,CASE WHEN forum_code='F600_BUGS' THEN 'bug' ELSE 'suggestion' END
FROM public.commons_topics
WHERE forum_code IN ('F600_BUGS','F600_SUGGESTIONS')
ON CONFLICT(topic_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_founder_design_ballots_v014176 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 8 AND 160),
 description text NOT NULL CHECK(length(description) BETWEEN 20 AND 2000),
 choices jsonb NOT NULL CHECK(jsonb_typeof(choices)='array' AND jsonb_array_length(choices) BETWEEN 2 AND 5),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','open','closed','archived')),
 opens_at timestamptz, closes_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(state NOT IN ('open','closed') OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at>opens_at))
);
CREATE TABLE IF NOT EXISTS public.gu_founder_design_votes_v014176 (
 ballot_id uuid NOT NULL REFERENCES public.gu_founder_design_ballots_v014176(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 choice text NOT NULL CHECK(length(choice) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(ballot_id,user_id)
);
ALTER TABLE public.gu_founder_design_ballots_v014176 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_founder_design_votes_v014176 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_design_ballots_v014176,public.gu_founder_design_votes_v014176 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_founder_design_ballots_v014176,public.gu_founder_design_votes_v014176 TO service_role;
GRANT SELECT ON public.gu_founder_design_ballots_v014176,public.gu_founder_design_votes_v014176 TO authenticated;
DROP POLICY IF EXISTS f600_ballots_read ON public.gu_founder_design_ballots_v014176;
CREATE POLICY f600_ballots_read ON public.gu_founder_design_ballots_v014176 FOR SELECT TO authenticated
USING(public.gu_founder_commons_access_v014174('council') AND state IN ('open','closed'));
DROP POLICY IF EXISTS f600_vote_read ON public.gu_founder_design_votes_v014176;
CREATE POLICY f600_vote_read ON public.gu_founder_design_votes_v014176 FOR SELECT TO authenticated
USING(user_id=(select auth.uid()) AND public.gu_founder_commons_access_v014174('council'));
CREATE OR REPLACE FUNCTION public.gu_founder_cast_design_vote_v014176(p_ballot_id uuid,p_choice text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $vote$
DECLARE uid uuid:=auth.uid(); b public.gu_founder_design_ballots_v014176%rowtype;
BEGIN
 IF NOT public.gu_founder_commons_access_v014174('council') THEN RETURN jsonb_build_object('ok',false,'error','COUNCIL_REQUIRED');END IF;
 IF p_ballot_id IS NULL OR p_choice IS NULL OR length(p_choice) NOT BETWEEN 1 AND 100
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_CHOICE'); END IF;
 SELECT * INTO b FROM public.gu_founder_design_ballots_v014176 WHERE id=p_ballot_id;
 IF NOT FOUND OR b.state<>'open' OR now()<b.opens_at OR now()>=b.closes_at
 THEN RETURN jsonb_build_object('ok',false,'error','BALLOT_CLOSED'); END IF;
 IF NOT b.choices ? p_choice THEN RETURN jsonb_build_object('ok',false,'error','INVALID_CHOICE'); END IF;
 INSERT INTO public.gu_founder_design_votes_v014176(ballot_id,user_id,choice)
 VALUES(p_ballot_id,uid,p_choice) ON CONFLICT(ballot_id,user_id) DO NOTHING;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_VOTED'); END IF;
 RETURN jsonb_build_object('ok',true,'recorded',true);
END $vote$;
REVOKE ALL ON FUNCTION public.gu_founder_cast_design_vote_v014176(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_cast_design_vote_v014176(uuid,text) TO authenticated;
