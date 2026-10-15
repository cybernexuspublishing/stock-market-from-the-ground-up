-- v0.14.0.22 | READ ONLY. Run in the Owner's Supabase SQL Editor.
-- Does not post replies, create follows or alter notification settings.
BEGIN TRANSACTION READ ONLY;
SELECT
  to_regclass('public.gu_commons_notification_prefs_v01420') IS NOT NULL AS prefs_table,
  to_regprocedure('public.gu_commons_notice_pref_get_v01420()') IS NOT NULL AS prefs_get,
  to_regprocedure('public.gu_commons_notice_pref_save_v01420(boolean)') IS NOT NULL AS prefs_save,
  to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)') IS NOT NULL AS subscription_get,
  to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)') IS NOT NULL AS subscription_set,
  coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)'),'EXECUTE'),false) AS member_may_get,
  coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)'),'EXECUTE'),false) AS member_may_set,
  coalesce(has_function_privilege('anon',to_regprocedure('public.gu_commons_subscription_get_v01421(bigint)'),'EXECUTE'),false) AS anon_may_get,
  coalesce(has_function_privilege('anon',to_regprocedure('public.gu_commons_subscription_set_v01421(bigint,boolean)'),'EXECUTE'),false) AS anon_may_set,
  EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.commons_posts')
    AND t.tgname='gu_commons_reply_notice_v01420' AND t.tgenabled IN ('O','A') AND NOT t.tgisinternal) AS reply_trigger_enabled,
  coalesce((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=to_regclass('public.gu_commons_notification_prefs_v01420')),false) AS preferences_rls_enabled,
  coalesce(has_table_privilege('authenticated',to_regclass('public.gu_commons_notification_prefs_v01420'),'SELECT'),false) AS member_direct_preferences_read,
  coalesce(has_table_privilege('anon',to_regclass('public.gu_commons_notification_prefs_v01420'),'SELECT'),false) AS anon_direct_preferences_read;
ROLLBACK;
