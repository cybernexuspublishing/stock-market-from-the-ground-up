-- Shared product-access configuration, additive and inactive by default.
-- Owner editable via Cloudflare server authorization; never a payment or grant mechanism.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_product_access_config_v1 (
 product_code text PRIMARY KEY CHECK (product_code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
 label text NOT NULL CHECK (length(label) BETWEEN 2 AND 160),
 free_access boolean NOT NULL DEFAULT false,
 trial_access boolean NOT NULL DEFAULT false,
 paid_access boolean NOT NULL DEFAULT false,
 included_memberships text[] NOT NULL DEFAULT '{}',
 purchase_durations integer[] NOT NULL DEFAULT '{}',
 access_expiration_policy text NOT NULL DEFAULT 'fixed_term'
   CHECK (access_expiration_policy IN ('fixed_term','membership_bound','non_expiring','session_only')),
 policy_mode text NOT NULL DEFAULT 'legacy' CHECK (policy_mode IN ('legacy','configured')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_by uuid NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gu_product_access_durations_v1 CHECK (purchase_durations <@ ARRAY[1,7,14,30,180]::integer[]),
 CONSTRAINT gu_product_access_membership_length_v1 CHECK (cardinality(included_memberships) <= 20)
);
CREATE TABLE IF NOT EXISTS public.gu_product_access_audit_v1 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_code text NOT NULL,
 editor_id uuid NULL,
 previous_value jsonb NOT NULL,
 new_value jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_product_access_config_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_product_access_audit_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_product_access_config_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.gu_product_access_audit_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_product_access_config_v1 TO service_role;
GRANT SELECT,INSERT ON public.gu_product_access_audit_v1 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_product_access_audit_v1_id_seq TO service_role;
CREATE OR REPLACE FUNCTION public.gu_product_access_audit_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $body$
BEGIN
 INSERT INTO public.gu_product_access_audit_v1(product_code,editor_id,previous_value,new_value)
 VALUES (NEW.product_code,NEW.updated_by,to_jsonb(OLD),to_jsonb(NEW));
 RETURN NEW;
END
$body$;
REVOKE ALL ON FUNCTION public.gu_product_access_audit_trigger_v1() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS gu_product_access_revision_audit_v1 ON public.gu_product_access_config_v1;
CREATE TRIGGER gu_product_access_revision_audit_v1 AFTER UPDATE ON public.gu_product_access_config_v1
FOR EACH ROW WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.gu_product_access_audit_trigger_v1();
INSERT INTO public.gu_product_access_config_v1
(product_code,label,free_access,paid_access,included_memberships)
SELECT tool_code,name,coalesce(free_preview,false),coalesce(individual_price_cents,0)>0,
 ARRAY_REMOVE(ARRAY[
 CASE WHEN included_full THEN 'FULL_MONTHLY'::text END,
 CASE WHEN included_full THEN 'FULL_ANNUAL'::text END,
 CASE WHEN included_lifetime THEN 'LIFETIME'::text END
 ], NULL)
FROM public.platform_tools
ON CONFLICT(product_code) DO NOTHING;
INSERT INTO public.gu_product_access_config_v1(product_code,label,free_access)
VALUES
 ('FREE_RESEARCH_WATCHLIST','Free Research Watchlist',true),
 ('MARKET_SIMULATOR','Market Simulator',true),
 ('ONDEMAND_TRAINING','Historical Replay Training',false),
 ('INTERACTIVE_LEARNING','Interactive Learning',true),
 ('MARKET_TUTOR','Market Tutor',true),
 ('JOURNAL_ANALYTICS','Journal Analytics',false),
 ('CROWNLIGHT_STUDIO_STANDARD','Crownlight Studio Standard',false),
 ('CROWNLIGHT_STUDIO_ADVANCED','Crownlight Studio Advanced',false),
 ('CROWNLIGHT_STUDIO_PROFESSIONAL','Crownlight Studio Professional',false)
ON CONFLICT(product_code) DO NOTHING;
COMMIT;