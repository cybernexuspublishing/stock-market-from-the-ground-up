-- v0.14.0.301: Lab concept retrieval, distinct from trade Journal reviews.
-- No historical attempts, grades, curriculum identifiers or billing data touched.
-- Execute only after confirming this new relation does not already exist.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lab_concept_reviews_v014') IS NOT NULL
 THEN RAISE EXCEPTION 'Lab concept reviews already installed. Verify existing schema instead of rerunning.'; END IF;
 IF to_regclass('public.platform_labs') IS NULL
 THEN RAISE EXCEPTION 'Canonical Lab registry missing'; END IF;
END $$;
CREATE TABLE public.lab_concept_reviews_v014 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 lab_id text NOT NULL,
 review_stage text NOT NULL CHECK(review_stage IN ('1D','7D','30D')),
 due_at timestamptz NOT NULL,
 recall_note text,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,lab_id,review_stage),
 CONSTRAINT lab_recall_note_limit CHECK(recall_note IS NULL OR char_length(recall_note) BETWEEN 30 AND 1500),
 CONSTRAINT lab_recall_completion_consistent CHECK((recall_note IS NULL)=(completed_at IS NULL))
);
CREATE INDEX lab_concept_reviews_due_v014 ON public.lab_concept_reviews_v014(user_id,due_at)
 WHERE completed_at IS NULL;
ALTER TABLE public.lab_concept_reviews_v014 ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_concept_review_self_read ON public.lab_concept_reviews_v014
 FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.lab_concept_reviews_v014 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.lab_concept_reviews_v014 TO authenticated;
GRANT ALL ON public.lab_concept_reviews_v014 TO service_role;
CREATE FUNCTION public.gu_lab_concept_review_schedule_v014(p_lab_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE u uuid:=auth.uid(); inserted integer:=0;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='28000';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.platform_labs
  WHERE lab_id=p_lab_id AND active=true AND registry_visible=true)
 THEN RAISE EXCEPTION 'Canonical Lab not found';END IF;
 INSERT INTO public.lab_concept_reviews_v014(user_id,lab_id,review_stage,due_at)
 VALUES(u,p_lab_id,'1D',now()+interval '1 day'),
       (u,p_lab_id,'7D',now()+interval '7 days'),
       (u,p_lab_id,'30D',now()+interval '30 days')
 ON CONFLICT(user_id,lab_id,review_stage) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 RETURN inserted;
END $fn$;
CREATE FUNCTION public.gu_lab_concept_review_complete_v014(p_lab_id text,p_stage text,p_note text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE u uuid:=auth.uid(); changed integer:=0;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='28000';END IF;
 IF p_stage NOT IN ('1D','7D','30D') OR
   p_note IS NULL OR char_length(btrim(p_note)) NOT BETWEEN 30 AND 1500
 THEN RAISE EXCEPTION 'Recall stage or written response is invalid';END IF;
 UPDATE public.lab_concept_reviews_v014 SET recall_note=btrim(p_note),completed_at=now()
 WHERE user_id=u AND lab_id=p_lab_id AND review_stage=p_stage
  AND completed_at IS NULL AND due_at<=now();
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_lab_concept_review_schedule_v014(text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_lab_concept_review_complete_v014(text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_lab_concept_review_schedule_v014(text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gu_lab_concept_review_complete_v014(text,text,text) TO authenticated,service_role;
COMMIT;
