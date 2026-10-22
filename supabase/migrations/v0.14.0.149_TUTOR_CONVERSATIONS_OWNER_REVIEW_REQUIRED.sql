-- v0.14.0.149 — MEMBER MARKET TUTOR CONVERSATIONS — OWNER REVIEW REQUIRED
-- SOURCE ARTIFACT ONLY. NOT APPLIED. Inspect the actual existing v102/v103/v107
-- production schema before execution; never replay the original migrations.
-- Additive extension of the v102 authoritative private Tutor exchange table.
-- No member access without server-validated identity, no public data, no grades.
BEGIN;

-- The canonical v102 history table is a required precondition.
DO $guard$
BEGIN
 IF to_regclass('public.gu_member_tutor_exchanges_v014102') IS NULL
 THEN RAISE EXCEPTION 'Install/verify v102 private Tutor history first';
 END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.gu_tutor_conversations_v014149 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 title text NOT NULL CHECK(char_length(title) BETWEEN 3 AND 90),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id,request_id),
 UNIQUE (user_id,id)
);
CREATE INDEX IF NOT EXISTS gu_tutor_conversations_v014149_user_recent
 ON public.gu_tutor_conversations_v014149(user_id,updated_at DESC,id DESC);
ALTER TABLE public.gu_tutor_conversations_v014149 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_tutor_conversations_v014149 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_tutor_conversations_v014149 TO service_role;

ALTER TABLE public.gu_member_tutor_exchanges_v014102
 ADD COLUMN IF NOT EXISTS conversation_id uuid;
DO $relation$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint
    WHERE conname='gu_v014149_exchange_conversation_fk'
      AND conrelid='public.gu_member_tutor_exchanges_v014102'::regclass)
 THEN
  ALTER TABLE public.gu_member_tutor_exchanges_v014102
   ADD CONSTRAINT gu_v014149_exchange_conversation_fk
   FOREIGN KEY(user_id,conversation_id)
   REFERENCES public.gu_tutor_conversations_v014149(user_id,id)
   ON DELETE RESTRICT;
 END IF;
END $relation$;
CREATE INDEX IF NOT EXISTS gu_v014149_exchange_conversation_recent
 ON public.gu_member_tutor_exchanges_v014102(user_id,conversation_id,created_at DESC);
GRANT UPDATE(conversation_id) ON public.gu_member_tutor_exchanges_v014102 TO service_role;

