-- Founding 600 / October 26, 2026. Correct one stale Store description.
-- Commercial truth: 60-Day = USD 59.99/60 days, 15% on eligible separate purchases.
-- A one-row, guarded, idempotent catalog data repair; no Stripe, prices,
-- billing, entitlements, member records, public permission, or LIVE flag changed.
-- Preflight: run supabase/admin/20261026_founding60_store_copy_PREFLIGHT_READ_ONLY.sql
-- Emergency rollback: supabase/rollbacks/20261026_founding60_store_copy_ROLLBACK.sql
BEGIN;
DO $repair$
DECLARE
  r public.gu_storefront_items_v014174%ROWTYPE;
  original_copy CONSTANT text := '60-day renewable premium Founding 600 educational membership; eligible 20% discount on qualifying separate first-party purchases, including Lifetime.';
  approved_copy CONSTANT text := '60-day renewable premium Founding 600 educational membership; eligible 15% discount on qualifying separate first-party purchases, including Lifetime.';
BEGIN
  IF (SELECT count(*) FROM public.gu_founder_plans_v014173
      WHERE plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60
        AND purchase_discount_bps=1500 AND checkout_enabled=false) <> 1
     OR (SELECT count(*) FROM public.gu_founder_release_v014173
         WHERE enrollment_enabled=false AND billing_enabled=false AND fulfillment_enabled=false) <> 1
  THEN
    RAISE EXCEPTION 'Founding policy or release hold differs; catalog correction aborted';
  END IF;

  SELECT * INTO r FROM public.gu_storefront_items_v014174
   WHERE sku='founding:FOUNDING_60' FOR UPDATE;
  IF NOT FOUND OR r.category <> 'founding' OR r.sale_ready <> false OR r.status <> 'coming_soon' THEN
    RAISE EXCEPTION 'Founding 60-Day listing missing or commercially activated; manual review required';
  END IF;

  IF r.description = approved_copy THEN
    RETURN; -- Already corrected. Do not increment revision or duplicate audit.
  END IF;
  IF r.description <> original_copy THEN
    RAISE EXCEPTION 'Founding 60-Day description changed unexpectedly; refusing blind replacement';
  END IF;

  UPDATE public.gu_storefront_items_v014174
     SET description=approved_copy, version=version+1, updated_at=now()
   WHERE sku='founding:FOUNDING_60' AND description=original_copy;

  INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
   VALUES (NULL,'release.founding60.store_copy_15pct','store_catalog','founding:FOUNDING_60',
     jsonb_build_object('source','20261026_founding60_store_copy_15pct_alignment',
       'previous_description',original_copy,'approved_description',approved_copy,
       'database_release_flags_changed',false,'provider_payment_changed',false));

  IF (SELECT count(*) FROM public.gu_storefront_items_v014174
      WHERE sku='founding:FOUNDING_60' AND description=approved_copy
        AND sale_ready=false AND status='coming_soon') <> 1 THEN
    RAISE EXCEPTION 'Postflight: approved 15-percent Store description not verified';
  END IF;
END $repair$;
COMMIT;
