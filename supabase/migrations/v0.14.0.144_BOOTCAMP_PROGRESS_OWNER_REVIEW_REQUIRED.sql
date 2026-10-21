-- v0.14.0.144 | OWNER REVIEW REQUIRED | add private member bootcamp reflection record.
-- PRECHECK: one existing Supabase project, auth.users and 30-day source in
-- GitHub v0.14.0.144. DO NOT rerun unrelated v0.14.0.97 fictional-data SQL.
-- There is no graded Lab progress, competency certification, new SKU or trade fill.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_bootcamp_progress_v014144 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 day_number smallint NOT NULL CHECK(day_number BETWEEN 1 AND 30),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
 status text NOT NULL DEFAULT 'in_progress'
    CHECK(status IN ('in_progress','reflection_saved')),
 reflection text CHECK(reflection IS NULL OR char_length(reflection) BETWEEN 80 AND 2000),
 started_at timestamptz NOT NULL DEFAULT now(),
 first_reflected_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,day_number),
 CHECK((status='reflection_saved' AND reflection IS NOT NULL AND first_reflected_at IS NOT NULL)
       OR (status='in_progress' AND reflection IS NULL AND first_reflected_at IS NULL))
);
ALTER TABLE public.gu_bootcamp_progress_v014144 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_bootcamp_progress_v014144 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_bootcamp_progress_v014144 TO service_role;
-- Restricted authenticated users cannot forge a different member's progress,
-- fabricate completed Lab grades, or call the mutation RPC.
CREATE OR REPLACE FUNCTION public.gu_bootcamp_save_progress_v014144(
 p_user uuid,p_day integer,p_action text,p_reflection text DEFAULT NULL,p_expected_revision bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r public.gu_bootcamp_progress_v014144%ROWTYPE;
DECLARE cleaned text;
DECLARE current_revision bigint;
DECLARE expected_revision bigint;
BEGIN
 IF p_user IS NULL OR p_day IS NULL OR p_day NOT BETWEEN 1 AND 30 OR
    p_action NOT IN ('start','save_reflection') THEN
   RAISE EXCEPTION 'Invalid bootcamp day or action';
 END IF;
 cleaned := btrim(coalesce(p_reflection,''));
 IF p_action='save_reflection' AND (char_length(cleaned)<80 OR char_length(cleaned)>2000) THEN
   RAISE EXCEPTION 'Reflection must contain 80–2000 characters';
 END IF;
 IF p_action='save_reflection' THEN
   IF p_expected_revision IS NULL OR p_expected_revision<0 THEN
      RAISE EXCEPTION 'A known revision is required for an editable daily reflection';
   END IF;
   SELECT revision INTO current_revision
   FROM public.gu_bootcamp_progress_v014144 WHERE user_id=p_user AND day_number=p_day FOR UPDATE;
   expected_revision:=coalesce(current_revision,0);
   IF expected_revision<>p_expected_revision THEN
     RETURN jsonb_build_object('conflict',true,'actualRevision',expected_revision);
   END IF;
 END IF;
 IF p_action='start' THEN
   INSERT INTO public.gu_bootcamp_progress_v014144(user_id,day_number)
   VALUES(p_user,p_day)
   ON CONFLICT(user_id,day_number) DO NOTHING;
 ELSE
   INSERT INTO public.gu_bootcamp_progress_v014144(
    user_id,day_number,status,reflection,first_reflected_at
   ) VALUES(p_user,p_day,'reflection_saved',cleaned,now())
   ON CONFLICT(user_id,day_number) DO UPDATE SET
     status='reflection_saved',
     reflection=EXCLUDED.reflection,
     first_reflected_at=coalesce(
       gu_bootcamp_progress_v014144.first_reflected_at,EXCLUDED.first_reflected_at),
     updated_at=now(),
     revision=gu_bootcamp_progress_v014144.revision+1
   WHERE gu_bootcamp_progress_v014144.revision=p_expected_revision
   RETURNING * INTO r;
   IF NOT FOUND THEN
     RETURN jsonb_build_object('conflict',true,'actualRevision',NULL);
   END IF;
 END IF;
 SELECT * INTO STRICT r FROM public.gu_bootcamp_progress_v014144
  WHERE user_id=p_user AND day_number=p_day;
 RETURN jsonb_build_object('day',r.day_number,'revision',r.revision,'status',r.status,
  'reflection',r.reflection,'startedAt',r.started_at,
  'firstReflectedAt',r.first_reflected_at,'updatedAt',r.updated_at,
  'graded',false,'competencyMasteryAwarded',false,'marketOutcomeClaimed',false);
END $$;
REVOKE ALL ON FUNCTION public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text,bigint)
 TO service_role;
COMMENT ON FUNCTION public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text,bigint)
 IS 'Original 30-day learning path: private member-owned, self-reported reflections, NOT assessment mastery or a brokerage result.';
NOTIFY pgrst,'reload schema';
COMMIT;
