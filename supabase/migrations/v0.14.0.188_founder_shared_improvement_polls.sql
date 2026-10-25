-- v0.14.0.188 — One-person-one-vote community improvement polls for both founding tiers.
-- Separate from Extended-only Design Council ballots; no equity or corporate voting rights.
CREATE TABLE IF NOT EXISTS public.gu_founder_improvement_polls_v014188(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 8 AND 160),
 description text NOT NULL CHECK(length(description) BETWEEN 20 AND 2000),
 choices jsonb NOT NULL CHECK(jsonb_typeof(choices)='array' AND jsonb_array_length(choices) BETWEEN 2 AND 5),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','open','closed','archived')),
 opens_at timestamptz,closes_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(state NOT IN ('open','closed') OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at>opens_at))
);
CREATE TABLE IF NOT EXISTS public.gu_founder_improvement_votes_v014188(
 poll_id uuid NOT NULL REFERENCES public.gu_founder_improvement_polls_v014188(id),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 choice text NOT NULL CHECK(length(choice) BETWEEN 1 AND 100),
 voted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(poll_id,user_id)
);
ALTER TABLE public.gu_founder_improvement_polls_v014188 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_founder_improvement_votes_v014188 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_improvement_polls_v014188,public.gu_founder_improvement_votes_v014188 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_founder_improvement_polls_v014188,public.gu_founder_improvement_votes_v014188 TO service_role;
GRANT SELECT ON public.gu_founder_improvement_polls_v014188,public.gu_founder_improvement_votes_v014188 TO authenticated;
DROP POLICY IF EXISTS founder_improvement_polls_read_v014188 ON public.gu_founder_improvement_polls_v014188;
CREATE POLICY founder_improvement_polls_read_v014188 ON public.gu_founder_improvement_polls_v014188
FOR SELECT TO authenticated USING(public.gu_founder_commons_access_v014174('shared') AND state IN ('open','closed'));
DROP POLICY IF EXISTS founder_improvement_own_vote_v014188 ON public.gu_founder_improvement_votes_v014188;
CREATE POLICY founder_improvement_own_vote_v014188 ON public.gu_founder_improvement_votes_v014188
FOR SELECT TO authenticated USING(user_id=(select auth.uid()) AND public.gu_founder_commons_access_v014174('shared'));
CREATE OR REPLACE FUNCTION public.gu_founder_improvement_vote_v014188(p_poll_id uuid,p_choice text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $vote$
DECLARE uid uuid:=auth.uid();p public.gu_founder_improvement_polls_v014188%rowtype;
BEGIN
 IF uid IS NULL OR NOT public.gu_founder_commons_access_v014174('shared')
 THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_ACCESS_REQUIRED');END IF;
 IF p_poll_id IS NULL OR p_choice IS NULL OR length(p_choice) NOT BETWEEN 1 AND 100
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_CHOICE');END IF;
 SELECT * INTO p FROM public.gu_founder_improvement_polls_v014188 WHERE id=p_poll_id;
 IF NOT FOUND OR p.state<>'open' OR now()<p.opens_at OR now()>=p.closes_at
 THEN RETURN jsonb_build_object('ok',false,'error','POLL_CLOSED');END IF;
 IF NOT p.choices ? p_choice THEN RETURN jsonb_build_object('ok',false,'error','INVALID_CHOICE');END IF;
 INSERT INTO public.gu_founder_improvement_votes_v014188(poll_id,user_id,choice)
 VALUES(p_poll_id,uid,p_choice) ON CONFLICT(poll_id,user_id) DO NOTHING;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_VOTED');END IF;
 RETURN jsonb_build_object('ok',true,'recorded',true);
END $vote$;
REVOKE ALL ON FUNCTION public.gu_founder_improvement_vote_v014188(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_improvement_vote_v014188(uuid,text) TO authenticated;
