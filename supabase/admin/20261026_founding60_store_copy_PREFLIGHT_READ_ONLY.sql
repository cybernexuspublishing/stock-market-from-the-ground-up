-- Run against the ONE existing production Supabase project. Read-only.
BEGIN READ ONLY;
SELECT p.plan_code,p.term_days,p.price_cents,p.purchase_discount_bps,p.checkout_enabled
FROM public.gu_founder_plans_v014173 p WHERE p.plan_code IN ('FOUNDING_30','FOUNDING_60') ORDER BY p.plan_code;
SELECT enrollment_enabled,billing_enabled,fulfillment_enabled FROM public.gu_founder_release_v014173;
SELECT sku,category,status,visible,sale_ready,description,version FROM public.gu_storefront_items_v014174
 WHERE sku IN ('founding:FOUNDING_30','founding:FOUNDING_60') ORDER BY sku;
SELECT count(*) AS correction_audit_rows FROM public.admin_audit_log
 WHERE action='release.founding60.store_copy_15pct' AND target_id='founding:FOUNDING_60';
ROLLBACK;
