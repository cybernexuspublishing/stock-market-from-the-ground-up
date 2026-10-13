-- READ ONLY verification. Does not create or alter data.
SELECT plan_code,name,billing_interval,price_cents,active,public_visible,
       checkout_enabled,checkout_url,includes_all_books,includes_all_tools,metadata
FROM public.platform_plans WHERE plan_code='ONDEMAND_MONTHLY';
SELECT plan_code,tool_code FROM public.plan_tool_access
WHERE plan_code='ONDEMAND_MONTHLY' ORDER BY tool_code;
SELECT product_code,title,publication_status,sales_status,kdp_select,
       amazon_kindle_url,amazon_paperback_url,amazon_hardcover_url,
       metadata->>'amazon_asin' AS draft_asin,
       metadata->>'amazon_listing_url' AS draft_amazon_url,
       metadata->>'amazon_listing_state' AS draft_status
FROM public.catalog_products
WHERE product_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2')
ORDER BY product_code;
SELECT tool_code,name,public_visible,status,checkout_enabled,
       individual_price_cents
FROM public.platform_tools WHERE tool_code='ONDEMAND_TRAINING';
