-- v0.14.0.7 / Phase A: Safe compatibility preparation. Run manually BEFORE deploying v0.14.0.7.
-- Existing valid reports are untouched. Legacy browser inserts still work during rollout.
-- Must have v0.14.0.0 and v0.14.0.1 schema. Transaction rolls back on errors.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.forum_reports') IS NULL OR to_regclass('public.admin_user_flags') IS NULL
    OR to_regclass('public.profiles') IS NULL OR to_regclass('public.admin_user_roles') IS NULL
    OR to_regprocedure('public.v014_community_report(uuid,text,text,text,text)') IS NULL
    OR to_regprocedure('public.v0143_legacy_forum_can_read()') IS NULL
 THEN RAISE EXCEPTION 'v0.14.0.7 prerequisites missing. No changes applied.'; END IF;
END $$;

-- The deployed legacy read gate from v0.14.0.3 only rejects suspended,
-- not restricted accounts. Correct the shared guard used by legacy read RPCs.
CREATE OR REPLACE FUNCTION public.v0143_legacy_forum_can_read()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
   AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid()
   AND lower(f.status) IN ('suspended','restricted'));
$$;
REVOKE ALL ON FUNCTION public.v0143_legacy_forum_can_read() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v0143_legacy_forum_can_read() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.v014_community_report(
 p_actor uuid,p_type text,p_content text,p_reason text,p_details text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE count24 integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND account_kind='member')
  OR EXISTS(SELECT 1 FROM public.admin_user_flags WHERE user_id=p_actor AND lower(status) IN ('suspended','restricted'))
  OR EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=p_actor AND role_code='SHOWCASE_VIEWER'
     AND (expires_at IS NULL OR expires_at>now()))
 THEN RAISE EXCEPTION 'Eligible production member required'; END IF;
 IF p_type NOT IN ('topic','post')
   OR p_reason NOT IN ('spam','harassment','scam','privacy','misinformation','other')
   OR p_content IS NULL
   OR p_content !~ ('^(commons|legacy):'||p_type||':[0-9]{1,18}$')
   OR length(coalesce(p_details,''))>500
 THEN RAISE EXCEPTION 'Invalid report'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,142003));
 SELECT count(*) INTO count24 FROM public.forum_reports
 WHERE reporter_user_id=p_actor AND created_at>now()-interval '24 hours';
 IF count24>=10 THEN RAISE EXCEPTION 'Report quota reached'; END IF;
 IF EXISTS(SELECT 1 FROM public.forum_reports
   WHERE reporter_user_id=p_actor AND content_id=p_content AND created_at>now()-interval '24 hours')
 THEN RAISE EXCEPTION 'Already reported'; END IF;
 INSERT INTO public.forum_reports(reporter_user_id,content_type,content_id,reason,details,status)
 VALUES(p_actor,p_type,p_content,p_reason,p_details,'open');
 RETURN jsonb_build_object('ok',true);
END; $$;
-- Explicitly clear inherited PUBLIC execution rights (PostgreSQL defaults).
REVOKE ALL ON FUNCTION public.v014_community_report(uuid,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v014_community_report(uuid,text,text,text,text) TO service_role;
-- Repeat the entitlement function grant correction already verified in production;
-- idempotent, and protects fresh installations that lack the earlier manual fix.
REVOKE ALL ON FUNCTION public.user_has_tool_access(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tool_access(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
