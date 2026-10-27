-- 2026-10-27: Owner requested display reconciliation to existing price records.
-- Do not invent new Stripe Prices, change checkout rights, or create separate course billing.
BEGIN;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.gu_storefront_items_v014174 s JOIN public.platform_tools t
      ON s.sku='tool:'||t.tool_code
      WHERE s.category='tool' AND s.price_label='Pricing to be announced'
        AND t.status IN ('beta','planned') AND t.individual_price_cents=2999 AND t.tool_code<>'ONDEMAND_TRAINING') <> 17
 THEN RAISE EXCEPTION 'Specialist tool source/price inventory changed: reconcile before publishing'; END IF;
 IF (SELECT COUNT(*) FROM public.catalog_products
     WHERE product_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE')
       AND (metadata->'website_price_by_format_cents_v135'->>'digital')::int IN (1099,1199,1499)) <> 5
 THEN RAISE EXCEPTION 'Verified five digital book price records incomplete'; END IF;
 IF (SELECT COUNT(*) FROM public.gu_storefront_items_v014174 WHERE category='bootcamp' AND sku LIKE 'course:BC-%')<>7
 OR (SELECT COUNT(*) FROM public.gu_storefront_items_v014174 WHERE category='bootcamp' AND sku LIKE 'course:SC-%')<>8
 THEN RAISE EXCEPTION 'Unexpected boot camp/clinic catalog scope'; END IF;
END $$;

-- Existing individual beta specialist tool price is already in platform_tools.
UPDATE public.gu_storefront_items_v014174 s
 SET price_label='$29.99 / month',duration_label='Existing configured beta tool price; standalone checkout not yet enabled',
     updated_at=now(),version=version+1
 FROM public.platform_tools t
 WHERE s.category='tool' AND s.sku='tool:'||t.tool_code AND
       s.price_label='Pricing to be announced' AND
       t.individual_price_cents=2999 AND t.status IN ('beta','planned')
       AND t.tool_code<>'ONDEMAND_TRAINING';

-- ONDEMAND_TRAINING is the benefit within the already priced ONDEMAND_MONTHLY plan;
-- do not create an independently billed duplicate.
UPDATE public.gu_storefront_items_v014174
 SET price_label='Included with Historical Replay Learning — $19.99/month',
     duration_label='No separate subscription; available through eligible membership',
     updated_at=now(),version=version+1
 WHERE sku='tool:ONDEMAND_TRAINING' AND price_label='Pricing to be announced';

-- Seven canonical programs reuse the priced monthly replay-training membership.
UPDATE public.gu_storefront_items_v014174
 SET price_label='Included with Historical Replay Learning — $19.99/month',
     updated_at=now(),version=version+1
 WHERE category='bootcamp' AND sku LIKE 'course:BC-%'
 AND price_label='Pricing to be announced';

-- Eight clinics are not independently marketed as purchasable Stripe SKUs.
-- Avoid promising their unreleased content or inventing independent prices.
UPDATE public.gu_storefront_items_v014174
 SET price_label='No standalone charge — covered by eligible membership when released',
     updated_at=now(),version=version+1
 WHERE category='bootcamp' AND sku LIKE 'course:SC-%'
 AND price_label='Pricing to be announced';

-- Existing five per-edition digital price contracts, format-specific.
UPDATE public.gu_storefront_items_v014174 s
 SET price_label='Digital edition $'||to_char(((p.metadata->'website_price_by_format_cents_v135'->>'digital')::int)/100.0,'FM999,999,990.00')||
                 ' — physical editions priced separately',
     updated_at=now(),version=version+1
 FROM public.catalog_products p
 WHERE s.sku='book:'||p.product_code
 AND p.product_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE')
 AND (p.metadata->'website_price_by_format_cents_v135'->>'digital')::int>0
 AND s.price_label='See edition and retailer pricing';

-- Two duplicate series overview rows are not independently purchasable bundles.
UPDATE public.gu_storefront_items_v014174
 SET price_label='Books I–III priced individually; no separate bundle checkout',
     updated_at=now(),version=version+1
 WHERE sku IN ('book:FOUNDATIONS_COMPLETE_BUNDLE','book:FOUNDATIONS_COMPLETE_SERIES')
 AND price_label='See edition and retailer pricing';

-- Stripe LIVE product/price references are already configured for the three packs.
UPDATE public.gu_storefront_items_v014174
 SET duration_label='One-time — existing LIVE Stripe price',
     updated_at=now(),version=version+1
 WHERE sku IN ('addon:SPARKS_10','addon:SPARKS_30','addon:SPARKS_75')
 AND duration_label='One-time proposed price';

INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
VALUES (NULL,'OWNER_EXISTING_PRICE_LABEL_RECONCILIATION','commerce','2026-10-27',
 jsonb_build_object('tools_existing_monthly_2999',17,'included_training',1,
 'canonical_bootcamps_in_replay_membership',7,'clinics_not_independently_billed',8,
 'digital_editions_from_existing_metadata',5,'bundles_no_independent_price',2,
 'sparks_existing_live_prices',3,'price_changes',false,'stripe_price_changes',false,
 'live_checkout_permission_changes',false));
COMMIT;
