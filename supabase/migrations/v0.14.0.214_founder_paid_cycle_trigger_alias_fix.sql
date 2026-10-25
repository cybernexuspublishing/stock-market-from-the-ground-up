-- v0.14.0.214: repair PostgreSQL trigger alias ambiguity discovered in rolled-back first-invoice acceptance test.
CREATE OR REPLACE FUNCTION public.gu_founder_paid_cycle_guard_v014202()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $guard$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.gu_founder_reservations_v014173 r
  WHERE r.user_id=NEW.user_id
   AND r.checkout_subscription_id=NEW.stripe_subscription_id
   AND r.reservation_state='consumed'
   AND r.plan_code=NEW.plan_code
   AND r.recurring_consent_at IS NOT NULL
   AND r.terms_version='F600-2026-10-24'
 )
 THEN RAISE EXCEPTION 'FOUNDER_RECURRING_CONSENT_OR_BINDING_MISSING';END IF;
 IF EXISTS(
  SELECT 1 FROM public.gu_founder_paid_cycles_v014173 earlier_cycle
  WHERE earlier_cycle.stripe_subscription_id=NEW.stripe_subscription_id
   AND earlier_cycle.billing_end>=NEW.billing_end
 )
 THEN RAISE EXCEPTION 'FOUNDER_STALE_BILLING_PERIOD';END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.gu_founder_paid_cycle_guard_v014202() FROM PUBLIC,anon,authenticated;
