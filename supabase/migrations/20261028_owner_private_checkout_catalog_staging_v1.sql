-- Owner instruction 2026-10-28: prepare all member checkout catalogue slots,
-- hide unsold entries by default, and preserve separate payment-launch checks.
-- This does NOT enable LIVE Stripe, write prices, or grant entitlements.
BEGIN;
WITH owner_identity AS (
 SELECT user_id FROM public.admin_user_roles WHERE role_code='OWNER'
 AND (expires_at IS NULL OR expires_at>now()) ORDER BY granted_at LIMIT 1
), starter AS (
 INSERT INTO public.gu_storefront_items_v014174
 (sku,category,display_name,description,price_label,duration_label,product_page,status,visible,sale_ready,display_order)
 SELECT 'founding:FOUNDING_14','founding','Founding Members — Starter 14 Days',
 'Staged 14-day Founding membership; not open for enrollment','$22.99','Every 14 days',
 'founding600.html','coming_soon',false,false,400
 WHERE NOT EXISTS (SELECT 1 FROM public.gu_storefront_items_v014174 WHERE sku='founding:FOUNDING_14')
 ON CONFLICT DO NOTHING RETURNING sku
), starter_override AS (
 INSERT INTO public.store_product_overrides_v014175(sku,title,description,store_visible,lifecycle)
 SELECT 'FOUNDING_14','Founding 600 — Starter 14 Days',
 'Staged 14-day membership. Owner review and LIVE merchant acceptance required.',false,'coming_soon'
 WHERE NOT EXISTS (SELECT 1 FROM public.store_product_overrides_v014175 WHERE sku='FOUNDING_14')
 ON CONFLICT DO NOTHING RETURNING sku
), existing_founder AS (
 UPDATE public.gu_storefront_items_v014174
 SET visible=false,sale_ready=false,status='coming_soon',updated_at=now(),version=version+1
 WHERE sku IN ('founding:FOUNDING_30','founding:FOUNDING_60')
 AND (visible IS DISTINCT FROM false OR sale_ready IS DISTINCT FROM false OR status<>'coming_soon')
 RETURNING sku
), off_sale_overrides AS (
 UPDATE public.store_product_overrides_v014175
 SET store_visible=false,version=version+1,updated_at=now()
 WHERE lifecycle='coming_soon' AND store_visible=true
 RETURNING sku
), staged_plans AS (
 UPDATE public.platform_plans SET public_visible=false,updated_at=now()
 WHERE plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60') AND checkout_enabled=false
 AND public_visible=true RETURNING plan_code
), audit AS (
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 SELECT (SELECT user_id FROM owner_identity),'commerce.owner_hidden_staged_catalog_v1','catalog','F600_AND_UPCOMING',
 jsonb_build_object('founder14_seeded',(SELECT count(*) FROM starter),'founder14_override_seeded',(SELECT count(*) FROM starter_override),
 'founder_offers_hidden',(SELECT count(*) FROM existing_founder),'upcoming_hidden',(SELECT count(*) FROM off_sale_overrides),
 'founder_platform_plans_hidden',(SELECT count(*) FROM staged_plans),'live_payment_activated',false,'method','admin_publication_required')
 WHERE (SELECT count(*) FROM starter)+(SELECT count(*) FROM starter_override)+(SELECT count(*) FROM existing_founder)
 +(SELECT count(*) FROM off_sale_overrides)+(SELECT count(*) FROM staged_plans)>0
 RETURNING id
)
SELECT jsonb_build_object('founder14_seeded',(SELECT count(*) FROM starter),
'founder14_override_seeded',(SELECT count(*) FROM starter_override),
'founder_visible_removed',(SELECT count(*) FROM existing_founder),
'unreleased_overrides_hidden',(SELECT count(*) FROM off_sale_overrides),
'founder_plans_hidden',(SELECT count(*) FROM staged_plans),'audits',(SELECT count(*) FROM audit)) result;
COMMIT;