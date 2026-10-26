-- Hardening: trigger functions execute via table triggers, never a direct Data API RPC.
-- Preserve table INSERT/UPDATE/DELETE policies, Owner checks and trigger operation.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.gu_store_category_lifecycle_v014298() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.gu_store_photo_lifecycle_v014300() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.gu_store_expense_audit_v014302() FROM PUBLIC,anon,authenticated;
COMMIT;
