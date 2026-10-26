-- Controlled rollback for the FOUR naming fields only. Do not execute
-- casually: it reintroduces a member-visible label the Owner has withdrawn.
-- Kept solely to make the change reversible under a reviewed emergency.
BEGIN;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM public.gu_founder_release_v014173
  WHERE enrollment_enabled OR billing_enabled OR fulfillment_enabled)
 THEN RAISE EXCEPTION 'ROLLBACK_REQUIRES_DISABLED_FOUNDING_RELEASE'; END IF;
 UPDATE public.platform_plans SET
  name='Founding 600 Standard',
  description='Original 600-seat educational platform subscription: recurring every 30 days.',
  updated_at=now()
 WHERE plan_code='FOUNDING_30' AND name='Founding Members Standard';
 UPDATE public.platform_plans SET
  name='Founding 600 Extended',
  description='Original 600-seat educational platform subscription: recurring every 60 days.',
  updated_at=now()
 WHERE plan_code='FOUNDING_60' AND name='Founding Members Extended';
 UPDATE public.gu_storefront_items_v014174 SET
  display_name='Founding 600 — Standard 30 Days',
  description='30-day renewable Founding 600 educational membership; eligible 10% discount on qualifying separate first-party purchases, including Lifetime.',
  version=version+1,updated_at=now()
 WHERE sku='founding:FOUNDING_30' AND display_name='Founding Members — Standard 30 Days' AND sale_ready=false;
 UPDATE public.gu_storefront_items_v014174 SET
  display_name='Founding 600 — Extended 60 Days',
  description='60-day renewable premium Founding 600 educational membership; eligible 15% discount on qualifying separate first-party purchases, including Lifetime.',
  version=version+1,updated_at=now()
 WHERE sku='founding:FOUNDING_60' AND display_name='Founding Members — Extended 60 Days' AND sale_ready=false;
 INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
 VALUES ('founding_member_display_copy_emergency_rollback','membership_catalog',
         'FOUNDING_30+FOUNDING_60',
         jsonb_build_object('reason','Explicit Owner-reviewed emergency rollback of display copy; does not change payments, prices or entitlements'));
END $rollback$;
COMMIT;
