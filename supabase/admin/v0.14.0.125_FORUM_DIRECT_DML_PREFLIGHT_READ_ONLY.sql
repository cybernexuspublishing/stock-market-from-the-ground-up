-- v125 READ ONLY / SINGLE RESULT: run in Supabase SQL Editor.
-- STOP for missing v113/v116 or content objects; do not blindly reapply SQL.
WITH checks(label,pass) AS (
 VALUES
 ('v113 atomic moderator RPC installed',to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)') IS NOT NULL),
 ('v116 atomic member content RPC installed',to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)') IS NOT NULL),
 ('Legacy forum topics',to_regclass('public.forum_topics') IS NOT NULL),
 ('Legacy forum replies',to_regclass('public.forum_posts') IS NOT NULL),
 ('Market Commons topics',to_regclass('public.commons_topics') IS NOT NULL),
 ('Market Commons replies',to_regclass('public.commons_posts') IS NOT NULL),
 ('Atomic audit destination',to_regclass('public.admin_audit_log') IS NOT NULL),
 ('v113 backend execute enabled',coalesce(has_function_privilege('service_role',
  to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)'),'EXECUTE'),false)),
 ('v116 backend execute enabled',coalesce(has_function_privilege('service_role',
  to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)'),'EXECUTE'),false))
)
SELECT label,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END result FROM checks ORDER BY label;