-- Serialized/idempotent creation; protect 30-conversation cap across tabs.
CREATE OR REPLACE FUNCTION public.gu_v014149_create_tutor_conversation(
 p_user uuid,p_request uuid,p_title text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_count integer;
BEGIN
 IF p_user IS NULL OR p_request IS NULL OR p_title IS NULL OR
  char_length(trim(p_title)) NOT BETWEEN 3 AND 90
 THEN RAISE EXCEPTION 'Invalid Tutor conversation' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,102));
 SELECT id INTO v_id FROM public.gu_tutor_conversations_v014149
 WHERE user_id=p_user AND request_id=p_request;
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 SELECT count(*) INTO v_count FROM public.gu_tutor_conversations_v014149 WHERE user_id=p_user;
 IF v_count>=30
 THEN RAISE EXCEPTION 'Conversation limit reached' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.gu_tutor_conversations_v014149(user_id,request_id,title)
 VALUES(p_user,p_request,trim(p_title)) RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.gu_v014149_create_tutor_conversation(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_create_tutor_conversation(uuid,uuid,text)
 TO service_role;

-- Save one server-generated v102 exchange and its member-owned conversation
-- in ONE database transaction. v102 UUID idempotency and per-user locking apply.
CREATE OR REPLACE FUNCTION public.gu_v014149_save_tutor_conversation_exchange(
 p_user_id uuid,p_conversation_id uuid,p_request_id uuid,p_question text,
 p_learner_answer text,p_mode text,p_answer text,p_generation text,p_source_titles jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_changed uuid;
BEGIN
 IF p_user_id IS NULL OR p_conversation_id IS NULL THEN
  RAISE EXCEPTION 'Invalid conversation identity' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,102));
 PERFORM 1 FROM public.gu_tutor_conversations_v014149
  WHERE user_id=p_user_id AND id=p_conversation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conversation not found' USING ERRCODE='P0002'; END IF;
 v_id:=public.gu_v014102_save_member_tutor_exchange(
  p_user_id,p_request_id,p_question,p_learner_answer,p_mode,p_answer,p_generation,p_source_titles);
 UPDATE public.gu_member_tutor_exchanges_v014102
 SET conversation_id=p_conversation_id WHERE user_id=p_user_id AND id=v_id
  AND (conversation_id IS NULL OR conversation_id=p_conversation_id)
 RETURNING id INTO v_changed;
 IF v_changed IS NULL THEN
  RAISE EXCEPTION 'Request ID belongs to a different Tutor conversation' USING ERRCODE='P0002';
 END IF;
 UPDATE public.gu_tutor_conversations_v014149
 SET updated_at=now() WHERE user_id=p_user_id AND id=p_conversation_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.gu_v014149_save_tutor_conversation_exchange(
 uuid,uuid,uuid,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_save_tutor_conversation_exchange(
 uuid,uuid,uuid,text,text,text,text,text,jsonb) TO service_role;

-- Explicit user deletion is atomic: erase their exchanges before the parent.
CREATE OR REPLACE FUNCTION public.gu_v014149_delete_tutor_conversation(
 p_user uuid,p_conversation uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_removed uuid;
BEGIN
 IF p_user IS NULL OR p_conversation IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,102));
 DELETE FROM public.gu_member_tutor_exchanges_v014102
  WHERE user_id=p_user AND conversation_id=p_conversation;
 DELETE FROM public.gu_tutor_conversations_v014149
  WHERE user_id=p_user AND id=p_conversation RETURNING id INTO v_removed;
 RETURN v_removed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.gu_v014149_delete_tutor_conversation(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_delete_tutor_conversation(uuid,uuid)
 TO service_role;
-- Anonymous-to-operators fixed-category gap analytics. This counts ONLY broad
-- unanswered topic groups. Neither user_id, prompt text, session, IP, ticker,
-- URL nor specific reported mistake appears in this table.
CREATE TABLE IF NOT EXISTS public.gu_tutor_gap_aggregate_v014149 (
 month_utc date NOT NULL,
 topic_code text NOT NULL CHECK(topic_code IN
  ('charting','risk','market_structure','order_flow','learning_platform','other')),
 question_mode text NOT NULL CHECK(question_mode IN ('explain','question','review','practice')),
 total integer NOT NULL DEFAULT 0 CHECK(total BETWEEN 0 AND 1000000),
 last_seen timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(month_utc,topic_code,question_mode)
);
ALTER TABLE public.gu_tutor_gap_aggregate_v014149 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_tutor_gap_aggregate_v014149 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_tutor_gap_aggregate_v014149 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_v014149_record_tutor_gap(
 p_topic text,p_mode text
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $
DECLARE v_month date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
BEGIN
 IF p_topic NOT IN ('charting','risk','market_structure','order_flow','learning_platform','other')
 OR p_mode NOT IN ('explain','question','review','practice') THEN RETURN false; END IF;
 INSERT INTO public.gu_tutor_gap_aggregate_v014149(month_utc,topic_code,question_mode,total)
 VALUES(v_month,p_topic,p_mode,1)
 ON CONFLICT(month_utc,topic_code,question_mode)
 DO UPDATE SET total=LEAST(public.gu_tutor_gap_aggregate_v014149.total+1,1000000),
  last_seen=now();
 RETURN true;
END $;
REVOKE ALL ON FUNCTION public.gu_v014149_record_tutor_gap(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_record_tutor_gap(text,text)
 TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
-- Existing v102 ungrouped exchanges remain unmodified. Real cross-account
-- PostgREST / RPC denial must be verified with two production member tokens.
