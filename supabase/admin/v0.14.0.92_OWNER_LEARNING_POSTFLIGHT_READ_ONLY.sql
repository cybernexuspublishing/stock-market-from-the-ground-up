-- v0.14.0.92 | Owner learning/replay postflight | READ ONLY.
-- Run only AFTER authorized execution of both v0.14.0.92 migrations.
-- If migrations are not approved or installed, do not run; use object preflight.
BEGIN READ ONLY;
SELECT '01_REPLAY_OBJECTS' AS check_group,
 to_regclass('public.gu_replay_bars_v01492') IS NOT NULL AS private_bars_present,
 to_regclass('public.gu_replay_sessions_v01492') IS NOT NULL AS private_sessions_present,
 to_regclass('public.gu_tutor_usage_v01492') IS NOT NULL AS tutor_quota_present;
SELECT '02_PRIVATE_ROLE_GRANTS' AS check_group,
 has_table_privilege('anon','public.gu_replay_bars_v01492','SELECT') AS anonymous_replay_select,
 has_table_privilege('authenticated','public.gu_replay_bars_v01492','SELECT') AS member_replay_select,
 has_table_privilege('authenticated','public.gu_replay_sessions_v01492','UPDATE') AS member_session_update,
 has_table_privilege('authenticated','public.gu_tutor_usage_v01492','UPDATE') AS member_quota_update;
SELECT '03_FUNCTION_GRANTS' AS check_group,
 has_function_privilege('anon','public.v01492_replay_advance(uuid,uuid,integer)','EXECUTE') AS anonymous_advance,
 has_function_privilege('authenticated','public.v01492_replay_advance(uuid,uuid,integer)','EXECUTE') AS member_advance,
 has_function_privilege('anon','public.v01492_consume_tutor_quota(uuid,integer)','EXECUTE') AS anonymous_tutor_quota,
 has_function_privilege('authenticated','public.v01492_consume_tutor_quota(uuid,integer)','EXECUTE') AS member_tutor_quota;
SELECT '04_DATABASE_POPULATION' AS check_group,
 (SELECT count(*) FROM public.gu_replay_bars_v01492) AS private_replay_bars,
 (SELECT count(*) FROM public.gu_replay_sessions_v01492) AS replay_sessions,
 (SELECT count(*) FROM public.gu_tutor_usage_v01492) AS tutor_daily_quota_records,
 (SELECT count(*) FROM public.market_datasets WHERE status='published') AS published_dataset_headers;
SELECT '05_RLS' AS check_group, relname AS object_name, relrowsecurity AS rls_enabled
 FROM pg_class WHERE relnamespace='public'::regnamespace
 AND relname IN ('gu_replay_bars_v01492','gu_replay_sessions_v01492','gu_tutor_usage_v01492')
 ORDER BY relname;
ROLLBACK;
-- Expected before licensing/launch: objects TRUE, all exposed-role grants FALSE,
-- all three RLS booleans TRUE, initially 0 replay bars and sessions.
-- A published dataset record does NOT prove license or historical quality.
-- All output is aggregate/configuration-only, no customer identifiers.
