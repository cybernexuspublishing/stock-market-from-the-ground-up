-- v0.14.0.15 READ-ONLY. Run in current Supabase project before deploying.
-- Only checks presence/configuration; no row contents, secrets, or private posts returned.
WITH required(table_name,column_name) AS (
 VALUES ('forum_topics','id'),('forum_topics','author_id'),('forum_topics','updated_at'),('forum_topics','status'),('forum_posts','topic_id'),('forum_posts','author_id'),('forum_posts','updated_at'),('forum_posts','status'),
 ('commons_topics','author_user_id'),('commons_topics','updated_at'),('commons_topics','status'),('commons_topics','is_official'),('commons_posts','author_user_id'),('commons_posts','updated_at'),('commons_posts','status'),
 ('user_notifications','id'),('user_notifications','user_id'),('user_notifications','notification_type'),('user_notifications','metadata'),
 ('admin_role_permissions','permission_code'),('admin_user_flags','status'),('admin_user_roles','role_code'),('admin_audit_log','action')),
found AS (SELECT r.table_name,r.column_name,
 EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=r.table_name AND c.column_name=r.column_name) AS installed
 FROM required r)
SELECT 'REQUIRED COLUMN' AS check_kind,'public.'||table_name||'.'||column_name AS object_name,
 CASE WHEN installed THEN 'FOUND' ELSE 'MISSING' END AS result FROM found
UNION ALL
SELECT 'RLS', 'public.'||c.relname,CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END
FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
WHERE n.nspname='public' AND c.relname IN ('forum_topics','forum_posts','commons_topics','commons_posts','user_notifications','admin_user_roles','admin_user_flags')
ORDER BY check_kind,object_name;
