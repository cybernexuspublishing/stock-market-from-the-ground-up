-- Retire unused one-time QA transport after provisioning request was blocked.
-- The Edge Function is already a deny-all stub with JWT verification.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.qa_membership_provision_once_20261027 WHERE status <> 'pending')
 THEN RAISE EXCEPTION 'One-use QA batch was consumed; investigate before cleanup'; END IF;
 IF (SELECT COUNT(*) FROM net.http_request_queue) <> 0
 THEN RAISE EXCEPTION 'Outbound requests pending; do not drop pg_net'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE raw_app_meta_data->>'qa_batch'='SMFGU-MEMBERSHIP-9-20261027')
 THEN RAISE EXCEPTION 'Membership QA Auth users exist; reconcile before dropping ephemeral controls'; END IF;
END $$;
DROP TABLE public.qa_membership_provision_once_20261027;
DROP EXTENSION IF EXISTS pg_net;
DROP SCHEMA IF EXISTS net;
