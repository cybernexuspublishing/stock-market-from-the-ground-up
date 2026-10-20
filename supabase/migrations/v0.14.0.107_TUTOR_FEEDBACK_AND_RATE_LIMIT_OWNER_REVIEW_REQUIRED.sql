-- v0.14.0.107 | Existing Supabase: private Tutor feedback and abuse throttling
-- Owner review required; additive only. v102/v103/v105 are NOT reinstalled.
-- Feedback contains no provider answer keys, personal scores or public posts.
BEGIN;
ALTER TABLE public.gu_member_tutor_exchanges_v014102
 ADD COLUMN IF NOT EXISTS feedback text CHECK(feedback IN ('helpful','not_helpful','report'));
ALTER TABLE public.gu_member_tutor_exchanges_v014102
 ADD COLUMN IF NOT EXISTS feedback_note text CHECK(char_length(feedback_note)<=500);
ALTER TABLE public.gu_member_tutor_exchanges_v014102
 ADD COLUMN IF NOT EXISTS feedback_at timestamptz;
GRANT UPDATE ON public.gu_member_tutor_exchanges_v014102 TO service_role;

CREATE TABLE IF NOT EXISTS public.gu_tutor_rate_bucket_v014107 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 minute_start timestamptz NOT NULL,
 minute_count integer NOT NULL DEFAULT 0 CHECK(minute_count BETWEEN 0 AND 20),
 day_start date NOT NULL,
 day_count integer NOT NULL DEFAULT 0 CHECK(day_count BETWEEN 0 AND 200),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_tutor_rate_bucket_v014107 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_tutor_rate_bucket_v014107 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_tutor_rate_bucket_v014107 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_v014107_take_tutor_request(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v record; now_utc timestamptz:=now();
        bucket timestamptz:=date_trunc('minute',now_utc);
        utc_day date:=(now_utc AT TIME ZONE 'UTC')::date;
        m integer; d integer;
BEGIN
 IF p_user IS NULL THEN RETURN jsonb_build_object('accepted',false,'reason','invalid_user'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,140107));
 SELECT * INTO v FROM public.gu_tutor_rate_bucket_v014107 WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO public.gu_tutor_rate_bucket_v014107
   (user_id,minute_start,minute_count,day_start,day_count)
  VALUES(p_user,bucket,1,utc_day,1);
  RETURN jsonb_build_object('accepted',true,'reason','allowed');
 END IF;
 m:=CASE WHEN v.minute_start=bucket THEN v.minute_count ELSE 0 END;
 d:=CASE WHEN v.day_start=utc_day THEN v.day_count ELSE 0 END;
 IF m>=8 THEN RETURN jsonb_build_object('accepted',false,'reason','minute_limit'); END IF;
 IF d>=120 THEN RETURN jsonb_build_object('accepted',false,'reason','daily_limit'); END IF;
 UPDATE public.gu_tutor_rate_bucket_v014107
 SET minute_start=bucket,minute_count=m+1,day_start=utc_day,day_count=d+1,
 updated_at=now_utc WHERE user_id=p_user;
 RETURN jsonb_build_object('accepted',true,'reason','allowed');
END $$;
REVOKE ALL ON FUNCTION public.gu_v014107_take_tutor_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014107_take_tutor_request(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- No rate bucket records are exposed to browsers. One row/member, not event spam.
-- Only member feedback tied to an existing verified/legacy note may be updated.
-- Account deletion cascades both notes (v102) and rate bucket records.
-- Transcript retention/deletion schedule remains a separately approved policy.
