BEGIN READ ONLY;
SELECT c.relname,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') anon_can_read,
 has_table_privilege('authenticated',c.oid,'SELECT') member_can_read,
 has_table_privilege('service_role',c.oid,'SELECT') service_can_read
 FROM pg_class c WHERE c.oid IN ('public.gu_free_research_watchlist_v1'::regclass,
 'public.gu_free_research_watchlist_events_v1'::regclass);
SELECT tgname,tgenabled FROM pg_trigger WHERE tgname IN('gu_free_watchlist_limit_before_v1','gu_free_watchlist_audit_after_v1');
SELECT count(*) rows FROM public.gu_free_research_watchlist_v1;
COMMIT;