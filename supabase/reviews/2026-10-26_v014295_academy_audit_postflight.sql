-- Read-only audit-installation postflight v0.14.0.295_academy_metadata_audit.
BEGIN READ ONLY;
SELECT c.relname AS relation,c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_can_read,
 has_table_privilege('authenticated',c.oid,'SELECT') AS member_can_read,
 has_table_privilege('service_role',c.oid,'INSERT') AS service_can_append
FROM pg_class c WHERE c.oid='public.gu_bootcamp_academy_audit_v014295'::regclass;
SELECT t.tgname,t.tgenabled,t.tgrelid::regclass::text AS source_table
FROM pg_trigger t WHERE t.tgname IN
 ('gu_v014295_enrollment_audit','gu_v014295_progress_audit') ORDER BY t.tgname;
SELECT count(*) AS recorded_events,
 count(*) FILTER(WHERE event_kind='reflection_saved') AS first_saved_reflections,
 count(*) FILTER(WHERE event_kind='reflection_updated') AS revised_reflections
FROM public.gu_bootcamp_academy_audit_v014295;
COMMIT;
