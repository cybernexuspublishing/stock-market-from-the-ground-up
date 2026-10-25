-- v0.14.0.230: Six inactive Stripe product shells, deliberately with NO Prices.
-- Owner-approved sponsorship contract rates remain null; both modes quote-only.
UPDATE public.gu_ad_packages_v014226
 SET stripe_test_product_id=CASE code
   WHEN 'SITE_SPONSOR' THEN 'prod_VVK8UCYhFmk0Cf'
   WHEN 'SECTION_SPONSOR' THEN 'prod_VVK83TW5UaTH0u'
   WHEN 'RESOURCE_SPONSOR' THEN 'prod_VVK8t5yQ2qH6QF' END,
 stripe_live_product_id=CASE code
   WHEN 'SITE_SPONSOR' THEN 'prod_VVK8CwhTDRSolf'
   WHEN 'SECTION_SPONSOR' THEN 'prod_VVK8ji3o0Afg2b'
   WHEN 'RESOURCE_SPONSOR' THEN 'prod_VVK8bFfixxUIxh' END,
 updated_at=now()
WHERE code IN('SITE_SPONSOR','SECTION_SPONSOR','RESOURCE_SPONSOR')
 AND availability='quote_only' AND price_cents IS NULL;
DO $qa$ BEGIN
 IF (SELECT count(*) FROM public.gu_ad_packages_v014226
 WHERE stripe_test_product_id IS NOT NULL AND stripe_live_product_id IS NOT NULL
 AND price_cents IS NULL AND availability='quote_only') <> 3
 THEN RAISE EXCEPTION 'Advertising Stripe quote-only catalog not correctly mapped';END IF;
END $qa$;