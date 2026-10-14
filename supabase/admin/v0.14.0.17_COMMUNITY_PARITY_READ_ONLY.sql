-- v0.14.0.17: READ ONLY database readiness inventory. No writes, no migrations.
-- Run in Supabase SQL Editor under the actual production project. Results show installation status,
-- NOT whether application-side permissions, storage, and functions are fully secure or operational.
WITH required (category, schema_name, table_name, column_name, need) AS (
 VALUES
  ('CORE','public','profiles','id','required'),
  ('CORE','public','profiles','account_kind','required'),
  ('CORE','public','admin_user_roles','user_id','required'),
  ('CORE','public','admin_user_roles','role_code','required'),
  ('CORE','public','admin_user_flags','status','required'),
  ('LEGACY','public','forum_topics','author_id','required'),
  ('LEGACY','public','forum_topics','title','required'),
  ('LEGACY','public','forum_topics','body','required'),
  ('LEGACY','public','forum_topics','status','required'),
  ('LEGACY','public','forum_topics','updated_at','required'),
  ('LEGACY','public','forum_posts','author_id','required'),
  ('LEGACY','public','forum_posts','body','required'),
  ('LEGACY','public','forum_posts','status','required'),
  ('COMMONS','public','commons_topics','author_user_id','required'),
  ('COMMONS','public','commons_topics','body','required'),
  ('COMMONS','public','commons_topics','status','required'),
  ('COMMONS','public','commons_topics','is_locked','required'),
  ('COMMONS','public','commons_posts','author_user_id','required'),
  ('COMMONS','public','commons_posts','body','required'),
  ('COMMONS','public','commons_posts','status','required'),
  ('COMMUNICATIONS','public','site_announcements','body','required'),
  ('COMMUNICATIONS','public','site_announcements','starts_at','required'),
  ('COMMUNICATIONS','public','site_announcements','ends_at','required'),
  ('COMMUNICATIONS','public','user_notifications','body','required'),
  ('COMMUNICATIONS','public','user_notifications','metadata','required'),
  ('INTERACTIONS','public','commons_topic_subscriptions','topic_id','existing-schema'),
  ('INTERACTIONS','public','commons_bookmarks','topic_id','existing-schema'),
  ('ADVANCED-NEEDED','public','forum_attachment_assets','id','not-installed-by-0.14.0.17'),
  ('CANDIDATE','public','gu_forum_polls','id','optional-write-migration'),
  ('CANDIDATE','public','gu_forum_poll_options','poll_id','optional-write-migration'),
  ('CANDIDATE','public','gu_forum_poll_votes','user_id','optional-write-migration'),
  ('CANDIDATE','public','gu_forum_thanks','target_id','optional-write-migration'),
  ('CANDIDATE','public','gu_forum_ratings','topic_id','optional-write-migration'),
  ('CANDIDATE','public','gu_forum_legacy_subscriptions','topic_id','optional-write-migration'),
  ('ADVANCED-NEEDED','public','forum_thread_polls','id','not-installed-by-0.14.0.17'),
  ('ADVANCED-NEEDED','public','forum_poll_votes','id','not-installed-by-0.14.0.17'),
  ('ADVANCED-NEEDED','public','forum_post_revisions','id','not-installed-by-0.14.0.17'),
  ('ADVANCED-NEEDED','public','forum_post_thanks','id','not-installed-by-0.14.0.17')
),
columns_found AS (
 SELECT r.category,r.schema_name||'.'||r.table_name||'.'||r.column_name AS object_name,r.need,
 EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=r.schema_name
 AND c.table_name=r.table_name AND c.column_name=r.column_name) AS installed FROM required r
)
SELECT category,object_name,need,CASE WHEN installed THEN 'PRESENT' ELSE 'NOT PRESENT' END AS database_status
FROM columns_found
UNION ALL
SELECT 'SECURITY', 'RLS public.'||c.relname, 'required',CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('forum_topics','forum_posts','commons_topics','commons_posts','site_announcements','user_notifications') AND c.relkind IN ('r','p')
ORDER BY category, object_name;


-- Optional RPC presence only; this does NOT test data access or call security-definer functions.
SELECT 'community_polls' AS feature,
 to_regprocedure('public.gu_forum_poll_get(text,bigint)') IS NOT NULL AS read_function_installed,
 to_regprocedure('public.gu_forum_poll_vote(text,bigint,bigint[])') IS NOT NULL AS write_function_installed
UNION ALL
SELECT 'community_interactions',
 to_regprocedure('public.gu_forum_interaction_state(text,bigint)') IS NOT NULL,
 to_regprocedure('public.gu_forum_toggle_thanks(text,text,bigint)') IS NOT NULL;

-- Permissions verification after optional migration (also safe before migration).
WITH rpc(name,signature) AS (
 VALUES ('read poll','public.gu_forum_poll_get(text,bigint)'),
 ('vote','public.gu_forum_poll_vote(text,bigint,bigint[])'),
 ('create poll','public.gu_forum_poll_create(text,bigint,text,text[],timestamptz,boolean)'),
 ('toggle thanks','public.gu_forum_toggle_thanks(text,text,bigint)'),
 ('topic subscription','public.gu_forum_toggle_subscription(text,bigint)'),
 ('topic rating','public.gu_forum_rate_topic(text,bigint,smallint)')
)
SELECT name, signature,
 (to_regprocedure(signature) IS NOT NULL) AS installed,
 coalesce(has_function_privilege('anon',to_regprocedure(signature),'EXECUTE'),false) AS anon_can_execute,
 coalesce(has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE'),false) AS member_role_can_execute
FROM rpc ORDER BY name;
-- Expected after migration: installed=true, anon_can_execute=false,
-- member_role_can_execute=true. These checks do NOT replace per-identity authorization tests.
