-- v0.14.0.241: Owner-only, atomic global Stripe TEST mode and ad-specific
-- sandbox toggle. A QA mode never unlocks LIVE advertising.
CREATE OR REPLACE FUNCTION public.gu_ad_sandbox_toggle_v014241(
 p_actor uuid,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $qa$
BEGIN
 IF p_actor IS NULL OR p_enabled IS NULL OR NOT EXISTS(
 SELECT 1 FROM public.admin_user_roles WHERE user_id=p_actor AND role_code='OWNER'
 AND (expires_at IS NULL OR expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_REQUIRED');END IF;
 PERFORM pg_advisory_xact_lock(20261025,241);
 IF NOT EXISTS(SELECT 1 FROM public.gu_ad_sales_settings_v014226
 WHERE singleton AND accepting_payments=false AND ad_delivery_enabled=false)
 THEN RETURN jsonb_build_object('ok',false,'error','LIVE_AD_SAFETY_SWITCH_REQUIRED');END IF;
 UPDATE public.gu39_sandbox_settings SET enabled=p_enabled,updated_at=now() WHERE id=true;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','TEST_MODE_MISSING');END IF;
 UPDATE public.gu_ad_sandbox_settings_v014240 SET testing_enabled=p_enabled,updated_at=now() WHERE singleton;
 IF NOT FOUND THEN RAISE EXCEPTION 'AD_TEST_SETTINGS_MISSING';END IF;
 INSERT INTO public.gu_ad_admin_audit_v014226(actor,action,resource_type,resource_id,details)
 VALUES(p_actor,CASE WHEN p_enabled THEN 'ad_test_enabled' ELSE 'ad_test_disabled' END,
 'ad_sandbox','singleton',jsonb_build_object('globalStripeTesting',p_enabled,'liveAdPayment',false,'liveAdServing',false));
 RETURN jsonb_build_object('ok',true,'sandboxEnabled',p_enabled,
 'sharedTestModeEnabled',p_enabled,'liveCheckoutEnabled',false,'liveAdDeliveryEnabled',false);
END $qa$;
REVOKE ALL ON FUNCTION public.gu_ad_sandbox_toggle_v014241(uuid,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_ad_sandbox_toggle_v014241(uuid,boolean) TO service_role;
