-- October 26, 2026. Narrow the privileged membership snapshot to authenticated users.
-- Signed-out navigation already returns a local SIGNED_OUT state without calling
-- this RPC; account/plan calculations and service-role callers are unchanged.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.my_platform_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_platform_access() TO authenticated, service_role;
COMMIT;
