-- v0.14.0.21 | RUN BEFORE REVIEWED MIGRATION. NO DATA MODIFICATION.
BEGIN TRANSACTION READ ONLY;
WITH expected(name) AS (VALUES
 ('profiles'),('admin_user_flags'),('commons_topics'),('commons_forums'),('commons_topic_subscriptions'),
 ('user_notifications'),('gu_commons_notification_prefs_v01420'))
SELECT name,to_regclass(format('public.%I',name)) IS NOT NULL AS installed FROM expected;
SELECT
 to_regprocedure('public.gu_commons_notice_pref_get_v01420()') IS NOT NULL AS v01420_pref_get,
 to_regprocedure('public.gu_commons_notice_pref_save_v01420(boolean)') IS NOT NULL AS v01420_pref_save,
 to_regprocedure('public.gu_commons_reply_notice_after_insert_v01420()') IS NOT NULL AS v01420_trigger_function,
 to_regprocedure('public.gu_forum_toggle_subscription(text,bigint)') IS NOT NULL AS optional_v01417_subscription_rpc,
 to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)') IS NOT NULL AS v01421_get_already_installed,
 to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)') IS NOT NULL AS v01421_set_already_installed;
SELECT column_name,table_name FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('commons_topics','commons_forums','commons_topic_subscriptions','profiles','admin_user_flags')
AND column_name IN ('id','user_id','account_kind','status','forum_code','active','book_code','tool_code','topic_id')
ORDER BY table_name,column_name;
SELECT pg_get_userbyid(p.proowner) AS owner,p.proname,p.prosecdef AS security_definer,
 pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'gu_commons_subscription_%_v01421';
ROLLBACK;
