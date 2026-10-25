-- v0.14.0.198 Capture recurring-payment consent before any founding Checkout session.
ALTER TABLE public.gu_founder_reservations_v014173
 ADD COLUMN IF NOT EXISTS recurring_consent_at timestamptz;
ALTER TABLE public.gu_founder_reservations_v014173
 ADD COLUMN IF NOT EXISTS terms_version text;
CREATE OR REPLACE FUNCTION public.gu_founder_reserve_with_consent_v014198(
 p_user_id uuid,p_plan_code text,p_intent_key text,
 p_expires_at timestamptz,p_terms_version text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $consent$
DECLARE result jsonb;rid uuid;
BEGIN
 IF p_terms_version IS DISTINCT FROM 'F600-2026-10-24'
 THEN RETURN jsonb_build_object('ok',false,'error','CONSENT_VERSION_REQUIRED');END IF;
 result:=public.gu_founder_reserve_v014173(p_user_id,p_plan_code,p_intent_key,p_expires_at);
 IF (result->>'ok')::boolean IS DISTINCT FROM true THEN RETURN result;END IF;
 rid:=(result->>'reservationId')::uuid;
 UPDATE public.gu_founder_reservations_v014173
 SET recurring_consent_at=coalesce(recurring_consent_at,now()),
 terms_version=coalesce(terms_version,p_terms_version)
 WHERE id=rid AND user_id=p_user_id
 AND reservation_state IN ('reserved','bound');
 IF NOT FOUND THEN RAISE EXCEPTION 'CONSENT_RESERVATION_CONFLICT';END IF;
 RETURN result;
END $consent$;
REVOKE ALL ON FUNCTION public.gu_founder_reserve_with_consent_v014198(uuid,text,text,timestamptz,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_reserve_with_consent_v014198(uuid,text,text,timestamptz,text)
 TO service_role;
