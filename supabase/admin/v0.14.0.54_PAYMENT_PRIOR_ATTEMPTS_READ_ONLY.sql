-- Cyber Nexus | v0.14.0.54 | Prior failed Stripe TEST attempts | READ ONLY
-- Document ID: GU-WEB-STRIPE-FORENSICS-014054-20261017
-- Owner query in EXISTING Supabase SQL Editor only. Does not read customers, credentials, or payment card data.
-- One summary grid; intentionally excludes test user UUIDs, session IDs and Stripe customer details.
BEGIN TRANSACTION READ ONLY;
WITH recent AS (
 SELECT status,session_id,created_at,updated_at
 FROM public.gu39_sandbox_intents
 WHERE created_at>=now()-interval '24 hours'
)
SELECT status,COUNT(*) AS attempts,
 COUNT(*) FILTER(WHERE session_id IS NULL) AS without_stripe_session_id,
 COUNT(*) FILTER(WHERE session_id IS NOT NULL) AS with_stripe_session_id,
 MIN(created_at) AS oldest_created_at,
 MAX(created_at) AS newest_created_at,
 MAX(updated_at) AS newest_updated_at
FROM recent
GROUP BY status
ORDER BY status;
ROLLBACK;
-- If PREPARED+without_stripe_session_id > 0, stop: determine from Stripe TEST developer logs
-- whether a session was actually created before touching the test ledger or retrying Checkout.
-- Do not run the old v0.14.0.39 migration again. No records are modified here.
