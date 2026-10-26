-- 2026-10-26 | Founding 600 member-facing official policy correction
-- Existing official published topic bodies only; no member replies, user identity,
-- founder entitlements, signup, Stripe or private financial records modified.
-- Source of truth: approved founder contract and v0.14.0.274/.275 applied guards.
BEGIN;
DO $guard$
DECLARE v_count integer;
BEGIN
 IF EXISTS (SELECT 1 FROM public.gu_founder_plans_v014173
   WHERE plan_code='FOUNDING_60' AND purchase_discount_bps<>1500)
 OR NOT EXISTS (SELECT 1 FROM public.gu_founder_plans_v014173
   WHERE plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=1500)
 THEN RAISE EXCEPTION 'Approved 15-percent founder contract is not active'; END IF;
 SELECT count(*) INTO v_count FROM public.commons_topics
 WHERE legacy_source_code IN ('F600_OFFICIAL_V1_02','F600_OFFICIAL_V1_22')
   AND author_label='Official Founders Team' AND is_official=true
   AND status='published' AND body LIKE '%20% Extended%';
 IF v_count<>2 THEN RAISE EXCEPTION 'Official topic baseline mismatch; refusing broad rewrite (%)',v_count; END IF;
END $guard$;
UPDATE public.commons_topics
SET body=replace(body,'20% Extended','15% Extended')
WHERE legacy_source_code IN ('F600_OFFICIAL_V1_02','F600_OFFICIAL_V1_22')
  AND author_label='Official Founders Team' AND is_official=true
  AND status='published' AND body LIKE '%20% Extended%';
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM public.commons_topics
 WHERE legacy_source_code IN ('F600_OFFICIAL_V1_02','F600_OFFICIAL_V1_22')
 AND is_official=true AND status='published' AND body LIKE '%15% Extended%')<>2
 THEN RAISE EXCEPTION 'Official correction postflight failed'; END IF;
END $postflight$;
COMMIT;
