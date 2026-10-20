-- v121 one-result non-identifying quota and marketing consistency audit.
WITH state AS (
 SELECT p.plan_code,p.name,p.price_cents,p.ad_free,p.metadata
 FROM public.platform_plans p WHERE p.plan_code IN('FREE','FULL_MONTHLY')
),checks AS (
 SELECT '01 FREE remains $0' name,EXISTS(SELECT 1 FROM state WHERE plan_code='FREE' AND price_cents=0) pass
 UNION ALL SELECT '02 FREE has 15 journal/week',EXISTS(SELECT 1 FROM state WHERE plan_code='FREE' AND metadata->>'journal_limit_week'='15')
 UNION ALL SELECT '03 FREE has 10 simulator saves/week',EXISTS(SELECT 1 FROM state WHERE plan_code='FREE' AND metadata->>'simulator_saves_week'='10')
 UNION ALL SELECT '04 FULL_MONTHLY stays $69.99',EXISTS(SELECT 1 FROM state WHERE plan_code='FULL_MONTHLY' AND price_cents=6999)
 UNION ALL SELECT '05 FULL_MONTHLY canonical name',EXISTS(SELECT 1 FROM state WHERE plan_code='FULL_MONTHLY' AND name='Full Platform — Monthly')
 UNION ALL SELECT '06 FULL_MONTHLY sponsored, not ad-free',EXISTS(SELECT 1 FROM state WHERE plan_code='FULL_MONTHLY' AND ad_free=false)
 UNION ALL SELECT '07 weekly counter table private',to_regclass('public.gu_free_weekly_usage_v014121') IS NOT NULL
 UNION ALL SELECT '08 journal trigger installed',EXISTS(SELECT 1 FROM pg_trigger WHERE
  tgrelid=to_regclass('public.decision_journal') AND tgname='enforce_free_journal_limits'
  AND tgenabled IN ('O','A'))
 UNION ALL SELECT '09 owner-scoped usage RPC',to_regprocedure('public.gu_v014121_my_free_week_usage()') IS NOT NULL
 UNION ALL SELECT '10 quota helper not public',COALESCE(NOT has_function_privilege('anon',to_regprocedure('public.gu_v014121_take_free_week_slot(uuid,text,integer)'),'EXECUTE'),false)
 UNION ALL SELECT '11 quota helper not directly member callable',COALESCE(NOT has_function_privilege('authenticated',to_regprocedure('public.gu_v014121_take_free_week_slot(uuid,text,integer)'),'EXECUTE'),false)
 UNION ALL SELECT '12 quota table unreadable to public',COALESCE(NOT has_table_privilege('anon',to_regclass('public.gu_free_weekly_usage_v014121'),'SELECT'),false)
 UNION ALL SELECT '13 quota table unreadable to authenticated',COALESCE(NOT has_table_privilege('authenticated',to_regclass('public.gu_free_weekly_usage_v014121'),'SELECT'),false)
)
SELECT name AS check_name,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END result
 FROM checks ORDER BY name;
