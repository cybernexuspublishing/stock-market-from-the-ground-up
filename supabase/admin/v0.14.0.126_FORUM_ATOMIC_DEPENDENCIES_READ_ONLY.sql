-- v0.14.0.126 | OWNER-SAFE, ONE-RESULT, READ-ONLY diagnostic.
-- Intended for Supabase SQL Editor in the EXISTING production project.
-- Your v125 P0001 means v113 OR v116 (or both) were not installed with the
-- required exact PostgreSQL signature; v125 correctly rolled back.
-- No INSERT, UPDATE, DELETE, GRANT, ALTER, transaction, psql-only commands.
WITH
expected(table_name,columns_required) AS (
 VALUES
    ('profiles', ARRAY['id','account_kind' ]::text[]),
    ('admin_user_flags', ARRAY['user_id','status' ]::text[]),
    ('admin_user_roles', ARRAY['user_id','role_code','expires_at' ]::text[]),
    ('admin_role_permissions', ARRAY['role_code','permission_code' ]::text[]),
    ('admin_audit_log', ARRAY['id','actor_user_id','action','target_type','target_id','details' ]::text[]),
    ('forum_topics', ARRAY['id','author_id','title','body','status','is_locked','is_pinned','updated_at' ]::text[]),
    ('forum_posts', ARRAY['id','author_id','topic_id','body','status','updated_at' ]::text[]),
    ('commons_topics', ARRAY['id','author_user_id','title','body','status','is_locked','is_pinned','is_official','updated_at' ]::text[]),
    ('commons_posts', ARRAY['id','author_user_id','topic_id','body','status','updated_at' ]::text[])
),
schema_status AS (
 SELECT e.table_name,
   to_regclass('public.'||e.table_name) IS NOT NULL AS table_exists,
   NOT EXISTS (
    SELECT 1 FROM unnest(e.columns_required) col
    WHERE NOT EXISTS(
     SELECT 1 FROM pg_attribute a
     WHERE a.attrelid=to_regclass('public.'||e.table_name)
       AND a.attname=col AND a.attnum>0 AND NOT a.attisdropped
    )
   ) AS all_columns_exist
 FROM expected e
),
checks(sort_key,category,check_name,passed,action_if_blocked) AS (
 SELECT 10,'schema',s.table_name||' table exists',s.table_exists,
   'Stop: database table prerequisite missing; investigate existing migrations'
 FROM schema_status s
 UNION ALL
 SELECT 20,'schema',s.table_name||' required columns',s.table_exists AND s.all_columns_exist,
   'Stop: production schema differs from v113/v116 SQL; review actual columns'
 FROM schema_status s
 UNION ALL
 SELECT 30,'security',t.rel||' RLS enabled',
   coalesce((SELECT c.relrowsecurity FROM pg_class c
             WHERE c.oid=to_regclass('public.'||t.rel)),false),
   'Stop: do not install v125 before confirming RLS is enabled'
 FROM (VALUES('forum_topics'),('forum_posts'),('commons_topics'),('commons_posts')) t(rel)
 UNION ALL
 SELECT 40,'security',t.rel||' service_role can SELECT + UPDATE',
   coalesce(has_table_privilege('service_role',to_regclass('public.'||t.rel),'SELECT'),false)
   AND coalesce(has_table_privilege('service_role',to_regclass('public.'||t.rel),'UPDATE'),false),
   'Review service_role table grants; audited SECURITY INVOKER RPC cannot run without these'
 FROM (VALUES('forum_topics'),('forum_posts'),('commons_topics'),('commons_posts')) t(rel)
 UNION ALL
 SELECT 50,'security','service_role can INSERT attributable audit',
   coalesce(has_table_privilege('service_role',to_regclass('public.admin_audit_log'),'INSERT'),false),
   'Stop: audited mutations cannot commit without this grant'
 UNION ALL
 SELECT 60,'v113','Atomic moderator RPC exact signature installed',
   to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)') IS NOT NULL,
   'Install the reviewed v0.14.0.113 migration ONLY after all schema/security prerequisites pass'
 UNION ALL
 SELECT 70,'v116','Atomic member edit RPC exact signature installed',
   to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)') IS NOT NULL,
   'Install the reviewed v0.14.0.116 migration ONLY after all schema/security prerequisites pass'
 UNION ALL
 SELECT 80,'v113','Atomic moderator RPC service_role EXECUTE',
   coalesce(has_function_privilege('service_role',
    to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)'),'EXECUTE'),false),
   'Verify reviewed v113 GRANT EXECUTE TO service_role'
 UNION ALL
 SELECT 90,'v116','Atomic member edit RPC service_role EXECUTE',
   coalesce(has_function_privilege('service_role',
    to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)'),'EXECUTE'),false),
   'Verify reviewed v116 GRANT EXECUTE TO service_role'
 UNION ALL
 SELECT 100,'security','Anonymous direct execution of v113 denied',
   coalesce(NOT has_function_privilege('anon',
    to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)'),'EXECUTE'),false),
   'Review v113 REVOKE ALL FROM PUBLIC, anon, authenticated'
 UNION ALL
 SELECT 110,'security','Member direct execution of v113 denied',
   coalesce(NOT has_function_privilege('authenticated',
    to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)'),'EXECUTE'),false),
   'Review v113 REVOKE ALL FROM PUBLIC, anon, authenticated'
 UNION ALL
 SELECT 120,'security','Anonymous direct execution of v116 denied',
   coalesce(NOT has_function_privilege('anon',
    to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)'),'EXECUTE'),false),
   'Review v116 REVOKE ALL FROM PUBLIC, anon, authenticated'
 UNION ALL
 SELECT 130,'security','Member direct execution of v116 denied',
   coalesce(NOT has_function_privilege('authenticated',
    to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)'),'EXECUTE'),false),
   'Review v116 REVOKE ALL FROM PUBLIC, anon, authenticated'
)
SELECT category,check_name,
 CASE WHEN passed THEN 'PASS' ELSE 'BLOCKED' END AS result,
 CASE WHEN passed THEN '' ELSE action_if_blocked END AS next_action
FROM checks ORDER BY sort_key,category,check_name;
-- Expected before installing v113/v116: all schema/security prerequisites PASS;
-- v113/v116 checks BLOCKED if uninstalled. After installation all PASS.
-- This verifies objects, not a production member's ability to edit/moderate.
