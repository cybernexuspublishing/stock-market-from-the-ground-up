-- v0.14.0.226 | Owner-controlled sponsorship sales readiness.
-- All storefront offers are quote-only until Owner sets an approved rate and
-- a separate payment-verification process exists; NO ads or charges activated.
CREATE TABLE IF NOT EXISTS public.gu_ad_sales_settings_v014226(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 accepting_inquiries boolean NOT NULL DEFAULT true,
 accepting_payments boolean NOT NULL DEFAULT false,
 ad_delivery_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_ad_sales_settings_v014226(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_ad_packages_v014226(
 code text PRIMARY KEY CHECK(code ~ '^[A-Z0-9_]{5,48}$'),
 name text NOT NULL CHECK(length(name) BETWEEN 8 AND 120),
 description text NOT NULL CHECK(length(description) BETWEEN 24 AND 1000),
 price_cents integer CHECK(price_cents IS NULL OR price_cents > 0),
 pricing_basis text NOT NULL DEFAULT 'quote' CHECK(pricing_basis IN('quote','flat','cpm','cpc')),
 duration_days integer CHECK(duration_days IS NULL OR duration_days BETWEEN 1 AND 365),
 availability text NOT NULL DEFAULT 'quote_only' CHECK(availability IN('quote_only','paused','approved_rate','retired')),
 stripe_test_product_id text, stripe_live_product_id text,
 included_placements text[] NOT NULL DEFAULT '{}',
 public_visible boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(availability <> 'approved_rate' OR price_cents IS NOT NULL),
 CHECK(pricing_basis <> 'quote' OR price_cents IS NULL)
);
INSERT INTO public.gu_ad_packages_v014226
 (code,name,description,pricing_basis,availability,included_placements)
VALUES
 ('SITE_SPONSOR','Site Sponsorship',
 'Clearly identified sponsor inventory on Owner-approved public and eligible member pages, subject to availability, review and a separate written quote.',
 'quote','quote_only',ARRAY['HOME_INLINE','STORE_INLINE']),
 ('SECTION_SPONSOR','Section Sponsorship',
 'Clearly separated sponsored inventory within an eligible section, with a preapproved placement, duration and reporting terms.',
 'quote','quote_only',ARRAY['STORE_INLINE','COMMUNITY_INLINE','FREE_DASHBOARD']),
 ('RESOURCE_SPONSOR','Educational Resource Sponsorship',
 'Sponsor acknowledgement adjacent to educational samples, never within teaching, assessment, advice, trading controls or Tutor answers.',
 'quote','quote_only',ARRAY['SAMPLE_LABS'])
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gu_ad_inquiries_v014226 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_name text NOT NULL CHECK(length(company_name) BETWEEN 2 AND 160),
 contact_name text NOT NULL CHECK(length(contact_name) BETWEEN 2 AND 120),
 contact_email text NOT NULL CHECK(length(contact_email) BETWEEN 6 AND 250),
 website_url text CHECK(website_url IS NULL OR length(website_url) <= 500),
 package_code text NOT NULL REFERENCES public.gu_ad_packages_v014226(code),
 message text NOT NULL CHECK(length(message) BETWEEN 30 AND 2000),
 status text NOT NULL DEFAULT 'new' CHECK(status IN('new','reviewing','quoted','accepted','rejected','archived')),
 internal_notes text,
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_ad_inquiries_status_v014226
 ON public.gu_ad_inquiries_v014226(status,created_at DESC);
CREATE TABLE IF NOT EXISTS public.gu_ad_order_evidence_v014226(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id bigint NOT NULL REFERENCES public.ad_campaigns(id),
 invoice_ref text NOT NULL UNIQUE,
 provider text NOT NULL DEFAULT 'stripe' CHECK(provider IN('stripe')),
 expected_amount_cents integer NOT NULL CHECK(expected_amount_cents>0),
 paid_amount_cents integer NOT NULL CHECK(paid_amount_cents>0),
 verified_by uuid NOT NULL REFERENCES auth.users(id),
 verified_at timestamptz NOT NULL DEFAULT now(),
 payment_mode text NOT NULL CHECK(payment_mode IN('live','test')),
 state text NOT NULL CHECK(state IN('verified_paid','refunded','disputed')),
 CHECK(paid_amount_cents >= expected_amount_cents)
);
CREATE INDEX IF NOT EXISTS gu_ad_evidence_campaign_v014226
 ON public.gu_ad_order_evidence_v014226(campaign_id,verified_at DESC);
CREATE TABLE IF NOT EXISTS public.gu_ad_admin_audit_v014226(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL CHECK(length(action) BETWEEN 4 AND 100),
 resource_type text NOT NULL,
 resource_id text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS
 approval_state text NOT NULL DEFAULT 'pending'
 CHECK(approval_state IN('pending','approved','rejected','suspended'));
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS
 payment_state text NOT NULL DEFAULT 'unpaid'
 CHECK(payment_state IN('unpaid','verified_paid','refunded','disputed'));
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS
 package_code text REFERENCES public.gu_ad_packages_v014226(code);
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS last_verified_invoice text;
-- Prevent accidental early publishing even if an API attempts direct table updates.
CREATE OR REPLACE FUNCTION public.gu_ad_campaign_publishing_guard_v014226()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $guard$
BEGIN
 IF NEW.status IN('active','scheduled') THEN
  IF NEW.approval_state<>'approved' OR NEW.payment_state<>'verified_paid'
    OR NEW.amount_cents<=0 OR NEW.starts_at IS NULL OR NEW.ends_at IS NULL
    OR NEW.ends_at<=NEW.starts_at OR NEW.last_verified_invoice IS NULL
    OR NOT EXISTS(SELECT 1 FROM public.gu_ad_order_evidence_v014226 e
      WHERE e.campaign_id=NEW.id AND e.invoice_ref=NEW.last_verified_invoice
      AND e.state='verified_paid' AND e.payment_mode='live'
      AND e.paid_amount_cents>=NEW.amount_cents)
    OR NOT EXISTS(SELECT 1 FROM public.gu_ad_sales_settings_v014226
      WHERE singleton AND ad_delivery_enabled AND accepting_payments)
  THEN RAISE EXCEPTION 'AD_RELEASE_REQUIRES_OWNER_APPROVAL_VERIFIED_LIVE_PAYMENT_AND_DELIVERY_GATE'; END IF;
 END IF;
 RETURN NEW;
END $guard$;
DROP TRIGGER IF EXISTS gu_ad_campaign_publishing_guard_v014226 ON public.ad_campaigns;
CREATE TRIGGER gu_ad_campaign_publishing_guard_v014226
BEFORE INSERT OR UPDATE ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.gu_ad_campaign_publishing_guard_v014226();
-- No invoice or advertiser can enable serving on its own.
ALTER TABLE public.gu_ad_sales_settings_v014226 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_packages_v014226 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_inquiries_v014226 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_order_evidence_v014226 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_ad_admin_audit_v014226 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_ad_sales_settings_v014226, public.gu_ad_packages_v014226,
 public.gu_ad_inquiries_v014226,public.gu_ad_order_evidence_v014226,
 public.gu_ad_admin_audit_v014226 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_ad_sales_settings_v014226, public.gu_ad_packages_v014226,
 public.gu_ad_inquiries_v014226,public.gu_ad_order_evidence_v014226,
 public.gu_ad_admin_audit_v014226 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_ad_admin_audit_v014226_id_seq TO service_role;
GRANT SELECT ON public.gu_ad_packages_v014226 TO anon,authenticated;
DROP POLICY IF EXISTS gu_ad_public_packages_v014226 ON public.gu_ad_packages_v014226;
CREATE POLICY gu_ad_public_packages_v014226 ON public.gu_ad_packages_v014226
FOR SELECT TO anon,authenticated USING(public_visible AND availability IN ('quote_only','approved_rate'));
-- Update Community canonical path without modifying other site sections.
UPDATE public.ad_placements SET page_pattern='/market-commons.html'
 WHERE placement_code='COMMUNITY_INLINE' AND page_pattern='/forum.html';
