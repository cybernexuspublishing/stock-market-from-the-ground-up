-- Crownlight Chart Studio sequential QA — 2026-10-28.
-- Scope: only member chart engine access. No membership, commerce, or Lab grants.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crownlight_chart_qa_grants_v1 (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('ADVANCED','PROFESSIONAL')),
  scope text NOT NULL DEFAULT 'CHART_STUDIO_ONLY'
    CHECK (scope='CHART_STUDIO_ONLY'),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  revoked_at timestamptz,
  reason text NOT NULL DEFAULT 'Sequential noncommercial chart testing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crownlight_qa_term CHECK (ends_at > starts_at AND
    ends_at <= starts_at + interval '14 days')
);
ALTER TABLE public.crownlight_chart_qa_grants_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_qa_grants_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.crownlight_chart_qa_grants_v1 TO service_role;
DO $$
DECLARE target uuid;
BEGIN
  SELECT p.id INTO target
  FROM public.profiles p INNER JOIN auth.users u ON u.id=p.id
  WHERE p.username='James_Test'
    AND p.account_kind='member' AND p.deleted_at IS NULL
    AND p.email_verified=true AND u.email_confirmed_at IS NOT NULL
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_user_flags f
      WHERE f.user_id=p.id AND lower(f.status) IN ('suspended','restricted')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_user_roles r
      WHERE r.user_id=p.id AND r.role_code='SHOWCASE_VIEWER'
        AND (r.expires_at IS NULL OR r.expires_at>now())
    );
  IF target IS NULL THEN RAISE EXCEPTION 'James_Test is not eligible for chart-only QA'; END IF;
  INSERT INTO public.crownlight_chart_qa_grants_v1
    (user_id,tier,scope,starts_at,ends_at,reason)
  VALUES
    (target,'ADVANCED','CHART_STUDIO_ONLY',now(),now()+interval '7 days',
     'Sequential Chart Studio testing: Standard owner-tested; Advanced in progress')
  ON CONFLICT(user_id) DO NOTHING;
  IF NOT EXISTS(
    SELECT 1 FROM public.crownlight_chart_qa_grants_v1
    WHERE user_id=target AND tier='ADVANCED' AND scope='CHART_STUDIO_ONLY'
      AND revoked_at IS NULL AND starts_at<=now() AND ends_at>now()
  ) THEN RAISE EXCEPTION 'Chart-only Advanced QA grant was not established'; END IF;
END $$;
COMMIT;
