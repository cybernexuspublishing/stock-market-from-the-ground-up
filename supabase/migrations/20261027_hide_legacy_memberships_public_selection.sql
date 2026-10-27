BEGIN;
UPDATE public.platform_plans
SET public_visible=false,updated_at=now()
WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY');
UPDATE public.gu_storefront_items_v014174
SET visible=false
WHERE sku IN ('plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY');
DO $$ BEGIN
IF EXISTS(SELECT 1 FROM public.platform_plans WHERE plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY') AND public_visible=true)
OR EXISTS(SELECT 1 FROM public.gu_storefront_items_v014174 WHERE sku IN ('plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY') AND visible=true)
THEN RAISE EXCEPTION 'LEGACY_MEMBERSHIPS_STILL_PUBLIC'; END IF;
END $$;
COMMIT;