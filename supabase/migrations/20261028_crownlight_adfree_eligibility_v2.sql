-- Crownlight Sparks V2: server-side plan eligibility and active pass check.
CREATE OR REPLACE FUNCTION public.gu_sparks_adfree_status_v1(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_code text:='FREE';v_ads boolean:=false;v_expiry timestamptz;
BEGIN
 IF p_user_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id=p_user_id AND account_kind='member'
  AND deleted_at IS NULL)
 OR EXISTS (
  SELECT 1 FROM public.admin_user_flags WHERE user_id=p_user_id
  AND lower(status) IN ('restricted','suspended'))
 THEN RETURN jsonb_build_object('ok',false,'eligible',false,'active',false);END IF;
 IF EXISTS (
  SELECT 1 FROM public.admin_user_roles WHERE user_id=p_user_id
  AND role_code='OWNER' AND (expires_at IS NULL OR expires_at>now()))
 THEN v_code:='OWNER';
 ELSIF EXISTS (
  SELECT 1 FROM public.user_plan_grants WHERE user_id=p_user_id AND plan_code='LIFETIME'
   AND status IN ('active','trialing') AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS (
  SELECT 1 FROM public.site_subscriptions WHERE user_id=p_user_id AND plan_code='LIFETIME'
   AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now()))
 THEN v_code:='LIFETIME';
 ELSIF EXISTS (
  SELECT 1 FROM public.user_plan_grants WHERE user_id=p_user_id AND plan_code='FULL_ANNUAL'
   AND status IN ('active','trialing') AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS (
  SELECT 1 FROM public.site_subscriptions WHERE user_id=p_user_id AND plan_code='FULL_ANNUAL'
   AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now()))
 THEN v_code:='FULL_ANNUAL';
 ELSIF EXISTS (
  SELECT 1 FROM public.user_plan_grants WHERE user_id=p_user_id AND plan_code='FULL_MONTHLY'
   AND status IN ('active','trialing') AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS (
  SELECT 1 FROM public.site_subscriptions WHERE user_id=p_user_id AND plan_code='FULL_MONTHLY'
   AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now()))
 THEN v_code:='FULL_MONTHLY';
 ELSIF EXISTS (
  SELECT 1 FROM public.user_plan_grants WHERE user_id=p_user_id
   AND plan_code IN ('A_LA_CARTE','PICK_WHAT_YOU_WANT')
   AND status IN ('active','trialing') AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS (
  SELECT 1 FROM public.site_subscriptions WHERE user_id=p_user_id
   AND plan_code IN ('A_LA_CARTE','PICK_WHAT_YOU_WANT')
   AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now()))
 THEN v_code:='A_LA_CARTE';END IF;
 SELECT ads_enabled INTO v_ads FROM public.plan_ad_policies WHERE access_code=v_code;
 SELECT expires_at INTO v_expiry FROM public.gu_sparks_adfree_passes_v1
 WHERE user_id=p_user_id AND expires_at>now();
 RETURN jsonb_build_object('ok',true,'eligible',coalesce(v_ads,false),
  'active',v_expiry IS NOT NULL,'expiresAt',v_expiry,'planCode',v_code);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_sparks_adfree_status_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_sparks_adfree_status_v1(uuid) TO service_role;
