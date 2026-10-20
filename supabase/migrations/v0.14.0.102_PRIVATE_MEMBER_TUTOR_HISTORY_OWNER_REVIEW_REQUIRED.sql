-- v0.14.0.102 | OPTIONAL PERSISTENT MEMBER TUTOR TRANSCRIPTS
-- Existing Supabase project. Private ungraded teaching notes, NOT assessment evidence.
-- Owner review required before applying. No changed plans, Stripe, journal or grades.
-- This is an additive table. The browser still functions with session-only history
-- until the Owner installs this SQL. Max 200 records per member, max 5 KB each.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_member_tutor_exchanges_v014102 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 question text NOT NULL CHECK (char_length(question) BETWEEN 4 AND 450),
 learner_answer text NOT NULL DEFAULT '' CHECK (char_length(learner_answer) <= 1800),
 mode text NOT NULL CHECK (mode IN ('explain','question','review','practice')),
 answer text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 4500),
 generation text NOT NULL CHECK (char_length(generation) BETWEEN 1 AND 90),
 source_titles jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
   jsonb_typeof(source_titles)='array' AND jsonb_array_length(source_titles)<=3
 ),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_member_tutor_exchanges_v014102_user_date
 ON public.gu_member_tutor_exchanges_v014102(user_id,created_at DESC,id DESC);
ALTER TABLE public.gu_member_tutor_exchanges_v014102 ENABLE ROW LEVEL SECURITY;
-- No public/member direct access, and no cross-user read/write surface.
REVOKE ALL ON public.gu_member_tutor_exchanges_v014102 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.gu_member_tutor_exchanges_v014102 TO service_role;

-- Service role controlled write. Never accept user_id from the browser:
-- the Cloudflare API derives it from the authenticated Supabase access token.
-- Lock serialized per-user inserts to bound storage, including concurrent tabs.
CREATE OR REPLACE FUNCTION public.gu_v014102_save_member_tutor_exchange(
 p_user_id uuid,p_question text,p_learner_answer text,p_mode text,
 p_answer text,p_generation text,p_source_titles jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_count integer;
BEGIN
 IF p_user_id IS NULL OR char_length(coalesce(p_question,'')) NOT BETWEEN 4 AND 450
 OR char_length(coalesce(p_learner_answer,''))>1800
 OR p_mode NOT IN ('explain','question','review','practice')
 OR char_length(coalesce(p_answer,'')) NOT BETWEEN 1 AND 4500
 OR char_length(coalesce(p_generation,'')) NOT BETWEEN 1 AND 90
 OR jsonb_typeof(coalesce(p_source_titles,'null'::jsonb)) <> 'array'
 OR jsonb_array_length(p_source_titles)>3 THEN
   RAISE EXCEPTION 'Invalid ungraded Tutor history input' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 102));
 SELECT count(*) INTO v_count FROM public.gu_member_tutor_exchanges_v014102 WHERE user_id=p_user_id;
 IF v_count >= 200 THEN
   RAISE EXCEPTION 'Tutor history limit reached; delete saved entries before continuing'
     USING ERRCODE='P0001';
 END IF;
 INSERT INTO public.gu_member_tutor_exchanges_v014102
   (user_id,question,learner_answer,mode,answer,generation,source_titles)
 VALUES (p_user_id,p_question,coalesce(p_learner_answer,''),p_mode,p_answer,p_generation,p_source_titles)
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.gu_v014102_save_member_tutor_exchange(uuid,text,text,text,text,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014102_save_member_tutor_exchange(uuid,text,text,text,text,text,jsonb)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- No synthetic scores, no user account promotions, no paid-model quotas modified.
-- Retention: explicit member deletion; authenticated user DELETE via guarded API,
-- or auth.users cascade on account deletion. Owner should define retention policy.
