-- The Stock Market: From the Ground Up | v0.13.5 incremental staging only
-- Execute ONCE after previous v0.13.5 migrations. Idempotent re-execution is safe.
-- IMPORTANT: This adds an unpublished, non-purchasable training-only plan.
--            It stores two owner-supplied KDP prepublication URLs as DRAFT metadata.
--            It never enables checkout, QR, Turnstile, staff MFA or direct digital sales.
BEGIN;

INSERT INTO public.platform_plans
(plan_code,name,description,price_cents,currency,billing_interval,active,public_visible,
 ad_free,includes_all_tools,includes_all_books,checkout_url,checkout_enabled,sort_order,metadata)
VALUES
('ONDEMAND_MONTHLY','Historical Replay Learning — Monthly',
 'Original book-aligned practice and decision recording completed in the learner''s own independently authorized thinkorswim OnDemand installation. Does not include book files, brokerage access, paid market data, or the proprietary platform simulator.',
 0,'USD','month',true,false,false,false,false,NULL,false,25,
 '{"checkout_ready":false,"pricing_status":"pending_owner_approval","delivery":"third_party_self_operated","training_only":true,"not_a_zero_cost_offer":true,"no_book_files":true,"no_market_data_license":true}'::jsonb)
ON CONFLICT(plan_code) DO UPDATE SET
 name=EXCLUDED.name,description=EXCLUDED.description,active=true,public_visible=false,
 includes_all_tools=false,includes_all_books=false,checkout_url=NULL,checkout_enabled=false,
 metadata=COALESCE(public.platform_plans.metadata,'{}'::jsonb)||EXCLUDED.metadata,
 updated_at=NOW();

-- A Replay-Only member has access to the dedicated training tool and nothing else.
INSERT INTO public.plan_tool_access(plan_code,tool_code)
SELECT 'ONDEMAND_MONTHLY','ONDEMAND_TRAINING'
WHERE EXISTS (SELECT 1 FROM public.platform_tools WHERE tool_code='ONDEMAND_TRAINING')
ON CONFLICT DO NOTHING;

-- Explicitly remove accidental unrelated tool mappings for this ONLY new plan.
DELETE FROM public.plan_tool_access
 WHERE plan_code='ONDEMAND_MONTHLY' AND tool_code<>'ONDEMAND_TRAINING';

-- Store the owner's URLs in generic listing metadata: format and live status unverified.
-- Do NOT populate amazon_kindle_url / paperback / hardcover until the actual format
-- and public availability have been confirmed. Store purchase buttons remain absent.
UPDATE public.catalog_products
SET metadata=COALESCE(metadata,'{}'::jsonb)||
    '{"amazon_asin":"B0HMPSNLGS","amazon_listing_url":"https://www.amazon.com/dp/B0HMPSNLGS","amazon_listing_state":"prepublication","amazon_listing_format":"unverified"}'::jsonb,
    updated_at=NOW()
WHERE product_code='FOUNDATION_BOOK_1';
UPDATE public.catalog_products
SET metadata=COALESCE(metadata,'{}'::jsonb)||
    '{"amazon_asin":"B0HMPQ9CTX","amazon_listing_url":"https://www.amazon.com/dp/B0HMPQ9CTX","amazon_listing_state":"prepublication","amazon_listing_format":"unverified"}'::jsonb,
    updated_at=NOW()
WHERE product_code='FOUNDATION_BOOK_2';

-- Safety remains explicit for the new plan, independent of other owner settings.
UPDATE public.platform_plans SET checkout_enabled=false,checkout_url=NULL,public_visible=false
WHERE plan_code='ONDEMAND_MONTHLY';
NOTIFY pgrst,'reload schema';
COMMIT;
