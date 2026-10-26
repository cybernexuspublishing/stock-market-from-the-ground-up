BEGIN READ ONLY;
SELECT p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon','public.user_has_tool_access(uuid,text)','EXECUTE') AS anon_execute,
 has_function_privilege('authenticated','public.user_has_tool_access(uuid,text)','EXECUTE') AS member_execute,
 has_function_privilege('service_role','public.user_has_tool_access(uuid,text)','EXECUTE') AS service_execute
 FROM pg_proc p WHERE p.oid='public.user_has_tool_access(uuid,text)'::regprocedure;
ROLLBACK;