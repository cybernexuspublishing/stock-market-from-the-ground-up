-- Owner-approved LIVE Founding 600 availability, 2026-10-28.
-- Public memberships: Free + Founding 14/30/60 only.
-- All active paid plan/tool checkout configuration stays prepared; unaccepted
-- products are hidden from the website. Does not create charges, grants, or customers.
-- IMPORTANT: gu_founder_release.public_launch_open is a legacy phase switch
-- where TRUE STOPS the Founding beta. Leave FALSE while accepting founding sales.
BEGIN;
WITH changed AS (
 UPDATE public.gu_founder_plans_v014173
 SET checkout_enabled=true
 WHERE plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60')
 AND checkout_enabled IS DISTINCT FROM true
 RETURNING plan_code
) SELECT 'founding_checkout' AS change_type,count(*) changed FROM changed;
-- The Owner-approved founding tiers must have an eligible Store overlay.
UPDATE public.store_product_overrides_v014175
SET store_visible=true,lifecycle='release_ready',updated_at=now(),version=version+1
WHERE sku IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60')
AND (store_visible IS DISTINCT FROM true OR lifecycle IS DISTINCT FROM 'release_ready');
-- Full checkout infrastructure remains configured for active supported paid
-- plans, including future hidden memberships. Free is not a paid checkout.
UPDATE public.platform_plans
SET checkout_enabled=true,updated_at=now()
WHERE active=true AND price_cents>0 AND checkout_enabled IS DISTINCT FROM true;
-- Free and the three Founder tiers are the only public membership plans.
UPDATE public.platform_plans
SET public_visible=(plan_code IN ('FREE','FOUNDING_14','FOUNDING_30','FOUNDING_60')),
    updated_at=now()
WHERE public_visible IS DISTINCT FROM (plan_code IN ('FREE','FOUNDING_14','FOUNDING_30','FOUNDING_60'));
-- Prepared but not independently accepted tools stay private, including
-- planned and non-beta-approved feature modules. Existing four approved
-- Founding-beta tool SKUs remain visible, with canonical status retained.
UPDATE public.platform_tools
SET checkout_enabled=true,
    public_visible=(status='live' AND tool_code IN
      ('INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR')),
    updated_at=now()
WHERE checkout_enabled IS DISTINCT FROM true OR public_visible IS DISTINCT FROM
 (status='live' AND tool_code IN
 ('INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'));
-- Old unaccepted categories remain hidden. Nonpublication is not permission
-- to purchase. No book/KDP or unfinished content is marked sale-ready.
UPDATE public.gu_storefront_items_v014174
SET visible=CASE
  WHEN sku='plan:FREE' THEN true
  WHEN sku IN ('founding:FOUNDING_14','founding:FOUNDING_30','founding:FOUNDING_60') THEN true
  WHEN sku IN ('tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR') THEN true
  ELSE false END,
 sale_ready=CASE
  WHEN category='founding' AND sku IN ('founding:FOUNDING_14','founding:FOUNDING_30','founding:FOUNDING_60') THEN true
  ELSE sale_ready END,
 status=CASE WHEN sku IN ('founding:FOUNDING_14','founding:FOUNDING_30','founding:FOUNDING_60') THEN 'for_sale' ELSE status END,
 updated_at=now(),version=version+1
WHERE visible IS DISTINCT FROM CASE
  WHEN sku='plan:FREE' THEN true
  WHEN sku IN ('founding:FOUNDING_14','founding:FOUNDING_30','founding:FOUNDING_60') THEN true
  WHEN sku IN ('tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR') THEN true
  ELSE false END
 OR (category='founding' AND sku IN ('founding:FOUNDING_14','founding:FOUNDING_30','founding:FOUNDING_60')
 AND (sale_ready IS DISTINCT FROM true OR status IS DISTINCT FROM 'for_sale'));
-- This field's historical semantics specifically close Founding enrollment
-- when true. FALSE is required while all three Founder offers are LIVE beta.
UPDATE public.gu_founder_release_v014173
SET public_launch_open=false,enrollment_enabled=true,billing_enabled=true,
 fulfillment_enabled=true,updated_at=now()
WHERE singleton=true AND (public_launch_open IS DISTINCT FROM false
 OR enrollment_enabled IS DISTINCT FROM true OR billing_enabled IS DISTINCT FROM true
 OR fulfillment_enabled IS DISTINCT FROM true);
UPDATE public.site_settings SET value='false'::jsonb,updated_at=now()
WHERE setting_key='commerce.checkout_test_mode' AND value IS DISTINCT FROM 'false'::jsonb;
UPDATE public.site_settings SET value='"STRIPE_MANAGED"'::jsonb,updated_at=now()
WHERE setting_key='commerce.provider' AND value IS DISTINCT FROM '"STRIPE_MANAGED"'::jsonb;
INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
SELECT (SELECT user_id FROM public.admin_user_roles WHERE role_code='OWNER'
  AND (expires_at IS NULL OR expires_at>now()) ORDER BY granted_at LIMIT 1),
 'commerce.owner_live_founder_four_memberships_20261028','catalog','FOUNDING_600',
 jsonb_build_object('public_membership_skus',jsonb_build_array('FREE','FOUNDING_14','FOUNDING_30','FOUNDING_60'),
 'live_checkout',true,'hidden_unaccepted',true,'no_test_charges',true,'no_member_grants',true,
 'founder_phase','founding_beta','source','owner_explicit_authorization_2026-10-28');
COMMIT;
