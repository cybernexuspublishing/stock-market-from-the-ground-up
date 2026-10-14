-- OWNER REPORTING POLICY (v0.14.0.17) — candidate migration, NEVER auto-executed.
-- Prerequisites: v0.14.0.7 A/B reporting lockdown already installed.
-- Run read-only preflight, test on staging, then apply ONCE; execute postflight.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.forum_reports') IS NULL
   OR to_regclass('public.profiles') IS NULL
   OR to_regclass('public.admin_user_flags') IS NULL
   OR to_regclass('public.admin_user_roles') IS NULL
   OR to_regclass('public.admin_audit_log') IS NULL
   OR to_regprocedure('public.v014_community_report(uuid,text,text,text,text)') IS NULL
 THEN RAISE EXCEPTION 'Missing reporting/security prerequisites; abort.'; END IF;
END $$;

-- Accelerate report-count and duplicate window queries without changing report data.
CREATE INDEX IF NOT EXISTS forum_reports_reporter_date_v01417_idx ON public.forum_reports(reporter_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS forum_reports_reporter_target_date_v01417_idx ON public.forum_reports(reporter_user_id,content_id,created_at DESC);

-- Dedicated authoritative policies cannot be altered by generic site_settings administration.
-- This deliberately does NOT replicate existing site_settings rows or grant direct member table access.
CREATE TABLE IF NOT EXISTS public.community_report_policy_v01417 (
 policy_id smallint PRIMARY KEY DEFAULT 1 CHECK(policy_id=1),
 quota_enabled boolean NOT NULL DEFAULT true,
 quota_max integer NOT NULL DEFAULT 10 CHECK(quota_max BETWEEN 1 AND 100),
 quota_hours integer NOT NULL DEFAULT 24 CHECK(quota_hours BETWEEN 1 AND 168),
 duplicate_enabled boolean NOT NULL DEFAULT true,
 duplicate_hours integer NOT NULL DEFAULT 24 CHECK(duplicate_hours BETWEEN 1 AND 168),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.community_report_policy_v01417(policy_id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.community_report_policy_v01417 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.community_report_policy_v01417 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON TABLE public.community_report_policy_v01417 TO service_role;

-- Optimistic locking + DB authority check + audit operate within one DB transaction.
CREATE OR REPLACE FUNCTION public.gu_owner_report_policy_save_v01417(
 p_actor uuid,p_expected_version bigint,p_quota_enabled boolean,p_quota_max integer,
 p_quota_hours integer,p_duplicate_enabled boolean,p_duplicate_hours integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE before_row public.community_report_policy_v01417%ROWTYPE;after_row public.community_report_policy_v01417%ROWTYPE;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_actor AND p.account_kind='member')
 OR NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_actor AND r.role_code='OWNER'
   AND (r.expires_at IS NULL OR r.expires_at>now()))
 OR EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_actor AND r.role_code='SHOWCASE_VIEWER'
   AND (r.expires_at IS NULL OR r.expires_at>now()))
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor
   AND lower(f.status) IN ('suspended','restricted'))
 THEN RAISE EXCEPTION 'POLICY_NOT_AUTHORIZED' USING ERRCODE='42501';END IF;
 IF p_expected_version IS NULL OR p_quota_enabled IS NULL OR p_duplicate_enabled IS NULL
   OR p_quota_max NOT BETWEEN 1 AND 100 OR p_quota_hours NOT BETWEEN 1 AND 168
   OR p_duplicate_hours NOT BETWEEN 1 AND 168
 THEN RAISE EXCEPTION 'POLICY_INVALID' USING ERRCODE='22023';END IF;
 SELECT * INTO before_row FROM public.community_report_policy_v01417 WHERE policy_id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POLICY_NOT_INSTALLED' USING ERRCODE='P0002';END IF;
 IF before_row.version IS DISTINCT FROM p_expected_version
 THEN RAISE EXCEPTION 'POLICY_STALE' USING ERRCODE='40001';END IF;
 UPDATE public.community_report_policy_v01417
 SET quota_enabled=p_quota_enabled,quota_max=p_quota_max,quota_hours=p_quota_hours,
   duplicate_enabled=p_duplicate_enabled,duplicate_hours=p_duplicate_hours,
   version=before_row.version+1,updated_at=clock_timestamp(),updated_by=p_actor
 WHERE policy_id=1 RETURNING * INTO after_row;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'report.policy.update','community_policy','1',jsonb_build_object(
 'before',to_jsonb(before_row)-'updated_by','after',to_jsonb(after_row)-'updated_by'));
 RETURN to_jsonb(after_row);
END $$;
REVOKE ALL ON FUNCTION public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_owner_report_policy_save_v01417(uuid,bigint,boolean,integer,integer,boolean,integer) TO service_role;

-- Existing endpoint v014_community_report keeps EXACT signature and report target validation.
-- Advisory lock prevents concurrent bypass from multiple submissions by one user.
-- Disabling a business quota never disables mandatory abuse-protection hard ceiling.
CREATE OR REPLACE FUNCTION public.v014_community_report(
 p_actor uuid,p_type text,p_content text,p_reason text,p_details text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  pol public.community_report_policy_v01417%ROWTYPE;
  count_window integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND account_kind='member')
  OR EXISTS(SELECT 1 FROM public.admin_user_flags WHERE user_id=p_actor AND lower(status) IN ('suspended','restricted'))
  OR EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=p_actor AND role_code='SHOWCASE_VIEWER'
     AND (expires_at IS NULL OR expires_at>now()))
 THEN RAISE EXCEPTION 'REPORT_NOT_AUTHORIZED' USING ERRCODE='42501';END IF;
 IF p_type NOT IN ('topic','post')
  OR p_reason NOT IN ('spam','harassment','scam','privacy','misinformation','other')
  OR p_content IS NULL OR p_content !~ ('^(commons|legacy):'||p_type||':[0-9]{1,18}$')
  OR length(coalesce(p_details,''))>500
 THEN RAISE EXCEPTION 'REPORT_INVALID' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,142003));
 SELECT * INTO pol FROM public.community_report_policy_v01417 WHERE policy_id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'REPORT_POLICY_NOT_INSTALLED' USING ERRCODE='P0002';END IF;
 -- Non-disablable safety ceiling, separate from configurable business quota.
 SELECT count(*) INTO count_window FROM public.forum_reports
  WHERE reporter_user_id=p_actor AND created_at>now()-interval '24 hours';
 IF count_window>=500 THEN RAISE EXCEPTION 'REPORT_SAFETY_CEILING' USING ERRCODE='P0001';END IF;
 IF pol.quota_enabled THEN
  SELECT count(*) INTO count_window FROM public.forum_reports
    WHERE reporter_user_id=p_actor AND created_at>now()-make_interval(hours=>pol.quota_hours);
  IF count_window>=pol.quota_max THEN RAISE EXCEPTION 'REPORT_QUOTA_REACHED' USING ERRCODE='P0001';END IF;
 END IF;
 IF pol.duplicate_enabled AND EXISTS(SELECT 1 FROM public.forum_reports
  WHERE reporter_user_id=p_actor AND content_id=p_content
  AND created_at>now()-make_interval(hours=>pol.duplicate_hours))
 THEN RAISE EXCEPTION 'REPORT_DUPLICATE' USING ERRCODE='P0001';END IF;
 INSERT INTO public.forum_reports(reporter_user_id,content_type,content_id,reason,details,status)
 VALUES(p_actor,p_type,p_content,p_reason,p_details,'open');
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.v014_community_report(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v014_community_report(uuid,text,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
