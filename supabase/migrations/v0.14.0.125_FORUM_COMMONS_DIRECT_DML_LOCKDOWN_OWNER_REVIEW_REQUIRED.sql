-- v0.14.0.125 | OWNER REVIEW REQUIRED | existing single Supabase project.
-- Prevent direct PostgREST/BROWSER UPDATE/DELETE on published Forum and
-- Market Commons content bypassing v113/v116 atomic, attributable audit RPCs.
-- Keep authenticated SELECT/INSERT, forum reports and community social RPCs.
-- No content, event history, grants, price or book records are rewritten.
BEGIN;
DO $prerequisites$
DECLARE rel text;
BEGIN
 IF to_regprocedure('public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)') IS NULL
 OR to_regprocedure('public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)') IS NULL
 OR to_regclass('public.admin_audit_log') IS NULL THEN
  RAISE EXCEPTION 'V125_REQUIRES_INSTALLED_V113_AND_V116_SERVICE_ONLY_ATOMIC_AUDIT_RPCS';
 END IF;
 FOREACH rel IN ARRAY ARRAY['forum_topics','forum_posts','commons_topics','commons_posts'] LOOP
  IF to_regclass('public.'||rel) IS NULL THEN
   RAISE EXCEPTION 'V125_REQUIRES_FOUR_EXISTING_FORUM_CONTENT_TABLES: %',rel;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=rel AND c.relrowsecurity) THEN
   RAISE EXCEPTION 'V125_REQUIRES_ENABLED_RLS_FOR_TABLE: %',rel;
  END IF;
 END LOOP;
END $prerequisites$;
DO $lockdown$
DECLARE rel text; cols text; pol text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['forum_topics','forum_posts','commons_topics','commons_posts'] LOOP
  -- Table grants alone are insufficient: v0.5 granted authenticated UPDATE
  -- *per column*, which survives REVOKE UPDATE ON TABLE.
  EXECUTE format('REVOKE UPDATE, DELETE ON TABLE public.%I FROM PUBLIC,anon,authenticated',rel);
  SELECT string_agg(format('%I',a.attname),',' ORDER BY a.attnum) INTO cols
  FROM pg_attribute a WHERE a.attrelid=to_regclass('public.'||rel)
    AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='';
  IF cols IS NULL THEN RAISE EXCEPTION 'No updatable columns: %',rel; END IF;
  EXECUTE format('REVOKE UPDATE (%s) ON TABLE public.%I FROM PUBLIC,anon,authenticated',cols,rel);
  -- Future accidental GRANT cannot re-enable unaudited browser mutations.
  -- SECURITY INVOKER service-role RPCs and SECURITY DEFINER owned helpers
  -- operate as trusted backend roles, not authenticated.
  pol:='gu_v014125_authenticated_direct_update_denied';
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',pol,rel);
  EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false)',pol,rel);
  pol:='gu_v014125_authenticated_direct_delete_denied';
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',pol,rel);
  EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (false)',pol,rel);
 END LOOP;
END $lockdown$;
-- Abort entire transaction if any direct authenticated column or table UPDATE
-- remained. This also protects against a future different column-grant set.
DO $verify$
DECLARE rel text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['forum_topics','forum_posts','commons_topics','commons_posts'] LOOP
  IF has_any_column_privilege('authenticated','public.'||rel,'UPDATE') OR
     has_any_column_privilege('anon','public.'||rel,'UPDATE') OR
     has_table_privilege('authenticated','public.'||rel,'DELETE') OR
     has_table_privilege('anon','public.'||rel,'DELETE') THEN
    RAISE EXCEPTION 'V125_FORUM_DIRECT_DML_STILL_ALLOWED: %',rel;
  END IF;
 END LOOP;
 IF NOT has_function_privilege('service_role',
   'public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)','EXECUTE')
 OR NOT has_function_privilege('service_role',
   'public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.gu_v014113_moderate_with_audit(uuid,text,text,bigint,text,text,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)','EXECUTE') THEN
   RAISE EXCEPTION 'V125_FORUM_ATOMIC_AUDIT_RPC_GRANTS_NOT_SAFE';
 END IF;
END $verify$;
NOTIFY pgrst,'reload schema';
COMMIT;
