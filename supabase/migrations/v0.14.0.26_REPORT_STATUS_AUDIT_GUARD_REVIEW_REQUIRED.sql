-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.26
-- REVIEW REQUIRED. STAGING FIRST. Never auto-apply to a production database.
-- Database-level immutable audit BACKSTOP for Market Commons / legacy report
-- STATUS CHANGES regardless of which historic Cloudflare endpoint wrote them.
-- Does not alter existing report content, subscriptions, memberships or roles.
-- Adds an AFTER UPDATE trigger only and does not alter old API contracts.
-- One status update yields one system audit row in the SAME transaction.
-- v0.14.0.24 case RPC ALSO inserts its business audit row; both are intentional
-- separate audit evidence (trigger integrity vs detailed staff decision).
BEGIN;
DO $guard$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['forum_reports','admin_audit_log'] LOOP
  IF to_regclass(format('public.%I',relation_name)) IS NULL THEN
   RAISE EXCEPTION 'v01426 prerequisite missing: %',relation_name;
  END IF;
 END LOOP;
 IF to_regprocedure('auth.uid()') IS NULL THEN
  RAISE EXCEPTION 'v01426 requires auth.uid()';
 END IF;
 IF EXISTS(SELECT 1 FROM (VALUES
  ('forum_reports','id'),('forum_reports','status'),('forum_reports','resolved_by'),
  ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
  ('admin_audit_log','target_type'),('admin_audit_log','target_id'),
  ('admin_audit_log','details')
 ) c(tab,col) WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns i
  WHERE i.table_schema='public' AND i.table_name=c.tab AND i.column_name=c.col
 )) THEN RAISE EXCEPTION 'v01426 required columns missing'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns i
  WHERE i.table_schema='public' AND i.table_name='admin_audit_log'
    AND i.column_name='actor_user_id' AND i.is_nullable='YES'
 ) THEN RAISE EXCEPTION 'v01426 requires nullable admin_audit_log.actor_user_id (service_role actions have no verified actor)'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns i
  WHERE i.table_schema='public' AND i.table_name='admin_audit_log'
    AND i.column_name='details' AND i.udt_name='jsonb'
 ) THEN RAISE EXCEPTION 'v01426 requires admin_audit_log.details jsonb'; END IF;
END $guard$;

-- SECURITY DEFINER because existing service-role endpoints bypass member RLS;
-- this is a narrow trigger-only function; it accepts NO actor/user input.
-- Force PostgreSQL catalog-first resolution; always qualify table names.
CREATE OR REPLACE FUNCTION public.gu_report_status_audit_v01426()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE verified_actor uuid;
BEGIN
 IF TG_OP IS DISTINCT FROM 'UPDATE' OR TG_WHEN IS DISTINCT FROM 'AFTER'
 THEN RAISE EXCEPTION 'AUDIT_TRIGGER_INVALID_INVOCATION' USING ERRCODE='42501'; END IF;
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

 -- Auth-bound PostgreSQL callers carry auth.uid(). Cloudflare service-role
 -- callers ordinarily do NOT; never falsely attribute those changes to a
 -- browser-supplied user ID or assert an unverified staff identity.
 verified_actor:=auth.uid();
 -- A resolved_by field written by the existing endpoint is useful attribution
 -- for closing actions; the origin marker below explains that it is supplied
 -- by the existing application path, not independently re-authenticated here.
 IF NEW.resolved_by IS NOT NULL THEN verified_actor:=NEW.resolved_by; END IF;

 -- Absolutely NO exception-swallowing: a failed audit INSERT must roll back
 -- the status UPDATE, including operations invoked by older admin endpoints.
 INSERT INTO public.admin_audit_log
   (actor_user_id,action,target_type,target_id,details)
 VALUES(verified_actor,'forum.report.status.guard.v01426','forum_report',
        NEW.id::text,
        jsonb_build_object(
         'from',OLD.status,'to',NEW.status,
         'source','database_status_trigger_v01426',
         'actor_provenance',CASE
            WHEN NEW.resolved_by IS NOT NULL THEN 'report.resolved_by'
            WHEN verified_actor IS NOT NULL THEN 'auth.uid'
            ELSE 'unknown_service_action' END,
         'authoritative_staff_identity',false,
         'version','v0.14.0.26'));
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_report_status_audit_v01426()
 FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS gu_report_status_audit_v01426 ON public.forum_reports;
CREATE TRIGGER gu_report_status_audit_v01426
AFTER UPDATE OF status ON public.forum_reports
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.gu_report_status_audit_v01426();
COMMIT;
