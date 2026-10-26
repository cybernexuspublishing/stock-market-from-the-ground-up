-- v0.14.0.295_academy_metadata_audit rollback.
-- Disable new audit instrumentation only. PRESERVE existing append-only audit
-- events for forensic accountability: never DROP or TRUNCATE the audit table.
-- All underlying existing Academy enrollment, progress and RPC objects remain unchanged.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP TRIGGER IF EXISTS gu_v014295_progress_audit ON public.gu_bootcamp_academy_progress_v014168;
DROP TRIGGER IF EXISTS gu_v014295_enrollment_audit ON public.gu_bootcamp_academy_enrollments_v014168;
DROP FUNCTION IF EXISTS public.gu_v014295_academy_event();
COMMIT;
