-- Cyber Nexus | v0.14.0.76 | EXISTING SUPABASE PROJECT ONLY
-- DOCUMENT ID GU-WEB-PAY-ZERO-REPEATABLE-014076-20261018
-- REVIEW/OWNER APPLY ONCE. REPLACES V72 RPC AND ADDS SERVICE-ONLY RESET RPC.
-- NO NEW DATABASE, TABLE, OR LIVE STRIPE PRODUCT; NO PAID GRANTS TOUCHED.
-- Back up the existing database / inspect installed column constraints before applying.
-- This deliberately grants *real, expiring* FULL_MONTHLY access to one allowlisted
-- FREE member after a signed, Stripe-retrieved $0 LIVE Checkout. NEVER auto-renews.
-- Retain all completed QA grants for session replay protection, including canceled grants.
-- Only an explicit allowlisted FREE test account reset enables the next trial.
BEGIN;
DO $pre$ BEGIN
  IF to_regclass('public.user_plan_grants') IS NULL
     OR to_regclass('public.site_subscriptions') IS NULL
     OR to_regclass('public.platform_plans') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.admin_user_flags') IS NULL THEN
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
    AND source_reference=p_session_id
  ORDER BY id LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF existing.source_reference=p_session_id THEN
   RETURN jsonb_build_object('ok',true,'alreadyApplied',true,
       'expiresAt',existing.ends_at,'grantId',existing.id);
  END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN
  RAISE EXCEPTION 'GU72_MEMBER_PROFILE_MISSING';
 END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_flags
           WHERE user_id=p_user_id AND status IN ('suspended','restricted')) THEN
  RAISE EXCEPTION 'GU72_MEMBER_ACCOUNT_RESTRICTED';
 END IF;
 -- No additional session can grant access while an earlier session is active.
 -- After explicit reset, canceled QA rows remain as immutable session replay proof.
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
-- Test account reset is SERVICE ROLE ONLY. The Cloudflare handler checks the
-- same authenticated, confirmed, individually allowlisted member before calling it.
-- It cancels ONLY that member's active GU72 $0 QA grants, retaining their Stripe
-- session IDs and metadata. No paid/granted/book/subscription records are touched.
CREATE OR REPLACE FUNCTION public.gu76_reset_zero_monthly_qa(
 p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp
AS $gu76$
DECLARE changed_count integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'GU76_SERVICE_ROLE_ONLY' USING ERRCODE='42501';
 END IF;
 IF p_user_id IS NULL THEN
   RAISE EXCEPTION 'GU76_MEMBER_REQUIRED' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gu72:member:'||p_user_id::text,0));
 -- An account banned or without a normal member profile cannot reset.
 IF NOT EXISTS(SELECT 1 FROM public.profiles
               WHERE id=p_user_id AND account_kind='member')
    OR EXISTS(SELECT 1 FROM public.admin_user_flags
              WHERE user_id=p_user_id AND status IN ('suspended','restricted')) THEN
   RAISE EXCEPTION 'GU76_NOT_AN_ELIGIBLE_MEMBER' USING ERRCODE='42501';
 END IF;
 UPDATE public.user_plan_grants
  SET status='canceled',
      ends_at=now(),
      updated_at=now(),
      metadata=COALESCE(metadata,'{}'::jsonb) ||
          jsonb_build_object('qaResetAt',now()::text,'qaResetReason','repeatable_same_member_test')
  WHERE user_id=p_user_id
    AND source='stripe_zero_monthly_qa_v72'
    AND plan_code='FULL_MONTHLY'
    AND status IN ('active','trialing')
    AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now());
 GET DIAGNOSTICS changed_count=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'resetCount',changed_count,
    'mayRepeat',true,'paidGrantsUnaffected',true);
END $gu76$;
REVOKE ALL ON FUNCTION public.gu76_reset_zero_monthly_qa(uuid)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gu76_reset_zero_monthly_qa(uuid)
 TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
