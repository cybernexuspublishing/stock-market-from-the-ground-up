-- v0.14.0.20 | RUN FIRST. READ-ONLY. Returns evidence, makes ZERO changes.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, current_setting('server_version') AS postgres_version;

WITH dependencies(name,required_for_release) AS (VALUES
 ('profiles',true),('admin_user_flags',true),('admin_user_roles',true),
 ('commons_forums',true),('commons_topics',true),('commons_posts',true),
 ('commons_topic_subscriptions',true),('user_notifications',true),
 ('community_report_policy_v01417',false),('gu_forum_polls',false),
 ('lab_instruction_v014',false),('lab_training_sets_v014',false),
 ('gu_commons_notification_prefs_v01420',false)
)
SELECT name,required_for_release,to_regclass(format('public.%I',name)) IS NOT NULL AS installed
FROM dependencies ORDER BY required_for_release DESC,name;

WITH col(table_name,column_name) AS (VALUES
 ('profiles','id'),('profiles','account_kind'),
 ('admin_user_flags','user_id'),('admin_user_flags','status'),
 ('commons_posts','id'),('commons_posts','topic_id'),('commons_posts','status'),('commons_posts','author_user_id'),
 ('commons_topics','id'),('commons_topics','forum_code'),('commons_topics','status'),
 ('commons_forums','forum_code'),('commons_forums','active'),('commons_forums','book_code'),('commons_forums','tool_code'),
 ('commons_topic_subscriptions','topic_id'),('commons_topic_subscriptions','user_id'),
 ('user_notifications','id'),('user_notifications','user_id'),('user_notifications','notification_type'),
 ('user_notifications','title'),('user_notifications','body'),('user_notifications','href'),('user_notifications','metadata'),('user_notifications','created_at')
)
SELECT table_name,column_name,
 EXISTS(SELECT 1 FROM information_schema.columns c
   WHERE c.table_schema='public' AND c.table_name=col.table_name AND c.column_name=col.column_name) AS installed
FROM col ORDER BY table_name,column_name;

SELECT n.nspname,c.relname,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('profiles','admin_user_flags','commons_posts','commons_topic_subscriptions',
  'user_notifications','gu_commons_notification_prefs_v01420')
ORDER BY c.relname;

SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args,
 p.prosecdef AS security_definer, p.proconfig AS settings
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('commons_create_reply','v014_community_report','gu_owner_report_policy_save_v01417',
  'gu_forum_toggle_subscription','gu_commons_notice_pref_get_v01420',
  'gu_commons_notice_pref_save_v01420','gu_commons_reply_notice_after_insert_v01420')
ORDER BY p.proname;

SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('user_notifications','commons_topic_subscriptions',
 'gu_commons_notification_prefs_v01420') AND grantee IN ('anon','authenticated','service_role')
ORDER BY table_name,grantee,privilege_type;

SELECT event_object_table,trigger_name,action_timing,event_manipulation
FROM information_schema.triggers
WHERE event_object_schema='public' AND event_object_table='commons_posts'
ORDER BY trigger_name;

ROLLBACK;
