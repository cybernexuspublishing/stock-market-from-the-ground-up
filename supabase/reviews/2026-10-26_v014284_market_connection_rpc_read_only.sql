-- v0.14.0.284 | Postflight. Privileges only; never select member connections.
BEGIN READ ONLY;
SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_can_call,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS member_can_call,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS server_can_call
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='my_market_data_connections';
COMMIT;
