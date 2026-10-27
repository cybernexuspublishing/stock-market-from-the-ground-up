BEGIN;
ALTER TABLE public.gu_founder_plans_v014173 DROP CONSTRAINT gu_founder_plans_v014173_check;
ALTER TABLE public.gu_founder_plans_v014173 ADD CONSTRAINT gu_founder_plans_v014173_check
CHECK (
(plan_code='FOUNDING_14' AND price_cents=2299 AND term_days=14 AND purchase_discount_bps=500 AND included_sparks=10 AND sparks_expiry_after_term_days=60)
OR (plan_code='FOUNDING_30' AND price_cents=4999 AND term_days=30 AND purchase_discount_bps=1000 AND included_sparks=15 AND sparks_expiry_after_term_days=90)
OR (plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=1500 AND included_sparks=20 AND sparks_expiry_after_term_days=150)
) NOT VALID;
UPDATE public.gu_founder_plans_v014173 SET included_sparks=CASE plan_code
WHEN 'FOUNDING_14' THEN 10 WHEN 'FOUNDING_30' THEN 15 WHEN 'FOUNDING_60' THEN 20 END
WHERE plan_code IN('FOUNDING_14','FOUNDING_30','FOUNDING_60');
ALTER TABLE public.gu_founder_plans_v014173 VALIDATE CONSTRAINT gu_founder_plans_v014173_check;
UPDATE public.platform_plans SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{included_sparks}',
to_jsonb(CASE plan_code WHEN 'FOUNDING_14' THEN 10 WHEN 'FOUNDING_30' THEN 15 WHEN 'FOUNDING_60' THEN 20 END),true),
updated_at=now() WHERE plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60');
COMMIT;