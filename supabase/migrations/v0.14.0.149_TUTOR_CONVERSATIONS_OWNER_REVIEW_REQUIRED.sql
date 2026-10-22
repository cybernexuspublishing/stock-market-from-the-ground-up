-- Deployment 09 / v0.14.0.149. ADDITIVE DRAFT; owner review required.
-- Do not apply blindly to a production Supabase project. Requires installed v102.
-- No user-facing private data exposure; only service_role may access directly.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_member_tutor_conversations_v014149 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_tutor_conv_user_date_v014149
 ON public.gu_member_tutor_conversations_v014149(user_id,updated_at DESC,id DESC);
ALTER TABLE public.gu_member_tutor_conversations_v014149 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_member_tutor_conversations_v014149 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_member_tutor_conversations_v014149 TO service_role;
-- Preserves existing ungrouped v102 exchanges and the 200 saved-note cap.
ALTER TABLE public.gu_member_tutor_exchanges_v014102
 ADD COLUMN IF NOT EXISTS conversation_id uuid NULL
 REFERENCES public.gu_member_tutor_conversations_v014149(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gu_tutor_exchange_conv_v014149
 ON public.gu_member_tutor_exchanges_v014102(user_id,conversation_id,created_at DESC);
-- Service access already exists for SELECT/INSERT/DELETE; grouping requires UPDATE.
GRANT UPDATE (conversation_id) ON public.gu_member_tutor_exchanges_v014102 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_v014149_create_tutor_conversation(p_user uuid,p_title text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
 IF p_user IS NULL OR char_length(coalesce(p_title,'')) NOT BETWEEN 1 AND 80
 THEN RAISE EXCEPTION 'Invalid conversation' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 149));
 IF (SELECT count(*) FROM public.gu_member_tutor_conversations_v014149 WHERE user_id=p_user)>=30
 THEN RAISE EXCEPTION 'Conversation limit reached' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.gu_member_tutor_conversations_v014149(user_id,title)
 VALUES (p_user,p_title) RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.gu_v014149_create_tutor_conversation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014149_create_tutor_conversation(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- No data deletion, entitlement grant, payment operation or canonical lesson change.
-- Requirement: run read-only v102/v107 diagnostics before scheduling migration.
