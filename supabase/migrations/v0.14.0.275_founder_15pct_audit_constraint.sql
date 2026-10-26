-- Gate 2 follow-on: correct audit ledger to 10%/15%; no payment activation.
BEGIN;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.gu_founder_release_v014173
             WHERE enrollment_enabled OR billing_enabled OR fulfillment_enabled)
 OR EXISTS (SELECT 1 FROM public.gu_founder_plans_v014173 WHERE checkout_enabled)
 THEN RAISE EXCEPTION 'F600_RELEASE_MUST_REMAIN_CLOSED'; END IF;
 IF EXISTS (SELECT 1 FROM public.gu_founder_discount_audit_v014173
            WHERE discount_bps NOT IN (1000,1500))
 THEN RAISE EXCEPTION 'AUDIT_CONTAINS_UNRECONCILED_20PCT_ROWS'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.gu_founder_plans_v014173
                WHERE plan_code='FOUNDING_60' AND purchase_discount_bps=1500)
 THEN RAISE EXCEPTION 'PREREQUISITE_15PCT_PLAN_MISSING'; END IF;
END $$;
ALTER TABLE public.gu_founder_discount_audit_v014173
 DROP CONSTRAINT gu_founder_discount_audit_v014173_discount_bps_check;
ALTER TABLE public.gu_founder_discount_audit_v014173
 ADD CONSTRAINT gu_founder_discount_audit_v014173_discount_bps_check
 CHECK (discount_bps IN (1000,1500));
COMMIT;
