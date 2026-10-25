-- v0.14.0.202: double-check signed recurring consent and invoice chronology
-- inside PostgreSQL before any Founding 600 included Sparks can be granted.
-- Enrollment and fulfillment remain disabled by independent release switches.
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
  SELECT 1 FROM public.gu_founder_paid_cycles_v014173 old
  WHERE old.stripe_subscription_id=NEW.stripe_subscription_id
   AND old.billing_end>=NEW.billing_end
 )
 THEN RAISE EXCEPTION 'FOUNDER_STALE_BILLING_PERIOD';END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.gu_founder_paid_cycle_guard_v014202() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_founder_paid_cycle_guard_v014202 ON public.gu_founder_paid_cycles_v014173;
CREATE TRIGGER gu_founder_paid_cycle_guard_v014202
BEFORE INSERT ON public.gu_founder_paid_cycles_v014173
FOR EACH ROW EXECUTE FUNCTION public.gu_founder_paid_cycle_guard_v014202();
