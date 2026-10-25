-- v0.14.0.192 Founder Educational Certificates: earned, non-accredited,
-- verified from existing 30 competency definitions and independently recorded evidence.
CREATE TABLE IF NOT EXISTS public.gu_founder_certificates_v014192(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 track text NOT NULL CHECK(track IN ('FOUNDING_FOUNDATIONS')),
 evidence_digest jsonb NOT NULL CHECK(jsonb_typeof(evidence_digest)='object'),
 reviewed_by uuid NOT NULL REFERENCES auth.users(id),
 issued_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,revocation_reason text,
 UNIQUE(user_id,track)
);
ALTER TABLE public.gu_founder_certificates_v014192 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_certificates_v014192 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_founder_certificates_v014192 TO authenticated;
GRANT ALL ON public.gu_founder_certificates_v014192 TO service_role;
DROP POLICY IF EXISTS gu_founder_own_awards_v014192 ON public.gu_founder_certificates_v014192;
CREATE POLICY gu_founder_own_awards_v014192 ON public.gu_founder_certificates_v014192 FOR SELECT TO authenticated
USING(user_id=(select auth.uid()) AND revoked_at IS NULL);
CREATE OR REPLACE FUNCTION public.gu_founder_issue_certificate_v014192(p_actor uuid,p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,pg_temp AS $cert$
DECLARE x text; criteria text[]=ARRAY['CHART_STRUCTURE','CANDLE_READING','VWAP_CONTEXT','RISK_PER_SHARE'];
 def public.competency_definitions%rowtype;cnt integer;dim_count integer;digest jsonb:='{}'::jsonb;award_id uuid;
BEGIN
 IF p_actor IS NULL OR p_user IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_actor AND r.role_code='OWNER'
  AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_REQUIRED');END IF;
 IF NOT EXISTS (SELECT 1 FROM public.gu_founder_members_v014173 WHERE user_id=p_user AND revoked_at IS NULL)
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_A_FOUNDER');END IF;
 FOREACH x IN ARRAY criteria LOOP
  SELECT * INTO def FROM public.competency_definitions WHERE competency_code=x AND active=true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','CURRICULUM_MISSING');END IF;
  SELECT count(*),count(DISTINCT dimension) INTO cnt,dim_count
  FROM public.competency_evidence WHERE user_id=p_user AND competency_code=x
  AND passed=true AND critical_error IS DISTINCT FROM true
  AND score>=def.pass_score
  AND source_type IN ('lab','quiz','simulator','capstone','instructor_review','system_assessment');
  IF cnt<def.minimum_evidence OR dim_count<4
  THEN RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_INDEPENDENT_EVIDENCE','competency',x);END IF;
  digest:=digest||jsonb_build_object(x,jsonb_build_object('passingEvidence',cnt,'dimensions',dim_count,'passingThreshold',def.pass_score));
 END LOOP;
 INSERT INTO public.gu_founder_certificates_v014192(user_id,track,evidence_digest,reviewed_by)
 VALUES(p_user,'FOUNDING_FOUNDATIONS',digest,p_actor)
 ON CONFLICT(user_id,track) DO NOTHING RETURNING id INTO award_id;
 IF award_id IS NULL THEN SELECT id INTO award_id FROM public.gu_founder_certificates_v014192
 WHERE user_id=p_user AND track='FOUNDING_FOUNDATIONS' AND revoked_at IS NULL;END IF;
 IF award_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','PREVIOUS_CERTIFICATE_REVOKED');END IF;
 RETURN jsonb_build_object('ok',true,'certificateId',award_id,'track','FOUNDING_FOUNDATIONS');
END $cert$;
REVOKE ALL ON FUNCTION public.gu_founder_issue_certificate_v014192(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_issue_certificate_v014192(uuid,uuid) TO service_role;
