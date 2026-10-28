-- Crownlight Chart Studio persisted workspace v2. Encrypted channel via member-scoped Cloudflare API.
-- Do not expose rows to browser Data API, anon or authenticated roles. No launch/payment changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crownlight_chart_workspaces_v1 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT crownlight_chart_workspace_settings_limited CHECK (
   jsonb_typeof(settings)='object' AND octet_length(settings::text)<=16000
 )
);
ALTER TABLE public.crownlight_chart_workspaces_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_workspaces_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.crownlight_chart_workspaces_v1 TO service_role;
COMMENT ON TABLE public.crownlight_chart_workspaces_v1 IS
 'Private Chart Studio appearance, indicator and drawing settings only, no price history, credentials, grading or market-data cache.';
COMMIT;