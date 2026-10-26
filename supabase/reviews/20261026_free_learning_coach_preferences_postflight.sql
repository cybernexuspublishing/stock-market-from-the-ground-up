BEGIN READ ONLY;
SELECT relname,relrowsecurity,has_table_privilege('anon',oid,'SELECT') anon_read,
 has_table_privilege('authenticated',oid,'SELECT') member_read,
 has_table_privilege('service_role',oid,'INSERT') service_insert
FROM pg_class WHERE relnamespace='public'::regnamespace
 AND relname IN('gu_free_learning_preferences_v1','gu_free_learning_preference_events_v1');
SELECT tgname,tgenabled FROM pg_trigger WHERE tgname='gu_free_learning_preferences_event_v1';
COMMIT;
