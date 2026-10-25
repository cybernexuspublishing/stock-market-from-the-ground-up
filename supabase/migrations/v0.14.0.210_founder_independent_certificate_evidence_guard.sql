-- v0.14.0.210: certificates must be backed by unique independent assessment sources.
-- This trigger guards even service-role inserts, not merely the issuer's UI.
CREATE OR REPLACE FUNCTION public.gu_founder_certificate_evidence_guard_v014210()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $e$
DECLARE k text; minimum integer; pass_threshold numeric; n integer; dimensions integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=NEW.reviewed_by
  AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RAISE EXCEPTION 'FOUNDING_CERTIFICATE_OWNER_REVIEW_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_members_v014173 m
  WHERE m.user_id=NEW.user_id AND m.revoked_at IS NULL)
 THEN RAISE EXCEPTION 'FOUNDING_CERTIFICATE_IDENTITY_REQUIRED';END IF;
 FOREACH k IN ARRAY ARRAY['CHART_STRUCTURE','CANDLE_READING','VWAP_CONTEXT','RISK_PER_SHARE'] LOOP
  SELECT minimum_evidence,pass_score INTO minimum,pass_threshold
  FROM public.competency_definitions WHERE competency_code=k AND active=true;
  IF minimum IS NULL THEN RAISE EXCEPTION 'FOUNDING_CERTIFICATE_COMPETENCY_MISSING';END IF;
  SELECT count(DISTINCT (source_type,source_id)),count(DISTINCT dimension) INTO n,dimensions
  FROM public.competency_evidence
  WHERE user_id=NEW.user_id AND competency_code=k
  AND passed=true AND critical_error IS DISTINCT FROM true
  AND score>=pass_threshold
  AND source_type IN ('lab','quiz','simulator','capstone','instructor_review','system_assessment');
  IF n<minimum OR dimensions<4
  THEN RAISE EXCEPTION 'FOUNDING_CERTIFICATE_INDEPENDENT_EVIDENCE_INSUFFICIENT';END IF;
 END LOOP;
 RETURN NEW;
END $e$;
REVOKE ALL ON FUNCTION public.gu_founder_certificate_evidence_guard_v014210() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_founder_certificate_evidence_guard_v014210 ON public.gu_founder_certificates_v014192;
CREATE TRIGGER gu_founder_certificate_evidence_guard_v014210
BEFORE INSERT ON public.gu_founder_certificates_v014192
FOR EACH ROW EXECUTE FUNCTION public.gu_founder_certificate_evidence_guard_v014210();
