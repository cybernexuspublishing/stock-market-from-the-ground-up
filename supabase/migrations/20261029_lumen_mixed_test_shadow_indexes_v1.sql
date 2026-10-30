-- Operational performance: index service-only QA foreign keys used for reconciliation.
-- RLS without member policies is INTENTIONAL: only service_role can access the isolated shadow ledgers.
BEGIN;
CREATE INDEX IF NOT EXISTS gu_mixed_qa_access_user_v1_idx
 ON public.gu_mixed_qa_access_v1(user_id);
CREATE INDEX IF NOT EXISTS gu_mixed_qa_events_intent_v1_idx
 ON public.gu_mixed_qa_events_v1(intent_id);
COMMIT;