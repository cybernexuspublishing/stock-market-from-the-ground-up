BEGIN;
DROP POLICY IF EXISTS gu_store_category_public_read_v014297 ON public.gu_store_categories_v014297;
CREATE POLICY gu_store_category_public_read_v014299 ON public.gu_store_categories_v014297
 FOR SELECT TO anon,authenticated USING(active=true);
CREATE POLICY gu_store_category_owner_unpublished_v014299 ON public.gu_store_categories_v014297
 FOR SELECT TO authenticated USING(public.gu_store_owner_v014297());
-- Unauthenticated callers never need EXECUTE on the owner-check function.
REVOKE EXECUTE ON FUNCTION public.gu_store_owner_v014297() FROM anon;
COMMIT;