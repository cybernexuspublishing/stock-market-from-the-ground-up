-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.32-R1
-- STAGING / SECURITY REVIEW REQUIRED — this replaces specific MFA-dependent
-- database predicates with short-lived server-verified password confirmation.
-- CAPTCHA is separately enforced by Supabase Auth and Cloudflare Turnstile.
-- No direct anon/member grants, no re-opening of private storage, no payment enabling.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.profiles') IS NULL OR to_regclass('public.admin_user_roles') IS NULL
 OR to_regclass('public.admin_user_flags') IS NULL OR to_regclass('public.site_settings') IS NULL
 OR to_regclass('public.gu_digital_books_v01430') IS NULL
 OR to_regprocedure('public.gu_staff_identity_v01431r1()') IS NULL
 OR to_regprocedure('public.gu_digital_upload_allowed_v01430()') IS NULL
 OR to_regprocedure('auth.jwt()') IS NULL OR to_regprocedure('auth.uid()') IS NULL
 THEN RAISE EXCEPTION 'V01432R1_MISSING_PRECONDITIONS'; END IF;
END $guard$;

-- Only a trusted Cloudflare Worker using a server-side service_role secret may
-- populate this ledger AFTER Supabase Auth independently validates the password.
CREATE TABLE IF NOT EXISTS public.gu_staff_password_stepup_v01432r1 (
 user_id uuid NOT NULL, session_id uuid NOT NULL, verified_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL, PRIMARY KEY(user_id,session_id),
 CHECK (expires_at>verified_at AND expires_at <= verified_at+interval '5 minutes')
);
CREATE TABLE IF NOT EXISTS public.gu_staff_stepup_rate_v01432r1 (
 user_id uuid PRIMARY KEY, window_started timestamptz NOT NULL,
 failures integer NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 5)
);
ALTER TABLE public.gu_staff_password_stepup_v01432r1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_staff_stepup_rate_v01432r1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_staff_password_stepup_v01432r1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_staff_stepup_rate_v01432r1 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gu_staff_stepup_active_v01432r1()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT auth.uid() IS NOT NULL AND (auth.jwt()->>'session_id') IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.gu_staff_password_stepup_v01432r1 r
 WHERE r.user_id=auth.uid() AND r.session_id::text=(auth.jwt()->>'session_id')
 AND r.verified_at<=now() AND r.expires_at>now());
$fn$;
REVOKE ALL ON FUNCTION public.gu_staff_stepup_active_v01432r1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_stepup_active_v01432r1() TO authenticated;

