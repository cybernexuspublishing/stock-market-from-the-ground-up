BEGIN;
INSERT INTO public.ad_placements(placement_code,name,description,page_pattern,slot_position,active,free_only,dimensions,sort_order,metadata)
VALUES
('ALL_PRODUCTS_LEFT','All Products · left rail','Contextual product-catalog left rail','/store-all-products.html','left',true,false,'160x300',130,'{"carousel_enabled":false}'::jsonb),
('ALL_PRODUCTS_RIGHT','All Products · right rail','Contextual product-catalog right rail','/store-all-products.html','right',true,false,'160x300',131,'{"carousel_enabled":false}'::jsonb),
('ALL_PRODUCTS_BOTTOM','All Products · bottom banner','Contextual product-catalog footer banner','/store-all-products.html','bottom',true,false,'728x120',132,'{"carousel_enabled":false}'::jsonb)
ON CONFLICT (placement_code) DO UPDATE SET active=true,metadata=EXCLUDED.metadata;
UPDATE public.plan_ad_policies
SET allowed_slots=ARRAY(SELECT DISTINCT slot FROM unnest(allowed_slots||ARRAY['ALL_PRODUCTS_LEFT','ALL_PRODUCTS_RIGHT','ALL_PRODUCTS_BOTTOM']::text[]) AS slot ORDER BY slot),updated_at=now()
WHERE ads_enabled=true;
COMMIT;