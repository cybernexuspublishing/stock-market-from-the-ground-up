-- v0.14.0.23 | RUN BEFORE migration review, READ ONLY.
BEGIN TRANSACTION READ ONLY;
WITH names(name,required) AS (VALUES
 ('profiles',true),('admin_user_flags',true),('admin_user_roles',true),
 ('commons_forums',true),('commons_topics',true),('commons_posts',true),
 ('user_notifications',true),('gu_commons_mention_prefs_v01423',false),
 ('gu_commons_mention_quota_v01423',false))
SELECT name,required,to_regclass(format('public.%I',name)) IS NOT NULL AS installed
FROM names ORDER BY required DESC,name;
WITH required(table_name,column_name) AS (VALUES
 ('profiles','username'),('profiles','account_kind'),
 ('admin_user_roles','expires_at'),('admin_user_flags','status'),
 ('commons_forums','book_code'),('commons_forums','tool_code'),
 ('commons_topics','author_user_id'),('commons_topics','body'),
 ('commons_posts','author_user_id'),('commons_posts','body'),
 ('user_notifications','metadata'),('user_notifications','notification_type'))
SELECT table_name,column_name,EXISTS(SELECT 1 FROM information_schema.columns c
 WHERE c.table_schema='public' AND c.table_name=required.table_name AND c.column_name=required.column_name) AS installed
FROM required ORDER BY table_name,column_name;
SELECT t.tgname,t.tgenabled,p.proname FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND
c.relname IN ('commons_posts','commons_topics') AND NOT t.tgisinternal;
ROLLBACK;
