-- Existing Store catalog, visible terms with all LIVE sale gates closed.
BEGIN;
INSERT INTO public.gu_storefront_items_v014174
 (sku,category,display_name,description,price_label,duration_label,product_page,
  status,visible,sale_ready,display_order)
VALUES
 ('addon:CHART_ADVANCED_30D','addon','Crownlight Chart Studio Advanced — 30 Days',
  'One-time, nonrenewing 30-day Advanced and Standard chart access. Membership and Lumens remain unchanged. No historical data license.',
  '$9.99 one-time','30 days','store.html','listed',true,false,180),
 ('addon:CHART_PROFESSIONAL_30D','addon','Crownlight Chart Studio Professional — 30 Days',
  'One-time, nonrenewing 30-day Professional, Advanced and Standard chart access. Membership and Lumens remain unchanged. No historical data license.',
  '$19.99 one-time','30 days','store.html','listed',true,false,181)
ON CONFLICT (sku) DO NOTHING;
COMMIT;
