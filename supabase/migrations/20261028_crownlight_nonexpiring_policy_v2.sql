-- Owner-approved non-expiring Crownlight Sparks, effective V2.
-- Do not restore previously expired balances. Do not alter payment entitlements.
BEGIN;
UPDATE public.groundup_question_pass_buckets
 SET remaining_credits=0
 WHERE expires_at IS NOT NULL AND expires_at<=transaction_timestamp()
  AND remaining_credits>0;
UPDATE public.groundup_question_pass_buckets SET expires_at=NULL WHERE expires_at IS NOT NULL;
ALTER TABLE public.groundup_question_pass_buckets
 DROP CONSTRAINT IF EXISTS groundup_qp_expiration_policy;
ALTER TABLE public.groundup_question_pass_buckets
 ADD CONSTRAINT groundup_qp_expiration_policy CHECK (expires_at IS NULL);
-- Top up only previously issued two-Spark Free monthly grants to five,
-- preserving already-spent amounts and unique origin keys.
UPDATE public.groundup_question_pass_buckets
 SET initial_credits=5,remaining_credits=remaining_credits+3
 WHERE source='free_included' AND initial_credits=2;
COMMIT;
