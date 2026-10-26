-- Production READ ONLY: inspect exact member-facing labels and no-change invariants.
BEGIN READ ONLY;
SELECT sku,display_name,description,price_label,duration_label,visible,sale_ready,version
 FROM public.gu_storefront_items_v014174
 WHERE sku IN ('founding:FOUNDING_30','founding:FOUNDING_60') ORDER BY sku;
SELECT plan_code,name,description,price_cents,checkout_enabled
 FROM public.platform_plans
 WHERE plan_code IN ('FOUNDING_30','FOUNDING_60') ORDER BY plan_code;
SELECT plan_code,price_cents,term_days,purchase_discount_bps,checkout_enabled
 FROM public.gu_founder_plans_v014173 WHERE plan_code IN ('FOUNDING_30','FOUNDING_60');
SELECT enrollment_enabled,billing_enabled,fulfillment_enabled FROM public.gu_founder_release_v014173;
ROLLBACK;
