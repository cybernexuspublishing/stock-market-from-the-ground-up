-- Add three authored Boot Camps to the existing private progress service.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.gu_bootcamp_academy_enrollments_v014168
 DROP CONSTRAINT gu_bootcamp_academy_enrollments_v014168_program_code_check;
ALTER TABLE public.gu_bootcamp_academy_enrollments_v014168
 ADD CONSTRAINT gu_bootcamp_academy_enrollments_v014168_program_code_check
 CHECK(program_code IN ('free5','truth5','watchlist7','scanners10','foundations30','charts45','risk60','practicum90','tape10','indicators10','filings7'));
ALTER TABLE public.gu_bootcamp_academy_audit_v014295
 DROP CONSTRAINT gu_bootcamp_academy_audit_v014295_program_code_check;
ALTER TABLE public.gu_bootcamp_academy_audit_v014295
 ADD CONSTRAINT gu_bootcamp_academy_audit_v014295_program_code_check
 CHECK(program_code IN ('free5','truth5','watchlist7','scanners10','foundations30','charts45','risk60','practicum90','tape10','indicators10','filings7'));CREATE OR REPLACE FUNCTION public.gu_bootcamp_academy_save_v014168(p_user uuid, p_program text, p_day integer, p_action text, p_reflection text DEFAULT NULL::text, p_expected_revision bigint DEFAULT NULL::bigint, p_version text DEFAULT '0.14.0.168'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE max_day integer;entry public.gu_bootcamp_academy_progress_v014168%ROWTYPE;
DECLARE current_rev bigint;cleaned text;is_enrolled boolean;
BEGIN
 max_day:=CASE p_program
  WHEN 'free5' THEN 5 WHEN 'truth5' THEN 5 WHEN 'watchlist7' THEN 7 WHEN 'scanners10' THEN 10
  WHEN 'tape10' THEN 10 WHEN 'indicators10' THEN 10 WHEN 'filings7' THEN 7
  WHEN 'charts45' THEN 45 WHEN 'risk60' THEN 60 WHEN 'practicum90' THEN 90
  ELSE NULL END;
 IF p_user IS NULL OR max_day IS NULL OR p_version IS DISTINCT FROM '0.14.0.168'
 OR p_action IS NULL OR p_action NOT IN ('enroll','start','save_reflection')
 OR (p_action='enroll' AND p_day IS DISTINCT FROM 0)
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
END $function$
;

COMMENT ON FUNCTION public.gu_bootcamp_academy_save_v014168(uuid,text,integer,text,text,bigint,text) IS 'Single private Academy enrollment and reflection service for ten Boot Camps and Free Foundations; no grades awarded';
COMMIT;

