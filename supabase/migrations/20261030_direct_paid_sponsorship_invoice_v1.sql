-- SMFGU ADS V1: Owner-authorized Stripe LIVE invoice issuance for a fixed negotiated sponsorship.
-- No automatic invoice creation, payment, advertiser entitlement, or campaign publication.
-- Existing owner, verified-payment, signed delivery, and RLS requirements stay controlling.
ALTER TABLE public.ad_campaigns
 ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
 ADD COLUMN IF NOT EXISTS stripe_invoice_url text,
 ADD COLUMN IF NOT EXISTS stripe_invoice_sent_at timestamptz,
 ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS gu_ad_campaign_stripe_invoice_unique_v1
 ON public.ad_campaigns(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
  WHERE conname='gu_ad_campaign_invoice_metadata_valid_v1' AND conrelid='public.ad_campaigns'::regclass)
 THEN
  ALTER TABLE public.ad_campaigns ADD CONSTRAINT gu_ad_campaign_invoice_metadata_valid_v1 CHECK (
   (stripe_invoice_id IS NULL OR stripe_invoice_id ~ '^in_[A-Za-z0-9_]{6,}$')
   AND (stripe_customer_id IS NULL OR stripe_customer_id ~ '^cus_[A-Za-z0-9_]{6,}$')
   AND (stripe_invoice_url IS NULL OR stripe_invoice_url ~ '^https://invoice[.]stripe[.]com/[^[:space:]]+)
   AND (stripe_invoice_sent_at IS NULL OR stripe_invoice_id IS NOT NULL)
  );
 END IF;
END $$;
)
   AND (stripe_invoice_sent_at IS NULL OR stripe_invoice_id IS NOT NULL)
  );
 END IF;
END $$;
