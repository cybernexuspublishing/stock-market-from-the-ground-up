-- V3 foreign-key delete/reconciliation indexes. Both tables remain
-- RLS-locked and service-role-only, with no public/member policies.
BEGIN;
CREATE INDEX IF NOT EXISTS gu_watchlist_journal_transfers_v3_plan_idx
 ON public.gu_watchlist_journal_transfers_v3(plan_id);
CREATE INDEX IF NOT EXISTS gu_watchlist_alert_events_v3_candidate_idx
 ON public.gu_watchlist_alert_events_v3(candidate_id);
COMMIT;