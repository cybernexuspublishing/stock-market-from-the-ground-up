-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.24
-- REVIEW REQUIRED. STAGING FIRST. NEVER automatically run on a production DB.
-- Additive RPCs for auditable Market Commons / legacy report case management.
-- Preserves existing reports, roles, policies and legacy endpoints; no DML of existing rows.
-- This provides a new transactional case workflow; older endpoints remain separate.
BEGIN;
DO $guard$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','admin_user_flags','admin_user_roles',
  'admin_role_permissions','forum_reports','admin_audit_log'] LOOP
  IF to_regclass(format('public.%I',t)) IS NULL THEN
    RAISE EXCEPTION 'v01424 missing prerequisite table public.%',t;
  END IF;
 END LOOP;
 IF to_regprocedure('auth.uid()') IS NULL THEN
  RAISE EXCEPTION 'v01424 auth.uid() missing';
 END IF;
 IF EXISTS(SELECT 1 FROM (VALUES
   ('profiles','id'),('profiles','account_kind'),
   ('admin_user_flags','user_id'),('admin_user_flags','status'),
   ('admin_user_roles','user_id'),('admin_user_roles','role_code'),('admin_user_roles','expires_at'),
   ('admin_role_permissions','role_code'),('admin_role_permissions','permission_code'),
   ('forum_reports','id'),('forum_reports','content_type'),('forum_reports','content_id'),
   ('forum_reports','reason'),('forum_reports','details'),('forum_reports','status'),
   ('forum_reports','created_at'),('forum_reports','resolved_by'),
   ('forum_reports','resolved_at'),('forum_reports','resolution_note'),
   ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
   ('admin_audit_log','target_type'),('admin_audit_log','target_id'),
   ('admin_audit_log','details')
 ) AS c(tab,col) WHERE NOT EXISTS(
   SELECT 1 FROM information_schema.columns x
   WHERE x.table_schema='public' AND x.table_name=c.tab AND x.column_name=c.col
 )) THEN RAISE EXCEPTION 'v01424 required columns missing'; END IF;
END $guard$;

-- Privileged helper is callable only from the SECURITY DEFINER RPCs below.
-- A forged actor ID from a browser is never accepted: auth.uid() is authoritative.
CREATE OR REPLACE FUNCTION public.gu_mod_case_actor_v01424()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $fn$
DECLARE actor uuid:=auth.uid(); owner_ok boolean; permitted boolean;
BEGIN
 IF actor IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member')
  OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor
   AND lower(f.status) IN ('restricted','suspended'))
  OR EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=actor
   AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RAISE EXCEPTION 'MODERATION_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=actor
  AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now())) INTO owner_ok;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles r
  JOIN public.admin_role_permissions p ON p.role_code=r.role_code
  WHERE r.user_id=actor AND (r.expires_at IS NULL OR r.expires_at>now())
    AND p.permission_code='forum.moderate') INTO permitted;
 IF NOT owner_ok AND NOT permitted THEN
  RAISE EXCEPTION 'MODERATION_FORBIDDEN' USING ERRCODE='42501';
 END IF;
 RETURN jsonb_build_object('id',actor,'owner',owner_ok);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_mod_case_actor_v01424()
 FROM PUBLIC,anon,authenticated;

