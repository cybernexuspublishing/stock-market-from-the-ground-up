-- v0.14.0.128 | OWNER REVIEW REQUIRED | existing single Supabase project.
-- Specific defect repair, NOT a reinstall of v123/v124 or an entitlement change:
-- claim_notices v123 selects exhausted expired leases (attempts = 12), but its
-- UPDATE filters them out. Those notices remain 'leased' indefinitely.
-- Keep original function signature, service-only execute, and transactional
-- SKIP LOCKED claims. Never email directly from SQL.
BEGIN;
DO $prerequisites$
BEGIN
 IF to_regclass('public.gu_billing_notice_outbox_v014123') IS NULL OR
    to_regprocedure('public.gu_v014123_claim_notices(integer)') IS NULL OR
    to_regprocedure('public.gu_v014123_ack_notice(uuid,uuid,boolean,text)') IS NULL
 THEN
  RAISE EXCEPTION 'V128_REQUIRES_INSTALLED_V123_OUTBOX_AND_FUNCTIONS';
 END IF;
END $prerequisites$;

-- Repair only previously exhausted, already-due records. An active
-- 5-minute claim remains leased until its normal expiry and is not disturbed.
-- Preserve attempts, audit timestamps, provider message history and dedup key.
UPDATE public.gu_billing_notice_outbox_v014123
SET delivery_status='dead',lease_token=NULL,lease_expires_at=NULL,
    updated_at=now()
WHERE attempts>=12 AND (
  (delivery_status='leased' AND lease_expires_at<now())
  OR (delivery_status IN ('pending','retry') AND next_attempt_at<=now())
);

CREATE OR REPLACE FUNCTION public.gu_v014123_claim_notices(p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid,user_id uuid,notice_kind text,source_kind text,
 current_period_end timestamptz,lease_token uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $claim$
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>25 THEN
  RAISE EXCEPTION 'BILLING_CLAIM_LIMIT_INVALID'; END IF;
 RETURN QUERY
 WITH pick AS (
  SELECT n.id FROM public.gu_billing_notice_outbox_v014123 n
  WHERE (n.delivery_status IN ('pending','retry') AND n.next_attempt_at<=now())
     OR (n.delivery_status='leased' AND n.lease_expires_at<now())
  ORDER BY n.created_at,n.id LIMIT p_limit FOR UPDATE SKIP LOCKED
 ), take AS (
  UPDATE public.gu_billing_notice_outbox_v014123 n SET
   -- Exhausted expired lease becomes visible dead-letter work instead of
   -- being selected forever but silently excluded from the UPDATE.
   delivery_status=CASE WHEN n.attempts>=12 THEN 'dead' ELSE 'leased' END,
   attempts=CASE WHEN n.attempts>=12 THEN n.attempts ELSE n.attempts+1 END,
   lease_token=CASE WHEN n.attempts>=12 THEN NULL ELSE gen_random_uuid() END,
   lease_expires_at=CASE WHEN n.attempts>=12 THEN NULL ELSE now()+interval '5 minutes' END,
   updated_at=now()
  FROM pick WHERE n.id=pick.id
  RETURNING n.id,n.user_id,n.notice_kind,n.source_kind,
            n.current_period_end,n.lease_token,n.delivery_status
 )
 SELECT take.id,take.user_id,take.notice_kind,take.source_kind,
        take.current_period_end,take.lease_token
 FROM take WHERE take.delivery_status='leased';
END $claim$;
REVOKE ALL ON FUNCTION public.gu_v014123_claim_notices(integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014123_claim_notices(integer)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- No schema table changes, no new columns, no Stripe calls, no access changes.
-- DEAD records require human investigation; do NOT reset attempts blindly.
