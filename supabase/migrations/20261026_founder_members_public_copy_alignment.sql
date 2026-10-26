-- Member-facing Founding 600 -> Founding Members, without changing plan identity,
-- pricing, discounts, founder capacity, billing, enrollment or entitlements.
-- Guarded transaction: both original public rows and plan codes must match.
BEGIN;
DO $migration$
DECLARE p30 public.platform_plans%ROWTYPE;
        p60 public.platform_plans%ROWTYPE;
        s30 public.gu_storefront_items_v014174%ROWTYPE;
        s60 public.gu_storefront_items_v014174%ROWTYPE;
        changed boolean := false;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.gu_founder_release_v014173
  WHERE enrollment_enabled=false AND billing_enabled=false AND fulfillment_enabled=false)
 THEN RAISE EXCEPTION 'FOUNDING_LIVE_SHUTDOWN_NOT_PROVEN'; END IF;

 SELECT * INTO p30 FROM public.platform_plans WHERE plan_code='FOUNDING_30' FOR UPDATE;
 SELECT * INTO p60 FROM public.platform_plans WHERE plan_code='FOUNDING_60' FOR UPDATE;
 SELECT * INTO s30 FROM public.gu_storefront_items_v014174 WHERE sku='founding:FOUNDING_30' FOR UPDATE;
 SELECT * INTO s60 FROM public.gu_storefront_items_v014174 WHERE sku='founding:FOUNDING_60' FOR UPDATE;
 IF p30.plan_code IS NULL OR p60.plan_code IS NULL OR s30.sku IS NULL OR s60.sku IS NULL
 THEN RAISE EXCEPTION 'MISSING_REQUIRED_FOUNDER_CATALOG_ROWS'; END IF;

 IF (p30.name,p30.description) NOT IN (
   ('Founding 600 Standard','Original 600-seat educational platform subscription: recurring every 30 days.'),
   ('Founding Members Standard','Founding Members educational subscription: recurring every 30 days.'))
 OR (p60.name,p60.description) NOT IN (
   ('Founding 600 Extended','Original 600-seat educational platform subscription: recurring every 60 days.'),
   ('Founding Members Extended','Founding Members educational subscription: recurring every 60 days.'))
 OR (s30.display_name,s30.description) NOT IN (
   ('Founding 600 — Standard 30 Days','30-day renewable Founding 600 educational membership; eligible 10% discount on qualifying separate first-party purchases, including Lifetime.'),
   ('Founding Members — Standard 30 Days','30-day renewable Founding Members educational membership; eligible 10% discount on qualifying separate first-party purchases, including Lifetime.'))
 OR (s60.display_name,s60.description) NOT IN (
   ('Founding 600 — Extended 60 Days','60-day renewable premium Founding 600 educational membership; eligible 15% discount on qualifying separate first-party purchases, including Lifetime.'),
   ('Founding Members — Extended 60 Days','60-day renewable premium Founding Members educational membership; eligible 15% discount on qualifying separate first-party purchases, including Lifetime.'))
 THEN RAISE EXCEPTION 'PUBLIC_FOUNDER_COPY_DRIFT_REVIEW_REQUIRED'; END IF;

 IF EXISTS (SELECT 1 FROM public.gu_storefront_items_v014174
   WHERE sku IN('founding:FOUNDING_30','founding:FOUNDING_60') AND sale_ready)
 THEN RAISE EXCEPTION 'NO_COPY_CHANGE_DURING_SALE'; END IF;
 IF EXISTS (SELECT 1 FROM public.gu_founder_plans_v014173
  WHERE plan_code IN ('FOUNDING_30','FOUNDING_60')
   AND ((plan_code='FOUNDING_30' AND (price_cents<>4999 OR term_days<>30 OR purchase_discount_bps<>1000))
     OR (plan_code='FOUNDING_60' AND (price_cents<>5999 OR term_days<>60 OR purchase_discount_bps<>1500))))
 THEN RAISE EXCEPTION 'FOUNDER_COMMERCIAL_TERMS_MISMATCH'; END IF;

 UPDATE public.platform_plans
  SET name='Founding Members Standard',
      description='Founding Members educational subscription: recurring every 30 days.',
      updated_at=now()
  WHERE plan_code='FOUNDING_30' AND name='Founding 600 Standard';
 IF FOUND THEN changed := true; END IF;
 UPDATE public.platform_plans
  SET name='Founding Members Extended',
      description='Founding Members educational subscription: recurring every 60 days.',
      updated_at=now()
  WHERE plan_code='FOUNDING_60' AND name='Founding 600 Extended';
 IF FOUND THEN changed := true; END IF;
 UPDATE public.gu_storefront_items_v014174
  SET display_name='Founding Members — Standard 30 Days',
      description='30-day renewable Founding Members educational membership; eligible 10% discount on qualifying separate first-party purchases, including Lifetime.',
      version=version+1,updated_at=now()
  WHERE sku='founding:FOUNDING_30' AND display_name='Founding 600 — Standard 30 Days';
 IF FOUND THEN changed := true; END IF;
 UPDATE public.gu_storefront_items_v014174
  SET display_name='Founding Members — Extended 60 Days',
      description='60-day renewable premium Founding Members educational membership; eligible 15% discount on qualifying separate first-party purchases, including Lifetime.',
      version=version+1,updated_at=now()
  WHERE sku='founding:FOUNDING_60' AND display_name='Founding 600 — Extended 60 Days';
 IF FOUND THEN changed := true; END IF;

 IF changed THEN
  INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
  VALUES ('founding_member_display_copy_alignment','membership_catalog',
          'FOUNDING_30+FOUNDING_60',
          jsonb_build_object('reason','Owner restricted Founding 600 capacity/label to internal Admin roles',
          'member_label','Founding Members','skus',jsonb_build_array(s30.sku,s60.sku),
          'previous_plan_labels',jsonb_build_array(p30.name,p60.name),
          'previous_display_labels',jsonb_build_array(s30.display_name,s60.display_name),
          'prices_unchanged',true,'live_payment_controls_unchanged',true));
 END IF;
END $migration$;
COMMIT;
