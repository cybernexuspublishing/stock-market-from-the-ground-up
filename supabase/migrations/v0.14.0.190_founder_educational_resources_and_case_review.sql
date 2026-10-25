-- v0.14.0.190 Founder-reviewed teaching releases and case-study submission queue.
-- Shared existing 30 competencies and 419 Labs; no new mastery, market data, or execution.
CREATE TABLE IF NOT EXISTS public.gu_founder_educational_releases_v014190(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK(slug~'^[a-z0-9-]{8,90}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 10 AND 160),
 category text NOT NULL CHECK(category IN ('early_teaching','challenge','case_study')),
 audience text NOT NULL CHECK(audience IN ('shared','council')),
 body text NOT NULL CHECK(length(body) BETWEEN 60 AND 8000),
 competency_code text REFERENCES public.competency_definitions(competency_code),
 review_state text NOT NULL DEFAULT 'draft' CHECK(review_state IN ('draft','approved','withdrawn')),
 rights_cleared boolean NOT NULL DEFAULT false,
 available_from timestamptz,
 reviewed_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(review_state<>'approved' OR (rights_cleared AND reviewed_by IS NOT NULL AND available_from IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.gu_founder_case_submissions_v014190(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 12 AND 160),
 scenario text NOT NULL CHECK(length(scenario) BETWEEN 100 AND 2500),
 review_state text NOT NULL DEFAULT 'submitted'
 CHECK(review_state IN ('submitted','under_review','accepted','declined','withdrawn')),
 opted_in_attribution boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz, reviewer_id uuid REFERENCES auth.users(id),
 staff_reply text,
 CHECK(review_state NOT IN ('accepted','declined') OR reviewer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gu_founder_case_by_user_v014190
 ON public.gu_founder_case_submissions_v014190(user_id,created_at DESC);
ALTER TABLE public.gu_founder_educational_releases_v014190 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_founder_case_submissions_v014190 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_educational_releases_v014190,public.gu_founder_case_submissions_v014190 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_founder_educational_releases_v014190,public.gu_founder_case_submissions_v014190 TO authenticated;
GRANT ALL ON public.gu_founder_educational_releases_v014190,public.gu_founder_case_submissions_v014190 TO service_role;
DROP POLICY IF EXISTS gu_founder_teaching_view_v014190 ON public.gu_founder_educational_releases_v014190;
CREATE POLICY gu_founder_teaching_view_v014190 ON public.gu_founder_educational_releases_v014190
 FOR SELECT TO authenticated USING(
 review_state='approved' AND rights_cleared AND available_from<=now()
 AND public.gu_founder_commons_access_v014174(audience)
);
DROP POLICY IF EXISTS gu_founder_case_my_submissions_v014190 ON public.gu_founder_case_submissions_v014190;
CREATE POLICY gu_founder_case_my_submissions_v014190 ON public.gu_founder_case_submissions_v014190
 FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
CREATE OR REPLACE FUNCTION public.gu_founder_submit_case_v014190(
 p_title text,p_scenario text,p_allow_attribution boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $case$
DECLARE uid uuid:=auth.uid();last_date timestamptz;new_id uuid;
BEGIN
 IF uid IS NULL OR NOT public.gu_founder_commons_access_v014174('council')
 THEN RETURN jsonb_build_object('ok',false,'error','EXTENDED_REQUIRED');END IF;
 IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 12 AND 160
 OR p_scenario IS NULL OR length(btrim(p_scenario)) NOT BETWEEN 100 AND 2500
 OR p_allow_attribution IS NULL OR p_title~'[[:cntrl:]]'
 OR p_scenario~'[[:cntrl:]]' OR p_scenario~* '(password|api[_ -]?key|credit card number|security code|cvv)'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_CONTENT');END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text),20261024);
 SELECT max(created_at) INTO last_date
 FROM public.gu_founder_case_submissions_v014190 WHERE user_id=uid
 AND review_state<>'withdrawn';
 IF last_date>now()-interval '60 days'
 THEN RETURN jsonb_build_object('ok',false,'error','ONE_PER_60_DAYS');END IF;
 INSERT INTO public.gu_founder_case_submissions_v014190(user_id,title,scenario,opted_in_attribution)
 VALUES(uid,btrim(p_title),btrim(p_scenario),p_allow_attribution)
 RETURNING id INTO new_id;
 RETURN jsonb_build_object('ok',true,'id',new_id,'state','submitted');
END $case$;
REVOKE ALL ON FUNCTION public.gu_founder_submit_case_v014190(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_submit_case_v014190(text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.gu_founder_withdraw_case_v014190(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $withdraw$
BEGIN
 UPDATE public.gu_founder_case_submissions_v014190 SET review_state='withdrawn',
 scenario='Withdrawn by member; content no longer available for editorial use.',
 opted_in_attribution=false
 WHERE id=p_id AND user_id=auth.uid()
 AND review_state IN ('submitted','under_review');
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_WITHDRAWABLE');END IF;
 RETURN jsonb_build_object('ok',true,'withdrawn',true);
END $withdraw$;
REVOKE ALL ON FUNCTION public.gu_founder_withdraw_case_v014190(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_withdraw_case_v014190(uuid) TO authenticated;
