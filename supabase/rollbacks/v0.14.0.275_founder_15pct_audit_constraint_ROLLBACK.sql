-- ROLLBACK ONLY before public launch and if no 15%-audit records exist.
BEGIN;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.gu_founder_release_v014173
            WHERE enrollment_enabled OR billing_enabled OR fulfillment_enabled)
 OR EXISTS (SELECT 1 FROM public.gu_founder_discount_audit_v014173 WHERE discount_bps=1500)
 THEN RAISE EXCEPTION 'ROLLBACK_NOT_SAFE_WHILE_ACTIVE_OR_15PCT_AUDIT_EXISTS'; END IF;
END $$;
ALTER TABLE public.gu_founder_discount_audit_v014173
 DROP CONSTRAINT gu_founder_discount_audit_v014173_discount_bps_check;
ALTER TABLE public.gu_founder_discount_audit_v014173
 ADD CONSTRAINT gu_founder_discount_audit_v014173_discount_bps_check
 CHECK (discount_bps IN (1000,2000));
COMMIT;