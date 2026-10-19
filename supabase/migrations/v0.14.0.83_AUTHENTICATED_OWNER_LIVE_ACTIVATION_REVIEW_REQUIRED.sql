-- Cyber Nexus | v0.14.0.83 | OWNER-AUTHORIZED LIVE PAYMENT ACTIVATION
-- INSTALL ONCE in the EXISTING production Supabase SQL Editor.
-- Installation DOES NOT activate checkout or require an authenticated user.
-- The authorization is enforced only at execution time, by the logged-in
-- OWNER in website Admin > Commerce, after fresh password confirmation.
-- Never impersonate Owner via set_config('request.jwt.claims'), ALTER triggers
-- or disable the v31R1 protected setting guard.
BEGIN;

DO $pre$ BEGIN
 IF to_regprocedure('public.gu_staff_identity_v01431r1()') IS NULL
 OR to_regprocedure('public.gu_staff_stepup_active_v01432r1()') IS NULL
 OR to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)') IS NULL
 OR to_regprocedure('public.gu58_live_bind_verified_checkout(uuid,uuid,text,text,integer)') IS NULL
 OR to_regclass('public.platform_plans') IS NULL
 OR to_regclass('public.platform_tools') IS NULL
 OR to_regclass('public.gu39_sandbox_settings') IS NULL
 OR to_regclass('public.gu_digital_payment_route_v01432r2') IS NULL
 OR to_regclass('public.site_settings') IS NULL
 OR to_regclass('public.admin_audit_log') IS NULL
 OR to_regclass('public.gu58_live_checkout_intents') IS NULL
 OR to_regclass('public.gu58_live_stripe_events') IS NULL THEN
   RAISE EXCEPTION 'GU83_REVIEWED_LIVE_PREREQUISITES_MISSING';
 END IF;
END $pre$;

