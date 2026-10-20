-- v123 read-only production install verification. No PII or emails.
WITH checks(label,pass) AS (
 VALUES
 ('Private notice table exists',to_regclass('public.gu_billing_notice_outbox_v014123') IS NOT NULL),
 ('Plan signed-LIVE notice trigger enabled',EXISTS(
   SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.site_subscriptions')
    AND tgname='gu_billing_notice_plan_v014123' AND tgenabled IN('O','A'))),
 ('Tool signed-LIVE notice trigger enabled',EXISTS(
   SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.user_tool_passes')
    AND tgname='gu_billing_notice_tool_v014123' AND tgenabled IN('O','A'))),
 ('Service can claim jobs',COALESCE(
   has_function_privilege('service_role',
    to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Anon cannot claim jobs',COALESCE(
   NOT has_function_privilege('anon',
    to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Member cannot claim jobs',COALESCE(
   NOT has_function_privilege('authenticated',
    to_regprocedure('public.gu_v014123_claim_notices(integer)'),'EXECUTE'),false)),
 ('Service can ack jobs',COALESCE(
   has_function_privilege('service_role',
    to_regprocedure('public.gu_v014123_ack_notice(uuid,uuid,boolean,text)'),'EXECUTE'),false)),
 ('Member cannot ack jobs',COALESCE(
   NOT has_function_privilege('authenticated',
    to_regprocedure('public.gu_v014123_ack_notice(uuid,uuid,boolean,text)'),'EXECUTE'),false)),
 ('Member cannot read outbox',COALESCE(
   NOT has_table_privilege('authenticated',
    to_regclass('public.gu_billing_notice_outbox_v014123'),'SELECT'),false)),
 ('Anon cannot read outbox',COALESCE(
   NOT has_table_privilege('anon',
    to_regclass('public.gu_billing_notice_outbox_v014123'),'SELECT'),false))
)
SELECT label,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END result FROM checks ORDER BY label;
