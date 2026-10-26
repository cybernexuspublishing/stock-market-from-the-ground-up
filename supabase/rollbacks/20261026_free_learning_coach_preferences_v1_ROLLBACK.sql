-- Rollback for preference feature only. Preserve any user preference/event data.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP TRIGGER IF EXISTS gu_free_learning_preferences_event_v1 ON public.gu_free_learning_preferences_v1;
DROP FUNCTION IF EXISTS public.gu_free_learning_preferences_audit_v1();
COMMIT;
-- Tables intentionally retained for recovery and audit; no destructive production data operation.
