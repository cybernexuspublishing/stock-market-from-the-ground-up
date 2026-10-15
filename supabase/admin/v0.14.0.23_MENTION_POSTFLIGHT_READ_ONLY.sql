-- v0.14.0.23 | RUN ONLY AFTER REVIEWED MIGRATION, READ ONLY.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regclass('public.gu_commons_mention_prefs_v01423') IS NOT NULL AS prefs_table,
 to_regclass('public.gu_commons_mention_quota_v01423') IS NOT NULL AS quota_table,
 to_regprocedure('public.gu_commons_mention_pref_get_v01423()') IS NOT NULL AS get_rpc,
 to_regprocedure('public.gu_commons_mention_pref_save_v01423(boolean)') IS NOT NULL AS save_rpc,
 to_regprocedure('public.gu_commons_emit_mentions_v01423()') IS NOT NULL AS emit_function,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_commons_mention_pref_get_v01423()'),'EXECUTE'),false) AS auth_get,
 coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_commons_mention_pref_save_v01423(boolean)'),'EXECUTE'),false) AS auth_save,
 coalesce(has_function_privilege('anon',to_regprocedure('public.gu_commons_mention_pref_get_v01423()'),'EXECUTE'),false) AS anon_get,
 coalesce(has_function_privilege('anon',to_regprocedure('public.gu_commons_mention_pref_save_v01423(boolean)'),'EXECUTE'),false) AS anon_save,
 coalesce(has_table_privilege('authenticated',to_regclass('public.gu_commons_mention_prefs_v01423'),'SELECT'),false) AS authenticated_direct_select,
 coalesce(has_table_privilege('anon',to_regclass('public.gu_commons_mention_prefs_v01423'),'SELECT'),false) AS anon_direct_select,
 coalesce((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=to_regclass('public.gu_commons_mention_prefs_v01423')),false) AS prefs_rls,
 coalesce((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=to_regclass('public.gu_commons_mention_quota_v01423')),false) AS quota_rls,
 EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.commons_posts') AND
       t.tgname='gu_commons_mention_post_v01423' AND t.tgenabled IN ('O','A')) AS post_trigger,
 EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.commons_topics') AND
       t.tgname='gu_commons_mention_topic_v01423' AND t.tgenabled IN ('O','A')) AS topic_trigger;
SELECT notification_type,metadata->>'origin' AS origin,count(*) AS notice_rows
FROM public.user_notifications WHERE notification_type='forum_mention' AND metadata->>'origin'='v01423'
GROUP BY notification_type,origin;
SELECT count(*) AS duplicate_recipient_content_pairs FROM (
 SELECT user_id,metadata->>'content_ref' AS content_ref FROM public.user_notifications
 WHERE notification_type='forum_mention' AND metadata->>'origin'='v01423'
 GROUP BY user_id,metadata->>'content_ref' HAVING count(*)>1
) d;
ROLLBACK;
