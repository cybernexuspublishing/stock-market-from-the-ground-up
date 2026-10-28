-- Owner-controlled Store visibility parity, October 28 2026.
-- Publication and checkout remain independent. This sync NEVER toggles
-- sale_ready, checkout_enabled, LIVE provider flags or member entitlements.
-- Existing authenticated Owner API/RPC permission and audit gates are retained.
CREATE OR REPLACE FUNCTION public.gu_sync_admin_store_visibility_v20261028()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE target_visible boolean;
BEGIN
 IF TG_TABLE_NAME = 'platform_plans' THEN
   -- Founder listing requires BOTH plan visibility AND Owner-managed product
   -- overlay visibility; independent Stripe admission controls remain closed.
   IF NEW.plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60') THEN
     target_visible := NEW.active AND NEW.public_visible AND EXISTS (
       SELECT 1 FROM public.store_product_overrides_v014175 o
       WHERE o.sku=NEW.plan_code AND o.store_visible=true
         AND o.lifecycle IN ('coming_soon','release_ready')
     );
     UPDATE public.gu_storefront_items_v014174 i
     SET visible=target_visible,updated_at=now(),version=i.version+1
     WHERE i.sku='founding:'||NEW.plan_code AND i.visible IS DISTINCT FROM target_visible;
   ELSE
     target_visible:=NEW.active AND NEW.public_visible;
     UPDATE public.gu_storefront_items_v014174 i
     SET visible=target_visible,updated_at=now(),version=i.version+1
     WHERE i.sku='plan:'||NEW.plan_code AND i.visible IS DISTINCT FROM target_visible;
   END IF;
 ELSIF TG_TABLE_NAME = 'store_product_overrides_v014175' THEN
   target_visible:=NEW.store_visible AND NEW.lifecycle IN ('coming_soon','release_ready');
   -- A Founder tier must also be explicitly listed and active in the
   -- membership registry; one Owner checkbox never bypasses the other.
   IF NEW.sku IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60') THEN
     target_visible:=target_visible AND EXISTS (
       SELECT 1 FROM public.platform_plans p WHERE p.plan_code=NEW.sku
         AND p.active=true AND p.public_visible=true
     );
   END IF;
   UPDATE public.gu_storefront_items_v014174 i
   SET visible=target_visible,updated_at=now(),version=i.version+1
   WHERE i.sku IN ('founding:'||NEW.sku,'tool:'||NEW.sku,
                   'course:'||NEW.sku,'addon:'||NEW.sku)
     AND i.visible IS DISTINCT FROM target_visible;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gu_sync_admin_store_visibility_v20261028() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_admin_plan_to_store_visibility_v20261028 ON public.platform_plans;
CREATE TRIGGER gu_admin_plan_to_store_visibility_v20261028
AFTER UPDATE OF active,public_visible ON public.platform_plans
FOR EACH ROW WHEN (OLD.active IS DISTINCT FROM NEW.active OR
 OLD.public_visible IS DISTINCT FROM NEW.public_visible)
EXECUTE FUNCTION public.gu_sync_admin_store_visibility_v20261028();
DROP TRIGGER IF EXISTS gu_admin_overlay_to_store_visibility_v20261028 ON public.store_product_overrides_v014175;
CREATE TRIGGER gu_admin_overlay_to_store_visibility_v20261028
AFTER INSERT OR UPDATE OF store_visible,lifecycle ON public.store_product_overrides_v014175
FOR EACH ROW
EXECUTE FUNCTION public.gu_sync_admin_store_visibility_v20261028();