CREATE OR REPLACE FUNCTION public.gu83_owner_activate_eight_live_checkout(
 p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $gu83$
DECLARE
 actor uuid := auth.uid();
 role_name text;
 plan_count integer;
 tool_count integer;
 prior_checkout jsonb;
 prior_testing boolean;
 prior_route boolean;
 now_checkout jsonb;
 now_testing boolean;
 now_route boolean;
BEGIN
 IF auth.role() IS DISTINCT FROM 'authenticated' OR actor IS NULL THEN
   RAISE EXCEPTION 'OWNER_LOGIN_REQUIRED' USING ERRCODE='42501';
 END IF;
 role_name:=public.gu_staff_identity_v01431r1();
 IF role_name IS DISTINCT FROM 'OWNER' THEN
   RAISE EXCEPTION 'OWNER_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF public.gu_staff_stepup_active_v01432r1() IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'PASSWORD_RECONFIRM_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF p_confirmation IS DISTINCT FROM 'ENABLE_EIGHT_PAID_LIVE_CHECKOUT' THEN
   RAISE EXCEPTION 'GU83_EXPLICIT_LIVE_CONFIRMATION_REQUIRED' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gu83:eight-paid-activation',0));
 SELECT COUNT(*) INTO plan_count
 FROM public.platform_plans p JOIN
  (VALUES ('FULL_MONTHLY',6999,'month'),
          ('FULL_ANNUAL',69900,'year'),
          ('LIFETIME',249900,'lifetime'),
          ('ONDEMAND_MONTHLY',1999,'month')) expected(code,cents,billing)
 ON p.plan_code=expected.code AND p.price_cents=expected.cents
  AND p.billing_interval=expected.billing AND upper(p.currency)='USD'
 WHERE p.active=true AND p.public_visible=true;
 IF plan_count<>4 THEN
   RAISE EXCEPTION 'GU83_PAID_PLAN_CATALOG_MISMATCH' USING ERRCODE='22023';
 END IF;
 SELECT COUNT(*) INTO tool_count
 FROM public.platform_tools t JOIN
  (VALUES ('INTERACTIVE_LEARNING',2999),
          ('JOURNAL_ANALYTICS',2999),
          ('MARKET_SIMULATOR',2999),
          ('MARKET_TUTOR',2999)) expected(code,cents)
 ON t.tool_code=expected.code AND t.individual_price_cents=expected.cents
 WHERE t.active=true AND t.public_visible=true AND t.status='live';
 IF tool_count<>4 THEN
   RAISE EXCEPTION 'GU83_PAID_TOOL_CATALOG_MISMATCH' USING ERRCODE='22023';
 END IF;
 IF to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)') IS NULL
 OR to_regprocedure('public.gu58_live_bind_verified_checkout(uuid,uuid,text,text,integer)') IS NULL THEN
   RAISE EXCEPTION 'GU83_LIVE_FULFILLMENT_NOT_INSTALLED';
 END IF;
 SELECT s.value INTO STRICT prior_checkout FROM public.site_settings s
 WHERE s.setting_key='commerce.checkout_enabled' FOR UPDATE;
 SELECT s.enabled INTO STRICT prior_testing FROM public.gu39_sandbox_settings s
 WHERE s.id=true FOR UPDATE;
 SELECT s.enabled INTO STRICT prior_route FROM public.gu_digital_payment_route_v01432r2 s
 WHERE s.channel='digital' FOR UPDATE;

 UPDATE public.platform_plans
 SET checkout_enabled=true,updated_at=now()
 WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY')
  AND checkout_enabled IS DISTINCT FROM true;
 UPDATE public.gu39_sandbox_settings
 SET enabled=false,updated_at=clock_timestamp(),updated_by=actor
 WHERE id=true AND enabled IS DISTINCT FROM false;
 UPDATE public.gu_digital_payment_route_v01432r2
 SET provider='STRIPE_MANAGED',enabled=true,updated_at=clock_timestamp(),updated_by=actor
 WHERE channel='digital'
  AND (provider IS DISTINCT FROM 'STRIPE_MANAGED' OR enabled IS DISTINCT FROM true);
 -- The existing v31R1 trigger MUST stay enabled. Because this runs through
 -- the authenticated Owner's JWT (and a server-verified recent password),
 -- that trigger authorizes the protected setting update normally.
 UPDATE public.site_settings
 SET value='true'::jsonb,updated_at=clock_timestamp()
 WHERE setting_key='commerce.checkout_enabled' AND value IS DISTINCT FROM 'true'::jsonb;

 SELECT s.value INTO STRICT now_checkout FROM public.site_settings s
 WHERE s.setting_key='commerce.checkout_enabled';
 SELECT s.enabled INTO STRICT now_testing FROM public.gu39_sandbox_settings s
 WHERE s.id=true;
 SELECT s.enabled INTO STRICT now_route FROM public.gu_digital_payment_route_v01432r2 s
 WHERE s.channel='digital' AND s.provider='STRIPE_MANAGED';
 IF now_checkout IS DISTINCT FROM 'true'::jsonb
 OR now_testing IS DISTINCT FROM false
 OR now_route IS DISTINCT FROM true
 OR (SELECT COUNT(*) FROM public.platform_plans
     WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY')
       AND checkout_enabled=true)<>4
 THEN RAISE EXCEPTION 'GU83_LIVE_ACTIVATION_VERIFY_FAILED'; END IF;

 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.eight_paid_live.activate.v01483','site_setting','commerce.checkout_enabled',
   jsonb_build_object('source','authenticated_owner_after_password_stepup',
    'plansEnabled',4,'toolsEligible',4,'previousCheckout',prior_checkout,
    'previousTesting',prior_testing,'previousStripeRoute',prior_route,
    'booksChanged',false,'zeroDollarQaReactivated',false));
 RETURN jsonb_build_object('ok',true,'plansEnabled',4,'toolsEligible',4,
   'testingDisabled',true,'stripeRouteEnabled',true,'masterCheckoutEnabled',true,
   'realCustomerChargesCanOccur',true,
   'providerAndCloudflareVerificationStillRequired',true);
END $gu83$;

REVOKE ALL ON FUNCTION public.gu83_owner_activate_eight_live_checkout(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu83_owner_activate_eight_live_checkout(text)
 TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
