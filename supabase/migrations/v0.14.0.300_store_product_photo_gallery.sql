-- Extends existing catalog_products with an Owner-uploaded photo gallery.
-- No member entitlement, provider price, payment or book distribution changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_store_product_photos_v014300(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_code text NOT NULL REFERENCES public.catalog_products(product_code) ON DELETE RESTRICT,
 storage_path text NOT NULL UNIQUE,
 alt_text text NOT NULL DEFAULT '' CHECK(length(alt_text)<=180),
 sort_order integer NOT NULL DEFAULT 100 CHECK(sort_order BETWEEN 0 AND 10000),
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_code,storage_path)
);
CREATE INDEX IF NOT EXISTS idx_store_photo_product_v014300
 ON public.gu_store_product_photos_v014300(product_code,sort_order,created_at);
ALTER TABLE public.gu_store_product_photos_v014300 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_store_product_photos_v014300 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_store_product_photos_v014300 TO anon,authenticated,service_role;
GRANT INSERT,UPDATE,DELETE ON public.gu_store_product_photos_v014300 TO authenticated,service_role;
CREATE POLICY gu_store_photos_public_v014300 ON public.gu_store_product_photos_v014300
 FOR SELECT TO anon,authenticated USING(EXISTS(
 SELECT 1 FROM public.catalog_products p WHERE p.product_code=product_code
 AND p.active=true AND p.store_visible=true
 AND p.publication_status NOT IN('archived')
));
CREATE POLICY gu_store_photos_owner_all_v014300 ON public.gu_store_product_photos_v014300
 FOR ALL TO authenticated USING(public.gu_store_owner_v014297())
 WITH CHECK(public.gu_store_owner_v014297());
CREATE OR REPLACE FUNCTION public.gu_store_photo_lifecycle_v014300()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid();n integer;
BEGIN
 IF NOT public.gu_store_owner_v014297() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.created_by IS DISTINCT FROM actor OR
   split_part(NEW.storage_path,'/',1)<>actor::text OR
   split_part(NEW.storage_path,'/',2)<>NEW.product_code THEN
    RAISE EXCEPTION 'Invalid photo Owner or SKU path'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.product_code,190300));
  SELECT count(*) INTO n FROM public.gu_store_product_photos_v014300 WHERE product_code=NEW.product_code;
  IF n>=6 THEN RAISE EXCEPTION 'A product may have at most six uploaded photos'; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.product_code<>OLD.product_code OR NEW.storage_path<>OLD.storage_path OR
     NEW.created_by<>OLD.created_by THEN
    RAISE EXCEPTION 'Product photos may only change alt text and sort order'; END IF;
 END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.product_photo.'||lower(TG_OP),'catalog_product',
 CASE WHEN TG_OP='DELETE' THEN OLD.product_code ELSE NEW.product_code END,
 jsonb_build_object('photo',CASE WHEN TG_OP='DELETE' THEN OLD.storage_path ELSE NEW.storage_path END));
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $$;
DROP TRIGGER IF EXISTS gu_store_photo_audit_v014300 ON public.gu_store_product_photos_v014300;
CREATE TRIGGER gu_store_photo_audit_v014300 BEFORE INSERT OR UPDATE OR DELETE
 ON public.gu_store_product_photos_v014300 FOR EACH ROW EXECUTE FUNCTION public.gu_store_photo_lifecycle_v014300();
COMMIT;