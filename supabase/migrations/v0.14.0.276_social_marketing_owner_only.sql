-- Source-controlled, Owner-only social marketing records.
-- No social provider API calls, purchases, automatic publishing or community joining.
-- Applies independently of the existing website Advertising/Stripe schemas.
CREATE TABLE IF NOT EXISTS public.gu_social_posts_v014276 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 platform text NOT NULL DEFAULT 'x' CHECK (platform IN ('x')),
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 280),
 status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','approved','planned','manual_recorded','archived')),
 planned_at timestamptz,
 external_url text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status <> 'planned' OR planned_at IS NOT NULL),
 CHECK (status <> 'manual_recorded' OR external_url IS NOT NULL),
 CHECK (external_url IS NULL OR external_url ~ '^https://(x\.com|twitter\.com)/SMFGUAcademy/status/[0-9]+$')
);
CREATE INDEX IF NOT EXISTS gu_social_posts_owner_status_v014276
 ON public.gu_social_posts_v014276(owner_id,status,updated_at DESC);

CREATE TABLE IF NOT EXISTS public.gu_social_communities_v014276 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 platform text NOT NULL DEFAULT 'x' CHECK (platform IN ('x')),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
 community_url text NOT NULL CHECK (community_url ~ '^https://(x\.com|twitter\.com)/i/communities/[0-9]+$'),
 membership_status text NOT NULL DEFAULT 'unknown'
  CHECK (membership_status IN ('unknown','not_joined','requested','joined','declined','left')),
 promotion_policy text NOT NULL DEFAULT 'unverified'
  CHECK (promotion_policy IN ('unverified','allowed','restricted','prohibited')),
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
 last_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (owner_id,community_url)
);
CREATE INDEX IF NOT EXISTS gu_social_communities_owner_v014276
 ON public.gu_social_communities_v014276(owner_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS public.gu_social_audit_v014276 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL,
 resource_type text NOT NULL,
 resource_id uuid NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_social_audit_actor_v014276
 ON public.gu_social_audit_v014276(actor,created_at DESC);

ALTER TABLE public.gu_social_posts_v014276 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_social_communities_v014276 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_social_audit_v014276 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_social_posts_v014276,public.gu_social_communities_v014276,
 public.gu_social_audit_v014276 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_social_posts_v014276,
 public.gu_social_communities_v014276 TO service_role;
GRANT SELECT,INSERT ON public.gu_social_audit_v014276 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_social_audit_v014276_id_seq TO service_role;

-- Transactional audit: if audit writing fails, the associated record mutation fails.
-- No draft body text, member secrets or external credentials appear in the audit.
CREATE OR REPLACE FUNCTION public.gu_social_record_audit_v014276()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 INSERT INTO public.gu_social_audit_v014276
 (actor,action,resource_type,resource_id,details)
 VALUES(
   NEW.owner_id,
   CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'updated' END,
   TG_TABLE_NAME,NEW.id,
   CASE WHEN TG_TABLE_NAME='gu_social_posts_v014276'
     THEN pg_catalog.jsonb_build_object('status',NEW.status)
     ELSE pg_catalog.jsonb_build_object('membership_status',NEW.membership_status,'promotion_policy',NEW.promotion_policy)
   END
 );
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gu_social_record_audit_v014276() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_social_record_audit_v014276() TO service_role;

DROP TRIGGER IF EXISTS gu_social_posts_audit_v014276 ON public.gu_social_posts_v014276;
CREATE TRIGGER gu_social_posts_audit_v014276
 AFTER INSERT OR UPDATE ON public.gu_social_posts_v014276
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_record_audit_v014276();
DROP TRIGGER IF EXISTS gu_social_communities_audit_v014276 ON public.gu_social_communities_v014276;
CREATE TRIGGER gu_social_communities_audit_v014276
 AFTER INSERT OR UPDATE ON public.gu_social_communities_v014276
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_record_audit_v014276();
