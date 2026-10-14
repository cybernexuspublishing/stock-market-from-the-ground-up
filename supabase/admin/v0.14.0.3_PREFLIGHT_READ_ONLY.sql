-- v0.14.0.3 STAGING preflight — READ ONLY.
-- Run using Supabase SQL Editor after opening the correct STAGING project.
-- Zero writes or administrative changes.
SELECT current_database() AS db_name, current_user AS db_user, current_setting('server_version') AS postgresql_version;
WITH required(name,kind) AS (
 VALUES ('public.profiles','table'),('public.admin_user_roles','table'),('public.admin_user_flags','table'),
 ('public.admin_audit_log','table'),('public.user_library','table'),('public.book_key_redemptions','table'),
 ('public.platform_plans','table'),('public.site_subscriptions','table'),('public.user_plan_grants','table'),
 ('public.commons_forums','table'),('public.commons_topics','table'),('public.commons_posts','table'),
 ('public.commons_bookmarks','table'),('public.commons_topic_subscriptions','table'),
 ('public.forum_topics','table'),('public.forum_posts','table'),('public.forum_reports','table'),
 ('public.gws_client_drafts_v014','table'),('public.site_settings','table'),
 ('public.user_has_tool_access(uuid,text)','function'),
 ('public.commons_create_topic(text,text,text,text)','function'),
 ('public.commons_create_reply(bigint,text)','function'),
 ('public.commons_toggle_bookmark(bigint)','function')
)
SELECT name,kind,case when kind='table' then to_regclass(name) IS NOT NULL
                       else to_regprocedure(name) IS NOT NULL END AS prerequisite_present
FROM required ORDER BY kind,name;
SELECT t.table_name,t.column_name,t.data_type
FROM information_schema.columns t WHERE t.table_schema='public'
AND ((t.table_name='commons_forums' AND t.column_name IN ('active','member_only','book_code','tool_code'))
 OR (t.table_name='gws_client_drafts_v014' AND t.column_name IN ('id','project_code','revision_number'))
 OR (t.table_name='book_key_redemptions' AND t.column_name IN ('user_id','book_code','starts_at','ends_at'))
 OR (t.table_name='admin_audit_log' AND t.column_name IN ('actor_user_id','target_id','action','details')))
ORDER BY table_name,column_name;
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('commons_forums','commons_topics','commons_posts',
 'forum_topics','forum_posts','forum_reports','gws_client_drafts_v014') ORDER BY c.relname;
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated')
AND table_name IN ('gws_client_drafts_v014','commons_topics','commons_posts','gws_client_draft_revisions_v0143')
ORDER BY table_name,grantee,privilege_type;
