-- v0.14.0.289 rollback. Do not delete any member history.
-- Existing legitimate founding members retain their original access rights.
-- Noncommercial QA passes stay in the existing pass ledger but no longer
-- grant shared Founders Commons once this rollback is executed.
BEGIN;
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
END $function$

REVOKE ALL ON FUNCTION public.gu_founder_noncommercial_qa_v014289(uuid) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION IF EXISTS public.gu_founder_noncommercial_qa_v014289(uuid);
COMMIT;
