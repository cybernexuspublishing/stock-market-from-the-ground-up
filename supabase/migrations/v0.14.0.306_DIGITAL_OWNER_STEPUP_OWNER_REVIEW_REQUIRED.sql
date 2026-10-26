-- Align Owner digital publishing RPC with established no-MFA password+CAPTCHA
-- re-confirmation. All existing ownership, role and account restrictions remain.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_digital_owner_guard_v01430()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL OR NOT public.gu_staff_stepup_active_v01432r1() OR
    NOT EXISTS(SELECT 1 FROM public.profiles p
      WHERE p.id=u AND p.account_kind='member') OR
    NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
      WHERE r.user_id=u AND r.role_code='OWNER'
      AND (r.expires_at IS NULL OR r.expires_at>now())) OR
    EXISTS(SELECT 1 FROM public.admin_user_roles r
      WHERE r.user_id=u AND r.role_code='SHOWCASE_VIEWER'
      AND (r.expires_at IS NULL OR r.expires_at>now())) OR
    EXISTS(SELECT 1 FROM public.admin_user_flags f
      WHERE f.user_id=u AND lower(f.status) IN ('restricted','suspended'))
 THEN RAISE EXCEPTION 'PASSWORD_RECONFIRM_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN u;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_digital_owner_guard_v01430() FROM PUBLIC,anon,authenticated;
COMMIT;