-- Worker's service_role executes this; browser members CANNOT mint/extend grants.
CREATE OR REPLACE FUNCTION public.gu_staff_stepup_rate_status_v01432r1(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE rec record;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ROLE_ONLY' USING ERRCODE='42501'; END IF;
 SELECT failures,window_started INTO rec FROM public.gu_staff_stepup_rate_v01432r1 WHERE user_id=p_user;
 RETURN jsonb_build_object('blocked',coalesce(rec.failures,0)>=5 AND
    rec.window_started>now()-interval '15 minutes');
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_stepup_rate_status_v01432r1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_staff_stepup_rate_status_v01432r1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.gu_staff_stepup_attempt_v01432r1(
 p_user uuid,p_session uuid,p_password_ok boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE n integer; w timestamptz;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ROLE_ONLY' USING ERRCODE='42501'; END IF;
 IF p_user IS NULL OR p_session IS NULL OR p_password_ok IS NULL THEN
  RAISE EXCEPTION 'INVALID_STEPUP_INPUT'; END IF;
 -- Serialize per-user attempts to defeat concurrent brute-force requests.
 PERFORM 1 FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_USER'; END IF;
 SELECT failures,window_started INTO n,w FROM public.gu_staff_stepup_rate_v01432r1 WHERE user_id=p_user FOR UPDATE;
 IF n IS NULL OR w<=now()-interval '15 minutes' THEN n:=0;w:=now(); END IF;
 IF n>=5 THEN
  RETURN jsonb_build_object('ok',false,'blocked',true); END IF;
 IF NOT p_password_ok THEN
  DELETE FROM public.gu_staff_password_stepup_v01432r1 WHERE user_id=p_user AND session_id=p_session;
  INSERT INTO public.gu_staff_stepup_rate_v01432r1(user_id,window_started,failures)
   VALUES(p_user,w,n+1) ON CONFLICT(user_id)
   DO UPDATE SET window_started=EXCLUDED.window_started,failures=EXCLUDED.failures;
  RETURN jsonb_build_object('ok',false,'blocked',n+1>=5);
 END IF;
 INSERT INTO public.gu_staff_password_stepup_v01432r1(user_id,session_id,verified_at,expires_at)
 VALUES(p_user,p_session,now(),now()+interval '5 minutes')
 ON CONFLICT(user_id,session_id) DO UPDATE SET verified_at=EXCLUDED.verified_at,expires_at=EXCLUDED.expires_at;
 DELETE FROM public.gu_staff_stepup_rate_v01432r1 WHERE user_id=p_user;
 RETURN jsonb_build_object('ok',true,'expiresInSeconds',300);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_stepup_attempt_v01432r1(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_staff_stepup_attempt_v01432r1(uuid,uuid,boolean) TO service_role;

-- IMPORTANT: No blanket replacement of auth logic. The 13 *known* v31R1
-- functions alone are patched from PostgreSQL's currently installed definitions.
-- If upstream definitions drift, the transaction must ABORT, not silently weaken
-- the checks. All existing role, audit, RLS and Search Path controls are retained.
DO $migrate$
DECLARE f text; oid oid; ddl text; old_ddl text; count_mfa int; updated int:=0; overloads int;
 neq text:='coalesce[[:space:]]*[(][[:space:]]*auth[.]jwt[(][)][[:space:]]*->>[[:space:]]*''aal''[[:space:]]*,[[:space:]]*''''[[:space:]]*[)][[:space:]]*<>[[:space:]]*''aal2''';
 eq text:='coalesce[[:space:]]*[(][[:space:]]*auth[.]jwt[(][)][[:space:]]*->>[[:space:]]*''aal''[[:space:]]*,[[:space:]]*''''[[:space:]]*[)][[:space:]]*=[[:space:]]*''aal2''';
BEGIN
 FOREACH f IN ARRAY ARRAY[
  'gu_digital_owner_guard_v01430','gu_digital_upload_allowed_v01430',
  'gu_owner_operations_save_v01431r1','gu_owner_print_catalog_save_v01428',
  'gu_owner_print_modes_save_v01429','gu_signed_owner_hold_v01431',
  'gu_signed_owner_offer_save_v01431','gu_signed_owner_orders_v01431',
  'gu_signed_owner_payment_switch_save_v01431','gu_signed_owner_session_v01431',
  'gu_signed_owner_transition_v01431','gu_staff_identity_v01431r1',
  'gu_v01431r1_control_write_guard'] LOOP
  SELECT count(*),(array_agg(p.oid))[1] INTO overloads,oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname=f;
  IF overloads<>1 THEN RAISE EXCEPTION 'V01432R1_OVERLOADED_FUNCTION_NOT_REVIEWED: %',f; END IF;
  IF oid IS NULL THEN RAISE EXCEPTION 'V01432R1_FUNCTION_MISSING: %',f; END IF;
  old_ddl:=pg_get_functiondef(oid);
  count_mfa:=length(old_ddl)-length(replace(old_ddl,'aal2',''));
  IF count_mfa=0 OR old_ddl !~ 'SECURITY DEFINER' THEN
    RAISE EXCEPTION 'V01432R1_UNEXPECTED_AUTH_FUNCTION_SOURCE: %',f; END IF;
  ddl:=old_ddl;
  IF f IN ('gu_staff_identity_v01431r1','gu_digital_owner_guard_v01430') THEN
    -- Staff directory / read-only OWNER screens require authenticated role,
    -- but do not prompt for a password on each navigation.
    ddl:=regexp_replace(ddl,neq,'false','g');
  ELSE
    ddl:=regexp_replace(ddl,neq,'NOT public.gu_staff_stepup_active_v01432r1()','g');
    ddl:=regexp_replace(ddl,eq,'public.gu_staff_stepup_active_v01432r1()','g');
  END IF;
  -- Replace obsolete MFA-based error names before checking for any residual
  -- direct aal2 predicates. Error identifiers also contain 'AAL2'.
  ddl:=replace(ddl,'ELIGIBLE_STAFF_AAL2_REQUIRED','ELIGIBLE_STAFF_ROLE_REQUIRED');
  ddl:=replace(ddl,'OWNER_AAL2_REQUIRED_FOR_PROTECTED_SETTING','PASSWORD_RECONFIRM_REQUIRED');
  ddl:=replace(ddl,'OWNER_MFA_REQUIRED','PASSWORD_RECONFIRM_REQUIRED');
  ddl:=replace(ddl,'OWNER_AAL2_REQUIRED','OWNER_ROLE_REQUIRED');
  IF ddl=old_ddl OR position('aal2' IN lower(ddl))>0 THEN
    RAISE EXCEPTION 'V01432R1_PATTERN_MISMATCH: %',f; END IF;
  EXECUTE ddl;
  updated:=updated+1;
 END LOOP;
 IF updated<>13 THEN RAISE EXCEPTION 'INCOMPLETE_STEPUP_FUNCTION_UPDATE'; END IF;
END $migrate$;

-- Narrow service identity check. Avoid retrieving the entire member directory
-- during a password-confirmation or payment-readiness check.
CREATE OR REPLACE FUNCTION public.gu_staff_role_v01432r1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 RETURN jsonb_build_object('ok',true,'role',role);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_role_v01432r1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_role_v01432r1() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_staff_lemon_readiness_v01432r1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; enabled boolean;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 SELECT s.value='true'::jsonb INTO enabled FROM public.site_settings s
 WHERE s.setting_key='commerce.checkout_enabled';
 RETURN jsonb_build_object('ok',true,'role',role,
   'databaseCheckoutEnabled',coalesce(enabled,false));
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_lemon_readiness_v01432r1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_lemon_readiness_v01432r1() TO authenticated;

-- Guard explicit book metadata writes, which previously relied on the AAL2
-- requirement inside gu_digital_owner_guard_v01430(); reads remain role-scoped.
DO $digital$
DECLARE oid oid; d text; patched text;
BEGIN
 SELECT to_regprocedure('public.gu_owner_digital_books_save_v01430(text,boolean,timestamptz,boolean,boolean,boolean,text,timestamptz)') INTO oid;
 IF oid IS NULL THEN RAISE EXCEPTION 'DIGITAL_SAVE_FUNCTION_MISSING'; END IF;
 d:=pg_get_functiondef(oid);
 IF position('u:=public.gu_digital_owner_guard_v01430();' IN d)=0 THEN
   RAISE EXCEPTION 'DIGITAL_SAVE_AUTHORIZATION_INSERTION_MISMATCH'; END IF;
 patched:=replace(d,'u:=public.gu_digital_owner_guard_v01430();',
 'u:=public.gu_digital_owner_guard_v01430();
 IF NOT public.gu_staff_stepup_active_v01432r1() THEN RAISE EXCEPTION ''PASSWORD_RECONFIRM_REQUIRED'' USING ERRCODE=''42501''; END IF;');
 EXECUTE patched;
END $digital$;

-- Full shipping addresses are sensitive; staff role alone is not sufficient.
DO $shipping$
DECLARE oid oid; d text; patched text;
BEGIN
 SELECT to_regprocedure('public.gu_staff_signed_shipping_session_v01431r1(uuid)') INTO oid;
 IF oid IS NULL THEN RAISE EXCEPTION 'STAFF_SHIPPING_FUNCTION_MISSING'; END IF;
 d:=pg_get_functiondef(oid);
 IF position('role:=public.gu_staff_identity_v01431r1();' IN d)=0 THEN
  RAISE EXCEPTION 'STAFF_SHIPPING_AUTHORIZATION_INSERTION_MISMATCH'; END IF;
 patched:=replace(d,'role:=public.gu_staff_identity_v01431r1();',
 'role:=public.gu_staff_identity_v01431r1();
 IF NOT public.gu_staff_stepup_active_v01432r1() THEN RAISE EXCEPTION ''PASSWORD_RECONFIRM_REQUIRED'' USING ERRCODE=''42501''; END IF;');
 EXECUTE patched;
END $shipping$;

-- Protect against deployments that secretly introduce additional direct AAL2
-- predicates in unexpected public SECURITY DEFINER functions.
DO $verify$
DECLARE unresolved text;
BEGIN
 SELECT string_agg(n.nspname||'.'||p.proname,', ') INTO unresolved
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prosecdef AND p.prosrc ~* 'aal2';
 IF unresolved IS NOT NULL THEN RAISE EXCEPTION 'UNRESOLVED_AAL2_DEPENDENCIES: %',unresolved; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE (coalesce(qual,'')||' '||coalesce(with_check,'')) ~* 'aal2')
 THEN RAISE EXCEPTION 'RLS_POLICY_AAL2_REVIEW_REQUIRED'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';
COMMIT;
