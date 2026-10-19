-- Owner review required; existing Supabase project; additive model usage ledger.
-- No educational scores or private prompts are stored.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_tutor_usage_v01492(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 usage_day date NOT NULL,
 used integer NOT NULL DEFAULT 0 CHECK (used BETWEEN 0 AND 100),
 PRIMARY KEY(user_id,usage_day)
);
ALTER TABLE public.gu_tutor_usage_v01492 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_tutor_usage_v01492 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_tutor_usage_v01492 TO service_role;

CREATE OR REPLACE FUNCTION public.v01492_consume_tutor_quota(p_user uuid,p_daily_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE accepted integer;
BEGIN
 IF p_user IS NULL OR p_daily_limit NOT BETWEEN 1 AND 100 THEN RETURN false; END IF;
 INSERT INTO public.gu_tutor_usage_v01492(user_id,usage_day,used)
 VALUES(p_user,(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(user_id,usage_day) DO UPDATE
 SET used=public.gu_tutor_usage_v01492.used+1
 WHERE public.gu_tutor_usage_v01492.used<p_daily_limit
 RETURNING used INTO accepted;
 RETURN accepted IS NOT NULL;
END;$$;
REVOKE ALL ON FUNCTION public.v01492_consume_tutor_quota(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v01492_consume_tutor_quota(uuid,integer) TO service_role;
COMMIT;
-- Before configuring model credentials, Owner must verify this function cannot
-- be executed by anon/authenticated and the service role is properly isolated.
