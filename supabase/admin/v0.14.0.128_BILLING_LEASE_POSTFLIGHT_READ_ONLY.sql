-- v128 owner-safe, READ ONLY: outbox lease and permission checks.
-- Result rows contain no user IDs, recipient addresses or subscription IDs.
WITH checks(label,passed) AS (
 VALUES
 ('v123 claim RPC remains installed',
   to_regprocedure('public.gu_v014123_claim_notices(integer)') IS NOT NULL),
 ('Service-only claim RPC remains executable',
   coalesce(has_function_privilege('service_role',
      to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Authenticated cannot claim notices',
   coalesce(NOT has_function_privilege('authenticated',
      to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Anonymous cannot claim notices',
   coalesce(NOT has_function_privilege('anon',
      to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Member cannot read private outbox',
   coalesce(NOT has_table_privilege('authenticated',
      to_regclass('public.gu_billing_notice_outbox_v014123'),'SELECT'),false)),
 ('Outbox RLS remains enabled',
   coalesce((SELECT relrowsecurity FROM pg_class
     WHERE oid=to_regclass('public.gu_billing_notice_outbox_v014123')),false)),
 ('No expired exhausted billing notice leases remain',
   NOT EXISTS(
    SELECT 1 FROM public.gu_billing_notice_outbox_v014123
    WHERE attempts>=12 AND delivery_status='leased' AND lease_expires_at<now())),
 ('No due exhausted pending/retry billing notices remain',
   NOT EXISTS(
    SELECT 1 FROM public.gu_billing_notice_outbox_v014123
    WHERE attempts>=12 AND delivery_status IN ('pending','retry')
      AND next_attempt_at<=now()))
)
SELECT label,CASE WHEN passed THEN 'PASS' ELSE 'BLOCKED' END result
FROM checks ORDER BY label;
-- A PASS is a structural/queue snapshot, not proof of an email delivered.
