BEGIN;
DROP POLICY IF EXISTS gu_store_photos_public_v014300 ON public.gu_store_product_photos_v014300;
CREATE POLICY gu_store_photos_public_v014301 ON public.gu_store_product_photos_v014300
 FOR SELECT TO anon,authenticated USING(EXISTS(
 SELECT 1 FROM public.catalog_products p
 WHERE p.product_code=gu_store_product_photos_v014300.product_code
 AND p.active=true AND p.store_visible=true
 AND p.publication_status NOT IN('archived')
));
COMMIT;