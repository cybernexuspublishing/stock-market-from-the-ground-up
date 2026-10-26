-- PREPARED BUT NOT EXECUTED. Requires explicit Owner approval and a backup.
-- Restore the previously audited visibility state only. Intentionally do not
-- restore old checkout_enabled=true values without a separate payment-launch
-- authorization, since that could reopen legacy sales unexpectedly.
BEGIN;
DO $pre$
BEGIN
 IF (SELECT count(*) FROM public.platform_plans WHERE public_visible=true
 AND plan_code IN('FOUNDING_30','FOUNDING_60'))<>2
 THEN RAISE EXCEPTION 'Founders-only baseline no longer intact; review before rollback'; END IF;
END $pre$;
UPDATE public.platform_plans
SET public_visible=CASE plan_code WHEN 'FREE' THEN true
 WHEN 'FULL_MONTHLY' THEN true WHEN 'FULL_ANNUAL' THEN true
 WHEN 'LIFETIME' THEN true WHEN 'ONDEMAND_MONTHLY' THEN true
 WHEN 'PICK_WHAT_YOU_WANT' THEN true ELSE false END,
 updated_at=now()
WHERE plan_code IN('FOUNDING_30','FOUNDING_60','FREE','FULL_MONTHLY','FULL_ANNUAL',
 'LIFETIME','ONDEMAND_MONTHLY','PICK_WHAT_YOU_WANT');
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('commerce.store.founding_only_visibility.rollback','platform_plans','all',
jsonb_build_object('reason','Owner-approved rollback of visibility only',
 'restores_legacy_checkout',false,'member_entitlement_change',false,
 'requires_separate_checkout_review',true,'original_audit_id',76));
COMMIT;
