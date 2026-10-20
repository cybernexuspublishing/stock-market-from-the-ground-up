-- v121 read-only preflight, one result, no member-identifying information.
WITH requirements AS (
 SELECT '01 journal table' AS check_name,to_regclass('public.decision_journal') IS NOT NULL AS pass
 UNION ALL SELECT '02 plans table',to_regclass('public.platform_plans') IS NOT NULL
 UNION ALL SELECT '03 entitlement function',to_regprocedure('public.user_has_tool_access(uuid,text)') IS NOT NULL
 UNION ALL SELECT '04 free journal trigger',EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid=to_regclass('public.decision_journal')
    AND tgname='enforce_free_journal_limits' AND tgenabled IN('O','A'))
 UNION ALL SELECT '05 original FREE plan $0',EXISTS(SELECT 1 FROM public.platform_plans
   WHERE plan_code='FREE' AND price_cents=0 AND active=true)
 UNION ALL SELECT '06 FULL_MONTHLY $69.99 unchanged',EXISTS(SELECT 1 FROM public.platform_plans
   WHERE plan_code='FULL_MONTHLY' AND price_cents=6999)
)
SELECT check_name, CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END AS result
 FROM requirements ORDER BY check_name;
