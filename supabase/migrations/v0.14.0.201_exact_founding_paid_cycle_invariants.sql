-- v0.14.0.201 Guard exact Founding 600 paid-cycle price and Sparks pairs.
-- This schema change does not enable checkout or create paid entitlements.
ALTER TABLE public.gu_founder_paid_cycles_v014173
 ADD CONSTRAINT gu_founder_exact_cycle_price_v014201 CHECK (
  (plan_code='FOUNDING_30' AND price_cents=4999 AND granted_sparks=5)
  OR (plan_code='FOUNDING_60' AND price_cents=5999 AND granted_sparks=15)
 );
