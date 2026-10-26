-- Owner-authorized current offering: Founding Standard/Extended only.
-- No Stripe API call, live payment/fulfillment activation or member entitlement write.
-- Keep legacy plans active to preserve existing members; hide all non-Founder
-- plans from public Store, and close *new* legacy-plan checkout.
BEGIN;
DO $gate$
DECLARE v_unexpected int;
BEGIN
 SELECT count(*) INTO v_unexpected FROM public.platform_plans
 WHERE plan_code IN ('FOUNDING_30','FOUNDING_60')
 AND (price_cents,public_visible,checkout_enabled) IS DISTINCT FROM
  (CASE plan_code WHEN 'FOUNDING_30' THEN 4999 ELSE 5999 END,false,false);
 IF v_unexpected<>0 THEN RAISE EXCEPTION 'Founding plan baseline changed; do not change storefront'; END IF;
 IF (SELECT count(*) FROM public.platform_plans WHERE plan_code IN ('FOUNDING_30','FOUNDING_60'))<>2
 THEN RAISE EXCEPTION 'Founding plan pair missing'; END IF;
END $gate$;
WITH prior AS (
 SELECT plan_code,active,public_visible,checkout_enabled FROM public.platform_plans
),
changed AS (
 UPDATE public.platform_plans p
 SET public_visible=CASE WHEN p.plan_code IN ('FOUNDING_30','FOUNDING_60') THEN true ELSE false END,
 checkout_enabled=CASE WHEN p.plan_code IN ('FOUNDING_30','FOUNDING_60') THEN p.checkout_enabled ELSE false END,
 updated_at=now()
 WHERE (p.public_visible IS DISTINCT FROM (p.plan_code IN ('FOUNDING_30','FOUNDING_60')))
 OR (p.plan_code NOT IN ('FOUNDING_30','FOUNDING_60') AND p.checkout_enabled)
 RETURNING p.plan_code,p.public_visible,p.checkout_enabled
)
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
SELECT 'commerce.store.founding_only_visibility','platform_plans','FOUNDING_30+FOUNDING_60',
 jsonb_build_object('purpose','Owner requested only current Founding plans be public',
 'prior', (SELECT jsonb_agg(to_jsonb(prior) ORDER BY plan_code) FROM prior),
 'modified', (SELECT coalesce(jsonb_agg(to_jsonb(changed) ORDER BY plan_code),'[]'::jsonb) FROM changed),
 'member_entitlements_changed',false,'stripe_configuration_changed',false,
 'live_payment_enabled',false,'actor_web_session_verified',false);
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.platform_plans WHERE public_visible=true)<>2
 OR EXISTS (SELECT 1 FROM public.platform_plans WHERE public_visible=true AND plan_code NOT IN ('FOUNDING_30','FOUNDING_60'))
 OR EXISTS (SELECT 1 FROM public.platform_plans WHERE checkout_enabled=true)
 THEN RAISE EXCEPTION 'Founders-only Store verification failed; transaction reversed'; END IF;
END $check$;
COMMIT;