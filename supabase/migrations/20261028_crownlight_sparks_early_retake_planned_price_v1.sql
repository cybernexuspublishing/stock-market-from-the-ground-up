-- SMFGU-SKPRICE-20261028-002
-- Approved previously: early final-assessment retake 5 Sparks during a protected cooldown.
-- No protected assessment-retake redemption has passed acceptance, therefore PLANNED only.
BEGIN;
INSERT INTO public.gu_sparks_price_catalog_v1
 (sku,category,label,description,sparks_cost,duration_hours,fulfillment,state)
VALUES
 ('ASSESSMENT_EARLY_RETAKE','PRACTICE',
  'Early protected final-assessment retake',
  'One eligible early assessment retake during the 36-hour cooldown; only after a guarded retake workflow is implemented',
  5,NULL,'UNINTEGRATED','planned')
ON CONFLICT (sku) DO NOTHING;
COMMIT;
