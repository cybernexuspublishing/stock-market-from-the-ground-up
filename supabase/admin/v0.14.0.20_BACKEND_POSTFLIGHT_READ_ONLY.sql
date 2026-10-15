-- v0.14.0.20 | RUN ONLY AFTER REVIEWED MIGRATION. READ-ONLY.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regclass('public.gu_commons_notification_prefs_v01420') IS NOT NULL AS preference_table_installed,
 to_regprocedure('public.gu_commons_notice_pref_get_v01420()') IS NOT NULL AS get_rpc_installed,
 to_regprocedure('public.gu_commons_notice_pref_save_v01420(boolean)') IS NOT NULL AS save_rpc_installed,
 to_regprocedure('public.gu_commons_reply_notice_after_insert_v01420()') IS NOT NULL AS trigger_function_installed;

SELECT c.relname,c.relrowsecurity AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='gu_commons_notification_prefs_v01420';

SELECT t.tgname AS trigger_name,t.tgenabled AS enabled,p.proname AS handler
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='commons_posts' AND NOT t.tgisinternal
 AND t.tgname='gu_commons_reply_notice_v01420';

SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_can_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('gu_commons_notice_pref_get_v01420','gu_commons_notice_pref_save_v01420');

SELECT has_table_privilege('authenticated','public.gu_commons_notification_prefs_v01420','SELECT') AS authenticated_direct_select,
 has_table_privilege('authenticated','public.gu_commons_notification_prefs_v01420','INSERT') AS authenticated_direct_insert,
 has_table_privilege('anon','public.gu_commons_notification_prefs_v01420','SELECT') AS anon_direct_select;

ROLLBACK;
