BEGIN;
UPDATE public.gu_founder_plans_v014173
 SET included_sparks=CASE plan_code WHEN 'FOUNDING_14' THEN 10 WHEN 'FOUNDING_30' THEN 15 WHEN 'FOUNDING_60' THEN 20 END
 WHERE plan_code IN('FOUNDING_14','FOUNDING_30','FOUNDING_60') AND price_cents=CASE plan_code WHEN 'FOUNDING_14' THEN 2299 WHEN 'FOUNDING_30' THEN 4999 WHEN 'FOUNDING_60' THEN 5999 END;
DO $$BEGIN
 IF EXISTS(SELECT 1 FROM public.gu_founder_plans_v014173 WHERE (plan_code='FOUNDING_14' AND included_sparks<>10)
 OR (plan_code='FOUNDING_30' AND included_sparks<>15) OR (plan_code='FOUNDING_60' AND included_sparks<>20)) THEN
 RAISE EXCEPTION 'FOUNDER_SPARKS_CONTRACT_MISMATCH'; END IF;
END $$;
UPDATE public.platform_plans SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{included_sparks}',
 to_jsonb(CASE plan_code WHEN 'FOUNDING_14' THEN 10 WHEN 'FOUNDING_30' THEN 15 WHEN 'FOUNDING_60' THEN 20 END),true),
 updated_at=now() WHERE plan_code IN ('FOUNDING_14','FOUNDING_30','FOUNDING_60');
COMMIT;