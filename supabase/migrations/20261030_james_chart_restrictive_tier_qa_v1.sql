-- Crownlight Chart Studio James_Test-only, noncommercial, *restrictive*
-- short-lived QA ceiling. This never creates or elevates any membership,
-- Sparks pass, staff role, charge, or Market Simulator data entitlement.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crownlight_chart_tier_ceiling_qa_v1 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 tier text NOT NULL CHECK(tier IN ('STANDARD','ADVANCED','PROFESSIONAL')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '15 minutes'),
 CONSTRAINT james_only_chart_tier_ceiling CHECK (
 user_id='f42f9301-18e6-43a3-8531-32d371fd22c1'::uuid
 )
);
ALTER TABLE public.crownlight_chart_tier_ceiling_qa_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_tier_ceiling_qa_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.crownlight_chart_tier_ceiling_qa_v1 TO service_role;
CREATE INDEX IF NOT EXISTS crownlight_chart_tier_ceiling_qa_expiry_v1
 ON public.crownlight_chart_tier_ceiling_qa_v1(expires_at);
COMMIT;