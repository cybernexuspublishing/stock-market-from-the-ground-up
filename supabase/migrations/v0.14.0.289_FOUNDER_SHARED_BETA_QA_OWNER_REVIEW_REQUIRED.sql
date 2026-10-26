-- v0.14.0.289 additive noncommercial Founder Commons shared QA access.
-- Existing Owner manual ONDEMAND_TRAINING passes are the only test authorizer.
-- No grants issued, prices touched, founder numbers created, or LIVE Stripe changes.
-- PRE-FLIGHT: select count(*) from public.user_tool_passes where metadata->>'reason' like 'F600_GUIDED_QA_V1:%';
-- ROLLBACK: companion .rollback.sql reinstates the original access function.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_founder_noncommercial_qa_v014289(p_user uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','pg_temp' AS $f$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR p_user IS DISTINCT FROM uid THEN RETURN false; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p
  WHERE p.id=uid AND p.account_kind='member' AND p.deleted_at IS NULL) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_flags f
  WHERE f.user_id=uid AND f.status IN ('suspended','restricted')) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_roles a
  WHERE a.user_id=uid AND a.role_code='SHOWCASE_VIEWER'
   AND (a.expires_at IS NULL OR a.expires_at>now())) THEN RETURN false; END IF;
 RETURN EXISTS (SELECT 1 FROM public.user_tool_passes t
  JOIN public.admin_user_roles issuer
   ON issuer.user_id::text=t.metadata->>'adminGrantedBy'
   AND issuer.role_code='OWNER'
   AND (issuer.expires_at IS NULL OR issuer.expires_at>now())
  WHERE t.user_id=uid AND t.tool_code='ONDEMAND_TRAINING'
   AND t.status='active' AND t.provider IS NULL AND t.provider_subscription_id IS NULL
   AND t.starts_at<=now() AND t.ends_at IS NOT NULL AND t.ends_at>now()
   AND t.ends_at<=t.starts_at+interval '30 days 1 minute'
   AND t.metadata->>'admin_manual'='true'
   AND t.metadata->>'source'='owner_manual'
   AND t.metadata->>'reason' LIKE 'F600_GUIDED_QA_V1:%'
 );
END $f$;
REVOKE ALL ON FUNCTION public.gu_founder_noncommercial_qa_v014289(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_noncommercial_qa_v014289(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gu_founder_commons_access_v014174(p_scope text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE uid uuid:=auth.uid(); earned text;
BEGIN
 IF uid IS NULL OR p_scope NOT IN ('shared','council') THEN RETURN false; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND account_kind='member' AND deleted_at IS NULL) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_flags WHERE user_id=uid AND status IN ('restricted','suspended')) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='SHOWCASE_VIEWER'
 AND (expires_at IS NULL OR expires_at>now())) THEN RETURN false; END IF;
 -- Owner-issued, expiring and noncommercial member QA may test the
 -- shared Founders Commons only, never Extended voting or paid benefits.
 IF p_scope='shared' AND public.gu_founder_noncommercial_qa_v014289(uid)
 THEN RETURN true; END IF;
 -- Owner can oversee private content and moderation without a synthetic entitlement.
 IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=uid AND role_code='OWNER'
 AND (expires_at IS NULL OR expires_at>now())) THEN RETURN true; END IF;
 SELECT earned_plan_code INTO earned FROM public.gu_founder_members_v014173
 WHERE user_id=uid AND revoked_at IS NULL;
 IF earned IS NULL THEN RETURN false; END IF;
 -- Higher tier privileges must be earned; a billing-record mistake cannot elevate Standard.
 IF p_scope='council' AND earned<>'FOUNDING_60' THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.site_subscriptions WHERE user_id=uid
   AND plan_code=CASE WHEN p_scope='council' THEN 'FOUNDING_60' ELSE plan_code END
   AND plan_code IN ('FOUNDING_30','FOUNDING_60')
   AND status IN ('active','trialing') AND current_period_end>now())
 THEN RETURN true; END IF;
 -- After upgrading to the separate Lifetime Membership, founding identity
 -- and earned Extended Council eligibility continue (not mere cancellation).
 IF p_scope='council' AND earned<>'FOUNDING_60' THEN RETURN false; END IF;
 RETURN (
 EXISTS (SELECT 1 FROM public.site_subscriptions WHERE user_id=uid
   AND plan_code='LIFETIME' AND status IN ('active','trialing'))
 OR EXISTS (SELECT 1 FROM public.user_plan_grants WHERE user_id=uid AND
 plan_code='LIFETIME' AND status IN ('active','trialing')
 AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()))
 );
END $function$;

COMMIT;
