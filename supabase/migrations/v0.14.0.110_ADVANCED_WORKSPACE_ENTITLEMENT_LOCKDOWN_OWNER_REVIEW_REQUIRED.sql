-- v0.14.0.110 | Existing Supabase project. Owner review before execution.
-- Closes confirmed premium workspace authorization bypass: the historical
-- "manage own tool workspaces" policy checked user ID only, NOT tool entitlement.
-- The existing member tool catalog and user_has_tool_access remain unchanged.
-- This is NOT a new database, a new paid product or a blanket Lab approval.
BEGIN;
ALTER TABLE public.tool_workspace_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manage own tool workspaces" ON public.tool_workspace_records;
-- No replacement exposed-client policies: all workspaces now pass through
-- /api/advanced-tool-workspace-v014110 with an authenticated bearer token,
-- live membership check and owner-derived user ID on EVERY operation.
-- Revoke the old authenticated direct REST bypass (including sequence INSERT).
REVOKE ALL ON TABLE public.tool_workspace_records FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.tool_workspace_records TO service_role;
REVOKE ALL ON SEQUENCE public.tool_workspace_records_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.tool_workspace_records_id_seq TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Acceptance: anon/authenticated can no longer SELECT, INSERT, UPDATE or
-- DELETE tool_workspace_records directly. API enforces the current active
-- catalog, eligible member account, valid paid pass/Full grant or independently
-- enabled Free Preview, PLUS user+tool scope, with no browser-selected user_id.
-- This migration deliberately does not change other Journal/Lab tables.
