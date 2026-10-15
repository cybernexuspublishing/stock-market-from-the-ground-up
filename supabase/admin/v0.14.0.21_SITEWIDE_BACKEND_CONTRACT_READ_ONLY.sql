-- Cyber Nexus / The Stock Market: From the Ground Up
-- v0.14.0.21 SITEWIDE Supabase backend inventory. READ ONLY.
-- Results are presence/permission evidence, not final feature or RLS acceptance.
-- Run only in an Owner-controlled project; do not publish outputs with IDs/secrets.
BEGIN TRANSACTION READ ONLY;

WITH expected(area,object_name,criticality) AS (VALUES
 ('identity','profiles','P0'),('identity','admin_user_roles','P0'),
 ('identity','admin_role_permissions','P0'),('identity','admin_user_flags','P0'),
 ('identity','account_private_identity','P0'),('privacy','user_notifications','P0'),
 ('community','commons_forums','P0'),('community','commons_topics','P0'),
 ('community','commons_posts','P0'),('community','commons_topic_subscriptions','P0'),
 ('moderation','forum_reports','P0'),('moderation','community_report_policy_v01417','P1'),
 ('community','gu_forum_polls','P1'),('community','gu_commons_notification_prefs_v01420','P1'),
 ('learning','lab_instruction_v014','P1'),('learning','lab_training_sets_v014','P1'),
 ('learning','lab_training_attempts_v014','P1'),('learning','lab_progress','P1'),
 ('learning','lab_attempts','P1'),('commerce','platform_plans','P0'),
 ('commerce','site_subscriptions','P0'),('commerce','checkout_intents','P0'),
 ('commerce','payment_webhook_events','P0'),('commerce','user_library','P0'),
 ('commerce','book_key_redemptions','P0'),('owner_controls','admin_control_registry_v01409','P1'),
 ('gws','gws_projects_v0143','P2'),('publishing','site_pages_v1354','P2'),
 ('communications','site_announcements','P1')
)
SELECT area,object_name,criticality,to_regclass(format('public.%I',object_name)) IS NOT NULL AS installed
FROM expected ORDER BY criticality,area,object_name;

WITH targets AS (SELECT unnest(ARRAY[
 'profiles','admin_user_roles','admin_role_permissions','admin_user_flags',
 'account_private_identity','commons_topics','commons_posts','commons_topic_subscriptions',
 'forum_reports','community_report_policy_v01417','gu_commons_notification_prefs_v01420',
 'user_notifications','lab_instruction_v014','lab_training_sets_v014','lab_training_attempts_v014',
 'checkout_intents','payment_webhook_events','user_library','book_key_redemptions',
 'admin_control_registry_v01409'
]) AS object_name)
SELECT t.object_name,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS force_rls,
 c.relkind AS relation_type
FROM targets t JOIN pg_class c ON c.oid=to_regclass(format('public.%I',t.object_name))
ORDER BY t.object_name;

WITH checked(function_name) AS (VALUES
 ('public.gu_commons_notice_pref_get_v01420()'),
 ('public.gu_commons_notice_pref_save_v01420(boolean)'),
 ('public.gu_commons_reply_notice_after_insert_v01420()'),
 ('public.gu_commons_subscription_get_v01421(bigint)'),
 ('public.gu_commons_subscription_set_v01421(bigint,boolean)'),
 ('public.gu_forum_toggle_subscription(text,bigint)'),
 ('public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer)'),
 ('public.v014_community_report(uuid,text,text,text,text)'),
 ('public.user_has_tool_access(uuid,text)'),
 ('public.v014_training_start(uuid,text,text)'),
 ('public.v014_training_answer(uuid,uuid,text,integer)')
)
SELECT function_name,to_regprocedure(function_name) IS NOT NULL AS installed,
 coalesce(has_function_privilege('anon',to_regprocedure(function_name),'EXECUTE'),false) AS anon_execute,
 coalesce(has_function_privilege('authenticated',to_regprocedure(function_name),'EXECUTE'),false) AS member_execute
FROM checked ORDER BY function_name;

-- Explicitly list triggers on the core Commons and payment-provider tables.
SELECT event_object_table,trigger_name,action_timing,event_manipulation
FROM information_schema.triggers
WHERE event_object_schema='public' AND event_object_table IN
 ('commons_posts','payment_webhook_events')
ORDER BY event_object_table,trigger_name;
ROLLBACK;
