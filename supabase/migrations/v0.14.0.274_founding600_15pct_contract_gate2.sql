-- Transactional founder discount 2000 -> 1500 basis points, with no LIVE activation.
BEGIN;
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM public.gu_founder_members_v014173)
 OR EXISTS(SELECT 1 FROM public.gu_founder_reservations_v014173)
 OR EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173)
 THEN RAISE EXCEPTION 'FOUNDER_DISCOUNT_REQUIRES_EMPTY_PRELAUNCH_LEDGERS'; END IF;
 IF EXISTS(SELECT 1 FROM public.gu_founder_release_v014173 WHERE enrollment_enabled OR billing_enabled OR fulfillment_enabled)
 OR EXISTS(SELECT 1 FROM public.gu_founder_plans_v014173 WHERE checkout_enabled)
 THEN RAISE EXCEPTION 'FOUNDER_DISCOUNT_REQUIRES_ALL_LAUNCH_FLAGS_OFF'; END IF;
END $guard$;
DO $expected$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_plans_v014173 WHERE plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=2000)
 OR (SELECT count(*) FROM public.gu_founder_plans_v014173)<>2
 THEN RAISE EXCEPTION 'UNEXPECTED_F600_BASELINE'; END IF;
END $expected$;
ALTER TABLE public.gu_founder_plans_v014173 DROP CONSTRAINT gu_founder_plans_v014173_check;
ALTER TABLE public.gu_founder_members_v014173 DROP CONSTRAINT gu_founder_members_v014173_vested_discount_bps_check;
UPDATE public.gu_founder_plans_v014173 SET purchase_discount_bps=1500 WHERE plan_code='FOUNDING_60';
ALTER TABLE public.gu_founder_plans_v014173 ADD CONSTRAINT gu_founder_plans_v014173_check CHECK (
 (plan_code='FOUNDING_30' AND price_cents=4999 AND term_days=30 AND purchase_discount_bps=1000 AND included_sparks=5 AND sparks_expiry_after_term_days=90)
 OR (plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=1500 AND included_sparks=15 AND sparks_expiry_after_term_days=150));
ALTER TABLE public.gu_founder_members_v014173 ADD CONSTRAINT gu_founder_members_v014173_vested_discount_bps_check CHECK (vested_discount_bps IN (0,1000,1500));
DO $function$ DECLARE old_def text; new_def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO old_def FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
 WHERE n.nspname='public' AND p.proname='gu_founder_discount_eligibility_v014221';
 IF old_def IS NULL OR position('THEN 2000' in old_def)=0 OR position('THEN 1500' in old_def)>0
 THEN RAISE EXCEPTION 'UNEXPECTED_DISCOUNT_FUNCTION_BASELINE'; END IF;
 new_def:=replace(old_def,'THEN 2000','THEN 1500');
 EXECUTE new_def;
END $function$;
DO $post$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_plans_v014173 WHERE plan_code='FOUNDING_60' AND price_cents=5999 AND term_days=60 AND purchase_discount_bps=1500 AND checkout_enabled=false)
 OR NOT EXISTS(SELECT 1 FROM public.gu_founder_plans_v014173 WHERE plan_code='FOUNDING_30' AND price_cents=4999 AND term_days=30 AND purchase_discount_bps=1000 AND checkout_enabled=false)
 THEN RAISE EXCEPTION 'FOUNDER_DISCOUNT_POSTCONDITION_FAILED'; END IF;
END $post$;
COMMIT;
