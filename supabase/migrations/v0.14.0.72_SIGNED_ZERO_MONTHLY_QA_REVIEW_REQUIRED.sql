-- Cyber Nexus | v0.14.0.72 | EXISTING SUPABASE PROJECT ONLY
-- DOCUMENT ID GU-WEB-PAY-ZERO-MONTH-014072-20261018
-- REVIEW/OWNER APPLY ONCE. ADDITIVE SERVICE-ROLE-ONLY RPC, NO NEW DATABASE OR TABLE.
-- Back up the existing database / inspect installed column constraints before applying.
-- This deliberately grants *real, expiring* FULL_MONTHLY access to one allowlisted
-- FREE member after a signed, Stripe-retrieved $0 LIVE Checkout. NEVER auto-renews.
BEGIN;
DO $pre$ BEGIN
  IF to_regclass('public.user_plan_grants') IS NULL
     OR to_regclass('public.site_subscriptions') IS NULL
     OR to_regclass('public.platform_plans') IS NULL
     OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'GU72_REQUIRED_EXISTING_TABLES_MISSING';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.platform_plans
                WHERE plan_code='FULL_MONTHLY' AND active=true) THEN
    RAISE EXCEPTION 'GU72_FULL_MONTHLY_PLAN_NOT_ACTIVE';
  END IF;
END $pre$;
CREATE OR REPLACE FUNCTION public.gu72_signed_zero_monthly_grant(
 p_user_id uuid, p_session_id text, p_event_id text, p_price_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp
AS $gu72$
DECLARE existing public.user_plan_grants%ROWTYPE;
        new_id bigint;
        expired_at timestamptz;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'GU72_SERVICE_ROLE_ONLY' USING ERRCODE='42501';
 END IF;
 IF p_user_id IS NULL
    OR p_session_id IS NULL OR p_session_id !~ '^cs_live_[A-Za-z0-9_]{6,}$'
    OR p_event_id IS NULL OR p_event_id !~ '^evt_[A-Za-z0-9_]{6,}$'
    OR p_price_id IS NULL OR p_price_id !~ '^price_[A-Za-z0-9_]{6,}$' THEN
  RAISE EXCEPTION 'GU72_INVALID_PROVIDER_BINDING' USING ERRCODE='22023';
 END IF;
 -- Serialise all free QA requests for the same member, including replayed event IDs.
 PERFORM pg_advisory_xact_lock(hashtextextended('gu72:member:'||p_user_id::text,0));
 SELECT * INTO existing FROM public.user_plan_grants
  WHERE user_id=p_user_id AND source='stripe_zero_monthly_qa_v72'
  ORDER BY id LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF existing.source_reference=p_session_id THEN
   RETURN jsonb_build_object('ok',true,'alreadyApplied',true,
       'expiresAt',existing.ends_at,'grantId',existing.id);
  END IF;
  -- A second checkout never extends the membership; this also blocks trial farming.
  RETURN jsonb_build_object('ok',true,'alreadyGranted',true,
      'expiresAt',existing.ends_at,'grantId',existing.id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN
  RAISE EXCEPTION 'GU72_MEMBER_PROFILE_MISSING';
 END IF;
 IF EXISTS(
  SELECT 1 FROM public.user_plan_grants g
  WHERE g.user_id=p_user_id AND g.plan_code<>'FREE'
    AND g.status IN ('active','trialing')
    AND g.starts_at<=now() AND (g.ends_at IS NULL OR g.ends_at>now())
 ) OR EXISTS(
  SELECT 1 FROM public.site_subscriptions s
  WHERE s.user_id=p_user_id AND s.plan_code<>'FREE'
    AND s.status IN ('active','trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end>now())
 ) THEN
  RAISE EXCEPTION 'GU72_PAID_ACCESS_ALREADY_PRESENT';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.platform_plans
               WHERE plan_code='FULL_MONTHLY' AND active=true) THEN
  RAISE EXCEPTION 'GU72_MONTHLY_PLAN_UNAVAILABLE';
 END IF;
 expired_at:=now()+interval '1 month';
 INSERT INTO public.user_plan_grants(
  user_id,plan_code,status,starts_at,ends_at,source,source_reference,metadata
 ) VALUES(
  p_user_id,'FULL_MONTHLY','active',now(),expired_at,
  'stripe_zero_monthly_qa_v72',p_session_id,
  jsonb_build_object('purpose','single_test_checkout','amountCents',0,
     'provider','StripeLIVE','oneTime',true,'neverRenews',true,
     'stripeSessionId',p_session_id,'stripeEventId',p_event_id,'priceId',p_price_id)
 ) RETURNING id INTO new_id;
 RETURN jsonb_build_object('ok',true,'grantId',new_id,
    'planCode','FULL_MONTHLY','expiresAt',expired_at,'neverRenews',true);
END $gu72$;
REVOKE ALL ON FUNCTION public.gu72_signed_zero_monthly_grant(uuid,text,text,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gu72_signed_zero_monthly_grant(uuid,text,text,text)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
