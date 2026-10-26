-- Owner-reviewed rollback only if function behavior requires reverting.
BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM pg_proc WHERE oid='public.user_has_tool_access(uuid,text)'::regprocedure
   AND proconfig @> ARRAY['search_path=']::text[]
 ) THEN RAISE EXCEPTION 'SEARCH_PATH_EXPECTED_EMPTY'; END IF;
END $check$;
ALTER FUNCTION public.user_has_tool_access(uuid,text) SET search_path = public;
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('tool_access_definer_search_path_rollback','database_function',
       'public.user_has_tool_access(uuid,text)',
       jsonb_build_object('reason','Audited Owner-reviewed metadata-only rollback'));
COMMIT;
