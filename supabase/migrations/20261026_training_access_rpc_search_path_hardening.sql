-- Hardening only: keep ONDEMAND access contract and all member records intact.
-- Existing user_has_tool_access only names public.<table> relations. Supabase
-- recommends a zero search_path for SECURITY DEFINER functions.
BEGIN;
DO $check$
DECLARE fn text;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_proc WHERE oid='public.user_has_tool_access(uuid,text)'::regprocedure
   AND proconfig @> ARRAY['search_path=public']::text[]
 ) THEN RAISE EXCEPTION 'FUNCTION_SEARCH_PATH_BASELINE_CHANGED'; END IF;
 IF has_function_privilege('anon','public.user_has_tool_access(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.user_has_tool_access(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.user_has_tool_access(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'UNEXPECTED_TOOL_ACCESS_FUNCTION_GRANTS'; END IF;
 fn:=pg_get_functiondef('public.user_has_tool_access(uuid,text)'::regprocedure);
 IF position('target_tool=''ONDEMAND_TRAINING''' in fn)=0
  OR position('g.plan_code=''ONDEMAND_MONTHLY''' in fn)=0
  OR position('FROM public.' in fn)=0
 THEN RAISE EXCEPTION 'TRAINING_ACCESS_BEHAVIOR_CONTRACT_CHANGED'; END IF;
END $check$;
ALTER FUNCTION public.user_has_tool_access(uuid,text) SET search_path = '';
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('tool_access_definer_search_path_hardened','database_function',
       'public.user_has_tool_access(uuid,text)',
       jsonb_build_object('reason','Set empty search_path; all table names already explicitly qualified',
       'behavior_changed',false,'entitlements_changed',false,'payments_changed',false,
       'execution_grants_changed',false));
COMMIT;
