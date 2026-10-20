-- v128 disposable PostgreSQL 16 regression. NEVER run in Supabase.
\set ON_ERROR_STOP on
DO $inspect$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.gu_billing_notice_outbox_v014123
   WHERE dedup_key IN ('v128-expired-attempt-12','v128-due-retry-attempt-12')
    AND (delivery_status<>'dead' OR lease_token IS NOT NULL OR lease_expires_at IS NOT NULL)
 ) THEN RAISE EXCEPTION 'v128 migration did not repair prior exhausted due leases'; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.gu_billing_notice_outbox_v014123
   WHERE dedup_key='v128-not-expired-attempt-12'
     AND delivery_status='leased' AND lease_expires_at>now()
 ) THEN RAISE EXCEPTION 'v128 migration tampered with a still-active lease'; END IF;
 IF has_function_privilege('authenticated','public.gu_v014123_claim_notices(integer)','EXECUTE')
    OR has_function_privilege('anon','public.gu_v014123_claim_notices(integer)','EXECUTE')
 THEN RAISE EXCEPTION 'v128 reopened private claim execution to users'; END IF;
END $inspect$;
SET ROLE service_role;
-- Expire a previously active but now exhausted lease: the NEW claim must
-- transition it to DEAD, not strand it, and never return a sendable job.
UPDATE public.gu_billing_notice_outbox_v014123
SET lease_expires_at=now()-interval '1 minute'
WHERE dedup_key='v128-not-expired-attempt-12';
DO $test$
DECLARE
 job record;
 count_jobs integer:=0;
 label text;
 acknowledged boolean;
BEGIN
 FOR job IN SELECT * FROM public.gu_v014123_claim_notices(10) LOOP
  count_jobs:=count_jobs+1;
  SELECT dedup_key INTO label FROM public.gu_billing_notice_outbox_v014123
   WHERE id=job.id;
  IF label<>'v128-ready-attempt-0' THEN
   RAISE EXCEPTION 'v128 returned an exhausted lease as sendable: %',label;
  END IF;
  IF job.lease_token IS NULL THEN
   RAISE EXCEPTION 'v128 valid lease has no token'; END IF;
  acknowledged:=public.gu_v014123_ack_notice(job.id,job.lease_token,true,'resend_disposable_123');
  IF acknowledged IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'v128 failed to settle an eligible email lease';END IF;
 END LOOP;
 IF count_jobs<>1 THEN
  RAISE EXCEPTION 'v128 expected exactly one sendable job, got %',count_jobs;END IF;
 IF (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123
     WHERE delivery_status='dead')<>3 THEN
  RAISE EXCEPTION 'v128 exhausted leases must be dead letter, not endlessly leased';END IF;
 IF (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123
     WHERE delivery_status='sent')<>1 THEN
  RAISE EXCEPTION 'v128 valid job did not enter sent state';END IF;
 IF EXISTS(SELECT 1 FROM public.gu_v014123_claim_notices(10)) THEN
  RAISE EXCEPTION 'v128 retried already-settled/dead work';END IF;
 -- Last available send (attempt 12) may be unsuccessful; ACK must DEAD-letter.
 UPDATE public.gu_billing_notice_outbox_v014123 SET
  delivery_status='retry',attempts=11,next_attempt_at=now()-interval '1 minute',
  lease_token=NULL,lease_expires_at=NULL WHERE dedup_key='v128-ready-attempt-0';
 SELECT * INTO job FROM public.gu_v014123_claim_notices(1);
 IF job.id IS NULL OR
  (SELECT attempts FROM public.gu_billing_notice_outbox_v014123 WHERE id=job.id)<>12 THEN
  RAISE EXCEPTION 'v128 claim from attempt 11 to 12 failed';END IF;
 acknowledged:=public.gu_v014123_ack_notice(job.id,job.lease_token,false,NULL);
 IF acknowledged IS DISTINCT FROM true OR NOT EXISTS(
  SELECT 1 FROM public.gu_billing_notice_outbox_v014123
   WHERE id=job.id AND delivery_status='dead' AND attempts=12) THEN
  RAISE EXCEPTION 'v128 12th failed send must be dead, not repeat forever';END IF;
 RAISE NOTICE 'PASS v128: old exhausted leases repaired, new expired exhaustion dead-lettered, active leases untouched, service-only ack and bounded attempts';
END $test$;
RESET ROLE;
