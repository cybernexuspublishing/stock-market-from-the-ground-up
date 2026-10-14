-- v0.14.0.3 STAGING postflight — READ ONLY. Diagnose policy/function configuration.
WITH required(name) AS (VALUES
 ('public.v0143_commons_can_open(boolean,boolean,text,text)'),
 ('public.v0143_legacy_forum_can_read()'),
 ('public.v0143_gws_owner(uuid)'),
 ('public.v0143_gws_save(uuid,text,text,text,text,text,jsonb,integer)'),
 ('public.v0143_gws_restore(uuid,text,integer,integer)'),
 ('public.commons_create_topic(text,text,text,text)'),
 ('public.commons_create_reply(bigint,text)'),
 ('public.commons_toggle_bookmark(bigint)'))
SELECT name,to_regprocedure(name) IS NOT NULL AS exists_after_migration FROM required;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public' AND tablename IN
 ('commons_forums','commons_topics','commons_posts','commons_bookmarks','commons_topic_subscriptions',
  'forum_topics','forum_posts','forum_reports') ORDER BY tablename,policyname;
SELECT p.proname, p.prosecdef AS security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_can_call,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_call
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND (p.proname LIKE 'v0143_%' OR p.proname IN
 ('commons_create_topic','commons_create_reply','commons_toggle_bookmark','forum_list_topics','forum_get_topic','forum_list_posts'))
ORDER BY p.proname;
SELECT 'gws_client_draft_revisions_v0143' AS object,to_regclass('public.gws_client_draft_revisions_v0143') IS NOT NULL AS exists;
-- Do not mark PASS until member/TEST/SHOWCASE/owner/direct RPC and revoked-token
-- tests run against the deployed staging API. Catalog-only checks cannot prove RLS.
