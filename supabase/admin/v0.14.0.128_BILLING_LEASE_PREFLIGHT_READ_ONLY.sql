-- v128 owner-safe, READ ONLY, no member identifiers, no data mutation.
WITH checks(label,passed) AS (
 VALUES
 ('Existing v123 outbox table',to_regclass('public.gu_billing_notice_outbox_v014123') IS NOT NULL),
 ('Existing v123 notice claim function',
   to_regprocedure('public.gu_v014123_claim_notices(integer)') IS NOT NULL),
 ('Existing v123 ack function',
   to_regprocedure('public.gu_v014123_ack_notice(uuid,uuid,boolean,text)') IS NOT NULL),
 ('Existing v123 service claim privilege',
   coalesce(has_function_privilege('service_role',
     to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Existing v123 member claim privilege denied',
   coalesce(NOT has_function_privilege('authenticated',
     to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false))
)
SELECT label,CASE WHEN passed THEN 'PASS' ELSE 'BLOCKED' END result
FROM checks ORDER BY label;
-- Requires ALL PASS before installing the specific v128 lease repair.
