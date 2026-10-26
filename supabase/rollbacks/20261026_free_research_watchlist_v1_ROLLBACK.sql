-- 20261026_free_research_watchlist_v1 preservation-first rollback.
-- If the new feature must be withdrawn, revert its Cloudflare API and UI
-- commits on main, and leave these service-private tables and the audit trail
-- safely dormant. Deleting established member research records is NOT an
-- acceptable automatic rollback; no DDL or destructive data action here.
BEGIN READ ONLY;
SELECT 'ROLLBACK_REQUIRES_SOURCE_REVERT_KEEP_MEMBER_DATA' AS action,
 (SELECT count(*) FROM public.gu_free_research_watchlist_v1) AS preserved_records,
 (SELECT count(*) FROM public.gu_free_research_watchlist_events_v1) AS preserved_audit_events;
COMMIT;