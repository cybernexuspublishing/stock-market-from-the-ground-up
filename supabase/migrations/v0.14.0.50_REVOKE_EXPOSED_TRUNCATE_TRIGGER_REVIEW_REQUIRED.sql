-- Cyber Nexus | v0.14.0.50 | P0 exposed-role ACL hardening | REVIEW REQUIRED
-- Document ID GU-WEB-SUPABASE-ACL-MIGRATION-014050-20261017
-- APPLY ONLY after Owner reviews PRE + POST and explicitly approves a production change.
-- Revoke ONLY TRUNCATE/TRIGGER on eight tables from exposed roles.
-- Preserve all RLS policies, object definitions, existing triggers, and normal row CRUD grants.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $guard$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (VALUES
  ('forum_categories'),('forum_posts'),('forum_topics'),('decision_journal'),
  ('entitlements'),('lab_attempts'),('lab_progress'),('profiles')
 ) v(name) WHERE to_regclass(format('public.%I',v.name)) IS NOT NULL;
 IF n<>8 THEN RAISE EXCEPTION 'GU50_MISSING_REQUIRED_TARGET_TABLE: found % of 8',n; END IF;
END;
$guard$;
REVOKE TRUNCATE, TRIGGER ON TABLE
 public.forum_categories, public.forum_posts, public.forum_topics
 FROM anon, authenticated;
REVOKE TRUNCATE, TRIGGER ON TABLE
 public.decision_journal, public.entitlements, public.lab_attempts,
 public.lab_progress, public.profiles
 FROM authenticated;
-- Fail the entire transaction if a PUBLIC grant or another inheritance path
-- still confers these destructive permissions. Never pretend partial success.
DO $verify$
DECLARE rec record; privilege_name text;
BEGIN
 FOR rec IN SELECT * FROM (VALUES
    ('anon','forum_categories'),('anon','forum_posts'),('anon','forum_topics'),
    ('authenticated','forum_categories'),('authenticated','forum_posts'),('authenticated','forum_topics'),
    ('authenticated','decision_journal'),('authenticated','entitlements'),('authenticated','lab_attempts'),
    ('authenticated','lab_progress'),('authenticated','profiles')
 ) AS t(role_name,table_name) LOOP
   FOREACH privilege_name IN ARRAY ARRAY['TRUNCATE','TRIGGER'] LOOP
     IF COALESCE(has_table_privilege(rec.role_name,
          to_regclass(format('public.%I',rec.table_name)),privilege_name),false) THEN
       RAISE EXCEPTION 'GU50_REVOKE_INCOMPLETE: %, %, %',
         rec.role_name,rec.table_name,privilege_name;
     END IF;
   END LOOP;
 END LOOP;
END;
$verify$;
COMMIT;
-- After approved execution: run the matching read-only postflight and export results.
