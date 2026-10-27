-- Ephemeral service-only QA membership identity provisioning barrier.
-- No passwords, emails, or raw tokens are stored in this control table.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE IF NOT EXISTS public.qa_membership_provision_once_20261027(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 nonce_hash text NOT NULL UNIQUE CHECK(nonce_hash ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','running','complete','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 completed_at timestamptz,
 summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.qa_membership_provision_once_20261027 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qa_membership_provision_once_20261027 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.qa_membership_provision_once_20261027 TO service_role;
COMMENT ON TABLE public.qa_membership_provision_once_20261027 IS
 'Temporary one-use QA provisioning barrier. No passwords, actual identity secrets, or outbound URLs.';
