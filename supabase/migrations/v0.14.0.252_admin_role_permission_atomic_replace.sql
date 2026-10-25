-- v0.14.0.252 Admin Role Permission atomic update. Applied to Supabase production with restricted service-role execution.
-- This function is deliberately SECURITY INVOKER and validates the active Owner server-side.
CREATE OR REPLACE FUNCTION public.v014252_admin_role_permissions_replace(p_actor uuid, p_role_code text, p_permissions text[], p_expected_permissions text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
 v_current text[] := ARRAY[]::text[];
 v_requested text[] := ARRAY[]::text[];
 v_expected text[] := ARRAY[]::text[];
 v_exists text;
BEGIN
 IF p_actor IS NULL OR p_role_code IS NULL OR p_role_code !~ '^[A-Z][A-Z0-9_]{1,79}$'
   OR p_permissions IS NULL OR p_expected_permissions IS NULL
   OR cardinality(p_permissions)>100 OR cardinality(p_expected_permissions)>100
 THEN RAISE EXCEPTION 'Invalid role permissions request.' USING ERRCODE='22023'; END IF;

 IF NOT EXISTS (
   SELECT 1 FROM public.admin_user_roles ur
   JOIN public.profiles pr ON pr.id=ur.user_id
   WHERE ur.user_id=p_actor AND ur.role_code='OWNER'
     AND (ur.expires_at IS NULL OR ur.expires_at>now())
     AND pr.account_kind='member' AND pr.deleted_at IS NULL
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_roles ur
   WHERE ur.user_id=p_actor AND ur.role_code='SHOWCASE_VIEWER'
     AND (ur.expires_at IS NULL OR ur.expires_at>now())
 ) OR EXISTS (
   SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor
     AND f.status IN ('restricted','suspended')
 )
 THEN RAISE EXCEPTION 'Verified active production Owner required.' USING ERRCODE='42501'; END IF;

 IF p_role_code IN ('OWNER','SHOWCASE_VIEWER') THEN
   RAISE EXCEPTION 'Protected role permission matrix cannot be edited here.' USING ERRCODE='42501';
 END IF;

 SELECT role_code INTO v_exists FROM public.admin_roles WHERE role_code=p_role_code FOR UPDATE;
 IF v_exists IS NULL THEN RAISE EXCEPTION 'Role does not exist.' USING ERRCODE='22023'; END IF;

 IF EXISTS(SELECT 1 FROM unnest(p_permissions) AS x(code) WHERE code IS NULL OR code='')
  OR EXISTS(SELECT 1 FROM unnest(p_expected_permissions) AS x(code) WHERE code IS NULL OR code='')
 THEN RAISE EXCEPTION 'Permission names cannot be empty.' USING ERRCODE='22023'; END IF;

 SELECT coalesce(array_agg(DISTINCT code ORDER BY code),ARRAY[]::text[])
 INTO v_requested FROM unnest(p_permissions) AS x(code);
 SELECT coalesce(array_agg(DISTINCT code ORDER BY code),ARRAY[]::text[])
 INTO v_expected FROM unnest(p_expected_permissions) AS x(code);
 SELECT coalesce(array_agg(permission_code ORDER BY permission_code),ARRAY[]::text[])
 INTO v_current FROM public.admin_role_permissions WHERE role_code=p_role_code;

 IF v_current IS DISTINCT FROM v_expected THEN
   RAISE EXCEPTION 'Role permissions changed after this editor loaded; refresh before saving.' USING ERRCODE='40001';
 END IF;
 IF EXISTS (
   SELECT 1 FROM unnest(v_requested) AS x(code)
   WHERE NOT EXISTS(SELECT 1 FROM public.admin_permissions p WHERE p.permission_code=x.code)
 ) THEN RAISE EXCEPTION 'Unknown permission code.' USING ERRCODE='22023'; END IF;

 INSERT INTO public.admin_role_permissions(role_code,permission_code)
 SELECT p_role_code,code FROM unnest(v_requested) AS x(code)
 ON CONFLICT (role_code,permission_code) DO NOTHING;
 DELETE FROM public.admin_role_permissions
 WHERE role_code=p_role_code AND NOT(permission_code = ANY(v_requested));

 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'role.permissions.replace','role',p_role_code,
   jsonb_build_object('before_count',cardinality(v_current),'after_count',cardinality(v_requested),'atomic',true));
 RETURN jsonb_build_object('ok',true,'role_code',p_role_code,'count',cardinality(v_requested),'changed',v_current IS DISTINCT FROM v_requested);
END;
$function$
REVOKE ALL ON FUNCTION public.v014252_admin_role_permissions_replace(uuid,text,text[],text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v014252_admin_role_permissions_replace(uuid,text,text[],text[]) TO service_role;
