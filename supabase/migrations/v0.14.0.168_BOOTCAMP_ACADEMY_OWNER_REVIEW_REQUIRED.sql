-- v0.14.0.168 | OWNER REVIEW REQUIRED | additive Academy progress.
-- Does not touch the existing thirty-day curriculum, gu_bootcamp_progress_v014144,
-- Crownlight Sparks or financial/Stripe records. No automatic official grading.
-- Back up database, review roles and execute ONCE in intended Supabase project.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_bootcamp_academy_enrollments_v014168(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 program_code text NOT NULL CHECK(program_code IN(
  'truth5','watchlist7','scanners10','charts45','risk60','practicum90')),
 program_version text NOT NULL DEFAULT '0.14.0.168' CHECK(program_version='0.14.0.168'),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','withdrawn')),
 enrolled_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,program_code)
);
CREATE TABLE IF NOT EXISTS public.gu_bootcamp_academy_progress_v014168(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 program_code text NOT NULL,
 day_number smallint NOT NULL CHECK(day_number BETWEEN 1 AND 90),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
 status text NOT NULL DEFAULT 'in_progress'
  CHECK(status IN ('in_progress','reflection_saved')),
 reflection text CHECK(reflection IS NULL OR char_length(reflection) BETWEEN 80 AND 2000),
 started_at timestamptz NOT NULL DEFAULT now(),
 first_reflected_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,program_code,day_number),
 FOREIGN KEY(user_id,program_code) REFERENCES
 public.gu_bootcamp_academy_enrollments_v014168(user_id,program_code) ON DELETE CASCADE,
 CHECK((status='reflection_saved' AND reflection IS NOT NULL AND first_reflected_at IS NOT NULL)
 OR (status='in_progress' AND reflection IS NULL AND first_reflected_at IS NULL))
);
CREATE INDEX IF NOT EXISTS gu_academy_progress_lookup_v014168
 ON public.gu_bootcamp_academy_progress_v014168(user_id,program_code,day_number);
ALTER TABLE public.gu_bootcamp_academy_enrollments_v014168 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_bootcamp_academy_progress_v014168 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_bootcamp_academy_enrollments_v014168 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_bootcamp_academy_progress_v014168 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_bootcamp_academy_enrollments_v014168 TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.gu_bootcamp_academy_progress_v014168 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_bootcamp_academy_save_v014168(
 p_user uuid,p_program text,p_day integer,p_action text,
 p_reflection text DEFAULT NULL,p_expected_revision bigint DEFAULT NULL,
 p_version text DEFAULT '0.14.0.168'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE max_day integer;entry public.gu_bootcamp_academy_progress_v014168%ROWTYPE;
DECLARE current_rev bigint;cleaned text;is_enrolled boolean;
BEGIN
 max_day:=CASE p_program
  WHEN 'truth5' THEN 5 WHEN 'watchlist7' THEN 7 WHEN 'scanners10' THEN 10
  WHEN 'charts45' THEN 45 WHEN 'risk60' THEN 60 WHEN 'practicum90' THEN 90
  ELSE NULL END;
 IF p_user IS NULL OR max_day IS NULL OR p_version<>'0.14.0.168'
 OR p_action NOT IN ('enroll','start','save_reflection')
 OR (p_action='enroll' AND p_day<>0)
 OR (p_action<>'enroll' AND (p_day IS NULL OR p_day NOT BETWEEN 1 AND max_day))
 THEN RAISE EXCEPTION 'Unknown Academy program, curriculum revision, day, or action';
 END IF;
 -- Serialize the FIRST write too: optimistically checking the revision without
 -- this lock can lose a race between two simultaneous absent-row inserts.
 PERFORM pg_advisory_xact_lock(hashtextextended(
  p_user::text||':'||p_program||':'||coalesce(p_day,0)::text,0));
 IF p_action='enroll' THEN
  INSERT INTO public.gu_bootcamp_academy_enrollments_v014168(user_id,program_code)
   VALUES(p_user,p_program)
  ON CONFLICT(user_id,program_code) DO UPDATE SET
   status='active',updated_at=now();
  RETURN jsonb_build_object('ok',true,'program',p_program,'enrollment','active',
   'graded',false,'competencyMasteryAwarded',false);
 END IF;
 SELECT status='active' INTO is_enrolled
 FROM public.gu_bootcamp_academy_enrollments_v014168
 WHERE user_id=p_user AND program_code=p_program FOR UPDATE;
 IF coalesce(is_enrolled,false)=false THEN
  RAISE EXCEPTION 'Active Academy enrollment required';
 END IF;
 cleaned:=btrim(coalesce(p_reflection,''));
 IF p_action='save_reflection' AND (char_length(cleaned)<80 OR char_length(cleaned)>2000
 OR p_expected_revision IS NULL OR p_expected_revision<0)
 THEN RAISE EXCEPTION 'A reflection of 80–2000 characters and a known revision are required';
 END IF;
 SELECT revision INTO current_rev FROM public.gu_bootcamp_academy_progress_v014168
 WHERE user_id=p_user AND program_code=p_program AND day_number=p_day FOR UPDATE;
 IF p_action='save_reflection' AND coalesce(current_rev,0)<>p_expected_revision THEN
  RETURN jsonb_build_object('conflict',true,'actualRevision',coalesce(current_rev,0));
 END IF;
 IF p_action='start' THEN
  INSERT INTO public.gu_bootcamp_academy_progress_v014168(user_id,program_code,day_number)
  VALUES(p_user,p_program,p_day)
  ON CONFLICT(user_id,program_code,day_number) DO NOTHING;
 ELSE
  INSERT INTO public.gu_bootcamp_academy_progress_v014168(
   user_id,program_code,day_number,status,reflection,first_reflected_at)
  VALUES(p_user,p_program,p_day,'reflection_saved',cleaned,now())
  ON CONFLICT(user_id,program_code,day_number) DO UPDATE SET
   status='reflection_saved',reflection=EXCLUDED.reflection,
   first_reflected_at=coalesce(gu_bootcamp_academy_progress_v014168.first_reflected_at,
    EXCLUDED.first_reflected_at),updated_at=now(),
   revision=gu_bootcamp_academy_progress_v014168.revision+1
  WHERE gu_bootcamp_academy_progress_v014168.revision=p_expected_revision
  RETURNING * INTO entry;
  IF NOT FOUND THEN RETURN jsonb_build_object('conflict',true,'actualRevision',NULL);END IF;
 END IF;
 SELECT * INTO STRICT entry FROM public.gu_bootcamp_academy_progress_v014168
 WHERE user_id=p_user AND program_code=p_program AND day_number=p_day;
 RETURN jsonb_build_object('program',entry.program_code,'day',entry.day_number,
  'revision',entry.revision,'status',entry.status,'reflection',entry.reflection,
  'startedAt',entry.started_at,'firstReflectedAt',entry.first_reflected_at,
  'updatedAt',entry.updated_at,'graded',false,'competencyMasteryAwarded',false,
  'marketOutcomeClaimed',false);
END $$;
REVOKE ALL ON FUNCTION public.gu_bootcamp_academy_save_v014168(uuid,text,integer,text,text,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_bootcamp_academy_save_v014168(uuid,text,integer,text,text,bigint,text)
 TO service_role;
COMMENT ON FUNCTION public.gu_bootcamp_academy_save_v014168(uuid,text,integer,text,text,bigint,text)
 IS 'Version-pinned, authenticated API-only Academy study/reflection progress; no self-reported grade or competency mastery.';
NOTIFY pgrst,'reload schema';
COMMIT;
