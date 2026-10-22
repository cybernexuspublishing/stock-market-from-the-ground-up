-- Deployment 09 completion supplement: Owner editorial decisions and anonymous topic-gap tally.
-- ADDITIVE ONLY, run after v102 and v149 base. No existing table is reset.
-- Owner must execute in existing Supabase SQL Editor after source is tested.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_tutor_editorial_cases_v014149 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 exchange_id uuid NOT NULL UNIQUE REFERENCES public.gu_member_tutor_exchanges_v014102(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'open'
   CHECK (status IN ('open','investigating','resolved','dismissed')),
 resolution text NULL CHECK (resolution IN
   ('source_corrected','instruction_clarified','not_reproducible','out_of_scope')),
 last_reviewer uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status NOT IN ('resolved','dismissed') OR resolution IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.gu_tutor_editorial_audit_v014149 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES public.gu_tutor_editorial_cases_v014149(id) ON DELETE CASCADE,
 actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
 from_status text NULL,
 to_status text NOT NULL,
 resolution text NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_tutor_editorial_audit_case_v014149
 ON public.gu_tutor_editorial_audit_v014149(case_id,changed_at DESC);
CREATE TABLE IF NOT EXISTS public.gu_tutor_topic_gaps_v014149 (
 topic text NOT NULL CHECK(topic IN (
 'vwap','ema','volume','liquidity','spread','tape','risk','mfe','mae',
 'structure','breakout','bootcamp','journal','other')),
 day_utc date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
 requests integer NOT NULL DEFAULT 0 CHECK(requests BETWEEN 0 AND 1000000),
 last_seen timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(topic,day_utc)
);
ALTER TABLE public.gu_tutor_editorial_cases_v014149 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_tutor_editorial_audit_v014149 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_tutor_topic_gaps_v014149 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_tutor_editorial_cases_v014149 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_tutor_editorial_audit_v014149 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_tutor_topic_gaps_v014149 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_tutor_editorial_cases_v014149 TO service_role;
GRANT SELECT,INSERT ON public.gu_tutor_editorial_audit_v014149 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_tutor_editorial_audit_v014149_id_seq TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.gu_tutor_topic_gaps_v014149 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_v014149_review_tutor_case(
 p_actor uuid,p_exchange uuid,p_status text,p_resolution text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path=public,pg_temp AS $$
DECLARE c public.gu_tutor_editorial_cases_v014149%ROWTYPE;
BEGIN
 IF p_actor IS NULL OR p_exchange IS NULL
 OR p_status NOT IN ('open','investigating','resolved','dismissed')
 OR (p_status IN ('resolved','dismissed') AND
   (p_resolution IS NULL OR p_resolution NOT IN
    ('source_corrected','instruction_clarified','not_reproducible','out_of_scope')))
 OR (p_status IN ('open','investigating') AND p_resolution IS NOT NULL)
 THEN RAISE EXCEPTION 'Invalid review event' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_exchange::text,1493));
 IF NOT EXISTS(SELECT 1 FROM public.gu_member_tutor_exchanges_v014102
     WHERE id=p_exchange AND feedback='report')
 THEN RETURN jsonb_build_object('ok',false,'reason','report_not_found'); END IF;
 SELECT * INTO c FROM public.gu_tutor_editorial_cases_v014149
 WHERE exchange_id=p_exchange FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO public.gu_tutor_editorial_cases_v014149
   (exchange_id,status,resolution,last_reviewer)
  VALUES(p_exchange,p_status,p_resolution,p_actor) RETURNING * INTO c;
  INSERT INTO public.gu_tutor_editorial_audit_v014149
   (case_id,actor_id,from_status,to_status,resolution)
  VALUES(c.id,p_actor,NULL,p_status,p_resolution);
 ELSE
  IF c.status=p_status AND c.resolution IS NOT DISTINCT FROM p_resolution
  THEN RETURN jsonb_build_object('ok',true,'case_id',c.id,'unchanged',true); END IF;
  INSERT INTO public.gu_tutor_editorial_audit_v014149
   (case_id,actor_id,from_status,to_status,resolution)
  VALUES(c.id,p_actor,c.status,p_status,p_resolution);
  UPDATE public.gu_tutor_editorial_cases_v014149
  SET status=p_status,resolution=p_resolution,last_reviewer=p_actor,updated_at=now()
  WHERE id=c.id;
 END IF;
 RETURN jsonb_build_object('ok',true,'case_id',c.id,'unchanged',false);
END $$;
REVOKE ALL ON FUNCTION public.gu_v014149_review_tutor_case(uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_review_tutor_case(uuid,uuid,text,text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_v014149_record_tutor_gap(p_topic text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_topic NOT IN ('vwap','ema','volume','liquidity','spread','tape','risk',
 'mfe','mae','structure','breakout','bootcamp','journal','other')
 THEN RAISE EXCEPTION 'Unknown gap tag' USING ERRCODE='22023'; END IF;
 INSERT INTO public.gu_tutor_topic_gaps_v014149(topic,day_utc,requests,last_seen)
 VALUES(p_topic,(now() AT TIME ZONE 'UTC')::date,1,now())
 ON CONFLICT(topic,day_utc) DO UPDATE
 SET requests=LEAST(1000000,public.gu_tutor_topic_gaps_v014149.requests+1),
     last_seen=excluded.last_seen;
END $$;
REVOKE ALL ON FUNCTION public.gu_v014149_record_tutor_gap(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_record_tutor_gap(text)
 TO service_role;
-- Complete verified member privacy deletion in a single Supabase transaction.
-- Cloudflare authenticates the user before invoking this service-role-only RPC.
CREATE OR REPLACE FUNCTION public.gu_v014149_delete_tutor_member_data(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $
DECLARE n_exchanges integer; n_conversations integer;
BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'Invalid account' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,1496));
 DELETE FROM public.gu_member_tutor_exchanges_v014102 WHERE user_id=p_user;
 GET DIAGNOSTICS n_exchanges = ROW_COUNT;
 DELETE FROM public.gu_member_tutor_conversations_v014149 WHERE user_id=p_user;
 GET DIAGNOSTICS n_conversations = ROW_COUNT;
 RETURN jsonb_build_object('exchanges_deleted',n_exchanges,
  'conversations_deleted',n_conversations);
END $;
REVOKE ALL ON FUNCTION public.gu_v014149_delete_tutor_member_data(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_delete_tutor_member_data(uuid)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- No raw member prompt, username, IP, portfolio, textbook text, private answer,
-- exchange body or model output copied into these audit/gap tables.
-- Requires v107 feedback columns; do not execute before v107 is installed.
