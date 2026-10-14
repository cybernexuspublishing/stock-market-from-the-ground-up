-- v0.14.0.7 / Phase B: Finalize AFTER v0.14.0.7 frontend and /api/commons-report deployed.
-- Prerequisite: test legacy topic/post and Commons report creation from eligible member;
-- verify duplicate/quota errors are handled, and moderator can see both types.
-- Do not run before deployment: older forum-topic.js relies on direct INSERT.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.forum_reports') IS NULL OR
    to_regprocedure('public.v014_community_report(uuid,text,text,text,text)') IS NULL
 THEN RAISE EXCEPTION 'Required report objects missing'; END IF;
END $$;
-- Deny direct member inserts, even where a legacy permissive RLS policy exists.
REVOKE INSERT ON TABLE public.forum_reports FROM PUBLIC,anon,authenticated;
-- Remove superseded policies by their VERIFIED current database names, preserving
-- existing read-own policies for any historical report viewing paths.
DROP POLICY IF EXISTS "create own forum reports" ON public.forum_reports;
DROP POLICY IF EXISTS "users create own reports" ON public.forum_reports;
DROP POLICY IF EXISTS v0141_real_member_forum_reports_insert ON public.forum_reports;
-- Existing moderation runs with server service_role, not member INSERT grants.
NOTIFY pgrst,'reload schema';
COMMIT;

-- Inspect after commit. In result, both insert privileges must be FALSE;
-- service_role execution must remain TRUE. No private report content queried.
SELECT
 has_table_privilege('anon','public.forum_reports','INSERT') AS anon_insert,
 has_table_privilege('authenticated','public.forum_reports','INSERT') AS authenticated_insert,
 has_function_privilege('anon','public.v014_community_report(uuid,text,text,text,text)','EXECUTE') AS anon_rpc,
 has_function_privilege('authenticated','public.v014_community_report(uuid,text,text,text,text)','EXECUTE') AS authenticated_rpc,
 has_function_privilege('service_role','public.v014_community_report(uuid,text,text,text,text)','EXECUTE') AS service_rpc,
 has_function_privilege('anon','public.user_has_tool_access(uuid,text)','EXECUTE') AS anon_entitlement_rpc,
 has_function_privilege('authenticated','public.user_has_tool_access(uuid,text)','EXECUTE') AS authenticated_entitlement_rpc;
