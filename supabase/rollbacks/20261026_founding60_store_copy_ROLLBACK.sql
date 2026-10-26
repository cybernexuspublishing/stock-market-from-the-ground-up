-- Emergency fail-closed rollback for the one-row 15% Store copy correction.
-- Never restore the known-false 20% benefit. Temporarily hide/hold the listing
-- until a reviewed, truthful replacement description is approved.
-- No LIVE payment/entitlement action; requires all founder release switches OFF.
BEGIN;
DO $rollback$
DECLARE r public.gu_storefront_items_v014174%ROWTYPE;
BEGIN
 IF (SELECT count(*) FROM public.gu_founder_release_v014173
      WHERE enrollment_enabled=false AND billing_enabled=false AND fulfillment_enabled=false)<>1
 THEN RAISE EXCEPTION 'Rollback blocked: founding release is not fully held'; END IF;
 SELECT * INTO r FROM public.gu_storefront_items_v014174
 WHERE sku='founding:FOUNDING_60' FOR UPDATE;
 IF NOT FOUND OR r.sale_ready=true THEN
   RAISE EXCEPTION 'Rollback blocked: missing or sale-ready listing';
 END IF;
 IF r.description NOT LIKE '%eligible 15% discount%' THEN
   RAISE EXCEPTION 'Rollback requires an independently inspected 15-percent description';
 END IF;
 UPDATE public.gu_storefront_items_v014174
 SET visible=false,status='coming_soon',sale_ready=false,version=version+1,updated_at=now()
 WHERE sku='founding:FOUNDING_60';
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(NULL,'release.founding60.store_copy_emergency_hold','store_catalog','founding:FOUNDING_60',
   jsonb_build_object('reason','Emergency fail-closed rollback; do not restore erroneous 20% advertising',
                      'visible',false,'payment_changed',false));
END $rollback$;
COMMIT;
