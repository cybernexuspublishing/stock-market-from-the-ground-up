-- v0.14.0.284 | SECURITY DEFINER market account summaries require a signed-in caller.
-- No source file, public registration RPC, stored connection or trading data changes.
-- GitHub source search found no guest runtime consumer of this RPC.
-- Rollback: supabase/rollbacks/v0.14.0.284_market_connection_rpc_anon_ROLLBACK.sql
BEGIN;
DO $pre$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='my_market_data_connections'
      AND pg_get_function_identity_arguments(p.oid)=''
      AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE')
      AND has_function_privilege('authenticated',p.oid,'EXECUTE')
      AND has_function_privilege('service_role',p.oid,'EXECUTE'))
 THEN RAISE EXCEPTION 'V014284_RPC_BASELINE_DRIFT'; END IF;
END $pre$;
REVOKE EXECUTE ON FUNCTION public.my_market_data_connections() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_market_data_connections() TO authenticated,service_role;
COMMIT;
