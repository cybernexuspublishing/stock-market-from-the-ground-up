-- v0.14.0.279 — Manual social account registry (no OAuth credentials, no provider calls).
CREATE TABLE IF NOT EXISTS public.gu_social_accounts_v014279 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 provider text NOT NULL CHECK(provider IN('x','facebook','instagram','linkedin','youtube','reddit','discord')),
 handle text NOT NULL CHECK(length(btrim(handle)) BETWEEN 2 AND 120),
 profile_url text NOT NULL CHECK(length(profile_url)<=1000 AND profile_url ~ '^https://[^[:space:]]+$'),
 connection_status text NOT NULL DEFAULT 'manual_only' CHECK(connection_status IN('manual_only','not_connected')),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,provider,handle)
);
CREATE INDEX IF NOT EXISTS gu_social_accounts_owner_v014279
 ON public.gu_social_accounts_v014279(owner_id,provider,updated_at DESC);
ALTER TABLE public.gu_social_accounts_v014279 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_social_accounts_v014279 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_social_accounts_v014279 TO service_role;

-- The existing transaction audit ledger is required on every registry write.
CREATE TRIGGER gu_social_account_audit_v014279
 AFTER INSERT OR UPDATE ON public.gu_social_accounts_v014279
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_operations_audit_v014278();
