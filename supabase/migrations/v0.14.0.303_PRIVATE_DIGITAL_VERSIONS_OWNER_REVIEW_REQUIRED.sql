-- Owner review required. Creates a private, append-only digital edition history;
-- makes no purchase, entitlement, media upload or active-store change.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_digital_versions_v014303 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_code text NOT NULL REFERENCES public.catalog_products(product_code),
 format text NOT NULL CHECK(format IN ('pdf','epub')),
 version integer NOT NULL CHECK(version>0),
 asset_path text NOT NULL UNIQUE CHECK(asset_path ~ '^[A-Z0-9_]{3,90}/[a-f0-9-]{36}[.](pdf|epub)$'),
 bytes bigint CHECK(bytes>0 AND bytes<=52428800),
 current boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 replaced_at timestamptz,
 UNIQUE(product_code,format,version),
 CONSTRAINT gu303_current_state CHECK(current=(replaced_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS gu303_current_format
 ON public.gu_digital_versions_v014303(product_code,format) WHERE current;
ALTER TABLE public.gu_digital_versions_v014303 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_digital_versions_v014303 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_digital_versions_v014303 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_digital_versions_v014303_id_seq TO service_role;
COMMIT;
