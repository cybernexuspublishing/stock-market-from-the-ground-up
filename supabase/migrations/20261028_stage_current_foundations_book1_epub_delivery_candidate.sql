-- Stage the already-uploaded, current Foundations Book I EPUB as a
-- PRIVATE delivery candidate. Do NOT grant rights, enable downloads,
-- activate sales, or create orders. Publisher must confirm final version,
-- distribution rights and price/fulfillment contract before LIVE checkout.
BEGIN;
INSERT INTO public.gu_digital_books_v01430
 (product_code,asset_path,sales_enabled,downloads_enabled)
SELECT v.product_code,v.asset_path,false,false
FROM public.gu_digital_versions_v014303 v
JOIN storage.objects o ON o.bucket_id='gu-digital-ebooks' AND o.name=v.asset_path
WHERE v.product_code='FOUNDATION_BOOK_1' AND v.format='epub'
 AND v.current=true AND v.replaced_at IS NULL
 AND NOT EXISTS (SELECT 1 FROM public.gu_digital_books_v01430 d
                 WHERE d.product_code=v.product_code)
LIMIT 1;
COMMIT;