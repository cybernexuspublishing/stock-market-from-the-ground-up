-- v0.14.0.175 owner-managed prelaunch catalog overlays.
-- Isolation: never changes platform_plans, platform_tools, catalog_products or Stripe prices.
CREATE TABLE IF NOT EXISTS public.store_product_overrides_v014175 (
 sku text PRIMARY KEY CHECK (sku ~ '^[A-Z][A-Z0-9_-]{1,79}$'),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
 description text NOT NULL DEFAULT '' CHECK (length(description) <= 2400),
 store_visible boolean NOT NULL DEFAULT true,
 lifecycle text NOT NULL DEFAULT 'coming_soon' CHECK (lifecycle IN ('draft','coming_soon','paused','release_ready')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 CONSTRAINT no_sellable_status CHECK (lifecycle <> 'for_sale')
);
ALTER TABLE public.store_product_overrides_v014175 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_product_overrides_v014175 FROM anon, authenticated;
-- Uses existing service-role Admin API. No anon/client-side writes.
CREATE OR REPLACE FUNCTION public.store_product_overlay_save_v014175(
 p_actor uuid,p_sku text,p_title text,p_description text,
 p_store_visible boolean,p_lifecycle text,p_expected_version integer
) RETURNS public.store_product_overrides_v014175
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE outrow public.store_product_overrides_v014175;
BEGIN
 IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=p_actor AND role_code='OWNER' AND (expires_at IS NULL OR expires_at>now())) THEN
  RAISE EXCEPTION 'Owner authorization required' USING ERRCODE='42501';
 END IF;
 IF p_lifecycle NOT IN ('draft','coming_soon','paused','release_ready') OR p_lifecycle IS NULL THEN
  RAISE EXCEPTION 'For Sale is blocked: fulfillment, Stripe and owner live-payment approval required';
 END IF;
 IF p_sku !~ '^[A-Z][A-Z0-9_-]{1,79}$' OR trim(p_title)='' OR length(p_title)>160 OR length(coalesce(p_description,''))>2400 THEN
  RAISE EXCEPTION 'Invalid product input';
 END IF;
 IF p_expected_version=0 THEN
  INSERT INTO public.store_product_overrides_v014175(sku,title,description,store_visible,lifecycle,updated_by)
  VALUES(p_sku,p_title,coalesce(p_description,''),p_store_visible,p_lifecycle,p_actor)
  ON CONFLICT DO NOTHING RETURNING * INTO outrow;
 ELSE
  UPDATE public.store_product_overrides_v014175 SET title=p_title,description=coalesce(p_description,''),
    store_visible=p_store_visible,lifecycle=p_lifecycle,version=version+1,updated_by=p_actor,updated_at=now()
  WHERE sku=p_sku AND version=p_expected_version RETURNING * INTO outrow;
 END IF;
 IF outrow.sku IS NULL THEN RAISE EXCEPTION 'Product changed since loaded; reload to prevent overwrite' USING ERRCODE='40001'; END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES (p_actor,'store.product.overlay.save','product',p_sku,
 jsonb_build_object('version',outrow.version,'lifecycle',outrow.lifecycle,'visible',outrow.store_visible,'price_changed',false,'checkout_changed',false));
 RETURN outrow;
END; $$;
REVOKE ALL ON FUNCTION public.store_product_overlay_save_v014175(uuid,text,text,text,boolean,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_product_overlay_save_v014175(uuid,text,text,text,boolean,text,integer) TO service_role;
