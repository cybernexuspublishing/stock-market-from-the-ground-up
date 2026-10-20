-- v125 READ ONLY / SINGLE RESULT: access audit after installation.
-- True means no unaudited direct update/delete; approved create/read remains.
WITH content AS (
 SELECT rel FROM (VALUES('forum_topics'),('forum_posts'),('commons_topics'),('commons_posts')) r(rel)
), checks AS (
 SELECT rel||' authenticated UPDATE column grant removed' label,
        NOT has_any_column_privilege('authenticated','public.'||rel,'UPDATE') pass FROM content
 UNION ALL SELECT rel||' authenticated DELETE removed',
        NOT has_table_privilege('authenticated','public.'||rel,'DELETE') FROM content
 UNION ALL SELECT rel||' anon UPDATE column grant removed',
        NOT has_any_column_privilege('anon','public.'||rel,'UPDATE') FROM content
 UNION ALL SELECT rel||' anon DELETE removed',
        NOT has_table_privilege('anon','public.'||rel,'DELETE') FROM content
 UNION ALL SELECT rel||' restrictive UPDATE policy active',
 EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=to_regclass('public.'||rel)
 AND p.polname='gu_v014125_authenticated_direct_update_denied' AND NOT p.polpermissive) FROM content
 UNION ALL SELECT rel||' restrictive DELETE policy active',
 EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=to_regclass('public.'||rel)
 AND p.polname='gu_v014125_authenticated_direct_delete_denied' AND NOT p.polpermissive) FROM content
 UNION ALL SELECT 'v113 backend moderation RPC allowed',
 coalesce(has_function_privilege('service_role',
 to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)'),'EXECUTE'),false)
 UNION ALL SELECT 'v116 backend member RPC allowed',
 coalesce(has_function_privilege('service_role',
 to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)'),'EXECUTE'),false)
 UNION ALL SELECT 'v113 direct member RPC blocked',
 coalesce(NOT has_function_privilege('authenticated',
 to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)'),'EXECUTE'),false)
 UNION ALL SELECT 'v116 direct member RPC blocked',
 coalesce(NOT has_function_privilege('authenticated',
 to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)'),'EXECUTE'),false)
)
SELECT label,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END result FROM checks ORDER BY label;
-- Postflight is prerequisite/role coverage, not live account-role acceptance.
