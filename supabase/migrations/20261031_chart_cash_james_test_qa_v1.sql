-- Short-lived TEST-only checkout authorization. No membership or Auth metadata edits.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crownlight_chart_cash_qa_allow_v1 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK (purpose='CHART_CASH_TEST_ONLY'),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_at <= timestamptz '2026-11-02 00:00:00+00')
);
ALTER TABLE public.crownlight_chart_cash_qa_allow_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_cash_qa_allow_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.crownlight_chart_cash_qa_allow_v1 TO service_role;
INSERT INTO public.crownlight_chart_cash_qa_allow_v1(user_id,purpose,expires_at)
SELECT u.id,'CHART_CASH_TEST_ONLY',timestamptz '2026-11-02 00:00:00+00'
FROM auth.users u JOIN public.profiles p ON p.id=u.id
WHERE p.username='James_Test' AND u.email='adissel89@gmail.com'
AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
 expires_at=LEAST(EXCLUDED.expires_at,public.crownlight_chart_cash_qa_allow_v1.expires_at);
COMMIT;
