-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.25
-- MANUAL SQL REVIEW REQUIRED. Do not auto-execute in production.
-- Read-only RPC backed by existing transactional v0.14.0.24 audit entries.
-- NO table alterations, no membership or moderation state changes.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.admin_audit_log') IS NULL
  OR to_regclass('public.forum_reports') IS NULL
  OR to_regprocedure('public.gu_mod_case_actor_v01424()') IS NULL
 THEN RAISE EXCEPTION 'v01425 missing moderation/audit prerequisites'; END IF;
 IF EXISTS(
  SELECT 1 FROM (VALUES
    ('admin_audit_log','action'),('admin_audit_log','target_type'),
    ('admin_audit_log','target_id'),('admin_audit_log','details'),
    ('admin_audit_log','created_at'),('forum_reports','id')
  ) AS required(tab,col)
  WHERE NOT EXISTS(SELECT 1 FROM information_schema.columns c
   WHERE c.table_schema='public' AND c.table_name=required.tab AND c.column_name=required.col)
 ) THEN RAISE EXCEPTION 'v01425 audit log columns incompatible'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.gu_mod_case_history_v01425(p_report_id bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $fn$
DECLARE actor jsonb; records jsonb;
BEGIN
 -- The existing actor helper checks actual auth.uid(), active role grants,
 -- production member status, suspended/restricted account and Showcase denial.
 actor:=public.gu_mod_case_actor_v01424();
 IF p_report_id IS NULL OR p_report_id<=0 THEN
  RAISE EXCEPTION 'MODERATION_INVALID' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.forum_reports r WHERE r.id=p_report_id) THEN
  RAISE EXCEPTION 'MODERATION_NOT_FOUND' USING ERRCODE='P0002';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'action',h.action,
  'from',left(coalesce(h.details->>'from',''),30),
  'to',left(coalesce(h.details->>'to',''),30),
  'note',left(coalesce(h.details->>'note',''),500),
  'loggedAt',h.created_at
 ) ORDER BY h.created_at DESC),'[]'::jsonb) INTO records
 FROM (
  SELECT a.action,a.details,a.created_at
  FROM public.admin_audit_log a
  WHERE a.target_type='forum_report' AND a.target_id=p_report_id::text
   AND a.action LIKE 'forum.report.case.%'
  ORDER BY a.created_at DESC LIMIT 50
 ) h;
 RETURN jsonb_build_object('ok',true,'history',records);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_mod_case_history_v01425(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_mod_case_history_v01425(bigint) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