-- Return at most 25 cases per page, with private report details only to staff
-- authorized to moderate. Never expose reporter identity through this endpoint.
CREATE OR REPLACE FUNCTION public.gu_mod_case_list_v01424(
 p_status text DEFAULT 'open',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $fn$
DECLARE actor jsonb; rows jsonb; more boolean;
BEGIN
 actor:=public.gu_mod_case_actor_v01424();
 IF p_status IS NULL OR p_status NOT IN ('open','reviewing','resolved','dismissed','all')
   OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'MODERATION_INVALID' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',q.id,'contentId',q.content_id,'contentType',q.content_type,
  'reason',q.reason,'details',left(coalesce(q.details,''),1500),
  'status',q.status,'createdAt',q.created_at,
  'resolutionNote',left(coalesce(q.resolution_note,''),500)
 ) ORDER BY q.created_at DESC,q.id DESC),'[]'::jsonb)
 INTO rows FROM (
  SELECT r.id,r.content_id,r.content_type,r.reason,r.details,r.status,
   r.created_at,r.resolution_note
  FROM public.forum_reports r
  WHERE (p_status='all' OR r.status=p_status)
  ORDER BY r.created_at DESC,r.id DESC LIMIT 25 OFFSET (p_page-1)*25
 ) q;
 SELECT EXISTS(SELECT 1 FROM public.forum_reports r
  WHERE (p_status='all' OR r.status=p_status)
  ORDER BY r.created_at DESC,r.id DESC LIMIT 1 OFFSET p_page*25) INTO more;
 RETURN jsonb_build_object('ok',true,'status',p_status,'page',p_page,
  'hasMore',coalesce(more,false),'isOwner',(actor->>'owner')::boolean,'cases',rows);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_mod_case_list_v01424(text,integer)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_mod_case_list_v01424(text,integer) TO authenticated;

-- Report lifecycle: OPEN -> REVIEWING/RESOLVED/DISMISSED;
-- REVIEWING -> OPEN/RESOLVED/DISMISSED; closed -> OPEN only by OWNER.
-- An audit insert failure causes the entire status transition to ROLLBACK.
-- A row lock and expected status prevent conflicting concurrent decisions.
CREATE OR REPLACE FUNCTION public.gu_mod_case_transition_v01424(
 p_report_id bigint,p_expected_status text,p_action text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,auth,pg_temp AS $fn$
DECLARE actor jsonb; current_case public.forum_reports%ROWTYPE; next_status text;
BEGIN
 actor:=public.gu_mod_case_actor_v01424();
 IF p_report_id IS NULL OR p_report_id<=0 OR p_expected_status IS NULL
 OR p_expected_status NOT IN ('open','reviewing','resolved','dismissed')
 OR p_action IS NULL OR p_action NOT IN ('start_review','resolve','dismiss','reopen')
 OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 10 AND 500
 THEN RAISE EXCEPTION 'MODERATION_INVALID' USING ERRCODE='22023'; END IF;
 SELECT * INTO current_case FROM public.forum_reports r
  WHERE r.id=p_report_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MODERATION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF current_case.status IS DISTINCT FROM p_expected_status THEN
  RAISE EXCEPTION 'MODERATION_STALE' USING ERRCODE='40001'; END IF;
 IF p_action='start_review' AND current_case.status='open' THEN next_status:='reviewing';
 ELSIF p_action='resolve' AND current_case.status IN ('open','reviewing') THEN next_status:='resolved';
 ELSIF p_action='dismiss' AND current_case.status IN ('open','reviewing') THEN next_status:='dismissed';
 ELSIF p_action='reopen' AND current_case.status IN ('resolved','dismissed')
  AND (actor->>'owner')::boolean THEN next_status:='open';
 ELSIF p_action='reopen' AND NOT (actor->>'owner')::boolean THEN
  RAISE EXCEPTION 'MODERATION_FORBIDDEN' USING ERRCODE='42501';
 ELSE RAISE EXCEPTION 'MODERATION_INVALID_TRANSITION' USING ERRCODE='22023'; END IF;
 UPDATE public.forum_reports
 SET status=next_status,
     resolved_by=CASE WHEN next_status IN ('resolved','dismissed') THEN (actor->>'id')::uuid ELSE NULL END,
     resolved_at=CASE WHEN next_status IN ('resolved','dismissed') THEN clock_timestamp() ELSE NULL END,
     resolution_note=btrim(p_note)
 WHERE id=p_report_id;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES((actor->>'id')::uuid,'forum.report.case.'||p_action,'forum_report',
  p_report_id::text,jsonb_build_object('from',current_case.status,'to',next_status,
   'note',btrim(p_note),'version','v0.14.0.24'));
 RETURN jsonb_build_object('ok',true,'id',p_report_id,'previousStatus',current_case.status,
   'status',next_status,'audited',true);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_mod_case_transition_v01424(bigint,text,text,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_mod_case_transition_v01424(bigint,text,text,text)
 TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
