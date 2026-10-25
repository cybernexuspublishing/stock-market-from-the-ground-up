-- v0.14.0.203 Founding 600 verified service-interruption credit registry.
-- Never invent outages or silently change Stripe collection/billing dates.
CREATE TABLE IF NOT EXISTS public.gu_founder_verified_incidents_v014203 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 incident_key text NOT NULL UNIQUE CHECK(incident_key ~ '^[A-Z0-9_-]{8,80}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 12 AND 160),
 service_area text NOT NULL CHECK(service_area IN ('labs','tutor','community','account_access','platform')),
 started_at timestamptz NOT NULL,
 ended_at timestamptz NOT NULL,
 verified_by uuid NOT NULL REFERENCES auth.users(id),
 verified_at timestamptz NOT NULL DEFAULT now(),
 impact_summary text NOT NULL CHECK(length(impact_summary) BETWEEN 30 AND 1800),
 severity text NOT NULL DEFAULT 'major' CHECK(severity IN ('major','critical')),
 CHECK(ended_at>started_at AND ended_at-started_at>=interval '30 minutes'
 AND ended_at-started_at<=interval '7 days' AND ended_at<=now())
);
CREATE TABLE IF NOT EXISTS public.gu_founder_service_credits_v014203 (
 incident_id uuid NOT NULL REFERENCES public.gu_founder_verified_incidents_v014203(id),
 user_id uuid NOT NULL REFERENCES public.gu_founder_members_v014173(user_id),
 verified_minutes integer NOT NULL CHECK(verified_minutes BETWEEN 30 AND 1440),
 status text NOT NULL DEFAULT 'pending_application' CHECK(status IN ('pending_application','applied','void')),
 applied_at timestamptz,
 provider_reference text UNIQUE,
 reviewer_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(incident_id,user_id),
 CHECK(status<>'applied' OR (applied_at IS NOT NULL AND provider_reference IS NOT NULL))
);
ALTER TABLE public.gu_founder_verified_incidents_v014203 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_founder_service_credits_v014203 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_verified_incidents_v014203,public.gu_founder_service_credits_v014203 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_founder_verified_incidents_v014203,public.gu_founder_service_credits_v014203 TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_founder_verified_incidents_v014203,public.gu_founder_service_credits_v014203 TO service_role;
DROP POLICY IF EXISTS gu_f600_own_service_credit_v014203 ON public.gu_founder_service_credits_v014203;
CREATE POLICY gu_f600_own_service_credit_v014203 ON public.gu_founder_service_credits_v014203
 FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
DROP POLICY IF EXISTS gu_f600_verified_incidents_v014203 ON public.gu_founder_verified_incidents_v014203;
CREATE POLICY gu_f600_verified_incidents_v014203 ON public.gu_founder_verified_incidents_v014203
 FOR SELECT TO authenticated USING(
 public.gu_founder_commons_access_v014174('shared')
 AND EXISTS(SELECT 1 FROM public.gu_founder_service_credits_v014203 c
 WHERE c.incident_id=id AND c.user_id=(select auth.uid())));
CREATE OR REPLACE FUNCTION public.gu_founder_record_service_incident_v014203(
 p_actor uuid,p_incident_key text,p_title text,p_service_area text,
 p_started_at timestamptz,p_ended_at timestamptz,p_summary text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $incident$
DECLARE v_incident uuid; v_credited integer:=0;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
  WHERE r.user_id=p_actor AND r.role_code='OWNER'
  AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_REQUIRED');END IF;
 IF p_incident_key !~ '^[A-Z0-9_-]{8,80}$'
 OR length(p_title) NOT BETWEEN 12 AND 160
 OR p_service_area NOT IN ('labs','tutor','community','account_access','platform')
 OR p_started_at IS NULL OR p_ended_at IS NULL OR p_ended_at>now()
 OR p_ended_at-p_started_at NOT BETWEEN interval '30 minutes' AND interval '7 days'
 OR length(p_summary) NOT BETWEEN 30 AND 1800
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_VERIFIED_INCIDENT');END IF;
 PERFORM pg_advisory_xact_lock(20261024,203);
 INSERT INTO public.gu_founder_verified_incidents_v014203(
 incident_key,title,service_area,started_at,ended_at,verified_by,impact_summary)
 VALUES(p_incident_key,p_title,p_service_area,p_started_at,p_ended_at,p_actor,p_summary)
 ON CONFLICT(incident_key) DO NOTHING RETURNING id INTO v_incident;
 IF v_incident IS NULL THEN RETURN jsonb_build_object('ok',false,'error','DUPLICATE_INCIDENT');END IF;
 INSERT INTO public.gu_founder_service_credits_v014203(incident_id,user_id,verified_minutes)
 SELECT v_incident,m.user_id,
 LEAST(1440,GREATEST(30,ceil(extract(epoch from (p_ended_at-p_started_at))/60)::integer))
 FROM public.gu_founder_members_v014173 m
 WHERE m.revoked_at IS NULL AND EXISTS(
  SELECT 1 FROM public.site_subscriptions s WHERE s.user_id=m.user_id
  AND s.plan_code IN('FOUNDING_30','FOUNDING_60')
  AND s.status IN ('active','trialing') AND s.current_period_start<=p_started_at
  AND s.current_period_end>p_started_at)
 ON CONFLICT(incident_id,user_id) DO NOTHING;
 GET DIAGNOSTICS v_credited=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'incidentId',v_incident,'creditedFounders',v_credited,
 'appliedToBilling',false,'reason','Provider date changes require final payment acceptance.');
END $incident$;
REVOKE ALL ON FUNCTION public.gu_founder_record_service_incident_v014203(uuid,text,text,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_record_service_incident_v014203(uuid,text,text,text,timestamptz,timestamptz,text) TO service_role;
