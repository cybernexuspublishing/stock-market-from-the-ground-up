BEGIN;
CREATE OR REPLACE FUNCTION public.gu_store_category_lifecycle_v014298()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid := auth.uid();refs int;
BEGIN
 IF NOT public.gu_store_owner_v014297() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND NEW.active=false) THEN
  SELECT count(*) INTO refs FROM public.catalog_products
   WHERE trim(both '-' from regexp_replace(lower(family),'[^a-z0-9]+','-','g'))=OLD.slug;
  IF refs>0 THEN RAISE EXCEPTION 'This category is used by % products; move those products before removing it.',refs; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.slug<>OLD.slug THEN RAISE EXCEPTION 'Category identifiers are immutable; edit the display name instead'; END IF;
  NEW.revision=OLD.revision+1;
  NEW.updated_at=now();
 END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.category.'||lower(TG_OP),'store_category',
   CASE WHEN TG_OP='DELETE' THEN OLD.slug ELSE NEW.slug END,
   jsonb_build_object('old',CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      'new',CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END));
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $$;
DROP TRIGGER IF EXISTS gu_store_category_owner_audit_v014298 ON public.gu_store_categories_v014297;
CREATE TRIGGER gu_store_category_owner_audit_v014298
 BEFORE INSERT OR UPDATE OR DELETE ON public.gu_store_categories_v014297
 FOR EACH ROW EXECUTE FUNCTION public.gu_store_category_lifecycle_v014298();
COMMIT;