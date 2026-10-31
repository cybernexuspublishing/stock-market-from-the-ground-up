-- Fix Stripe hosted invoice URL domain check in the live sponsorship invoice tracking constraint.
ALTER TABLE public.ad_campaigns
 DROP CONSTRAINT IF EXISTS gu_ad_campaign_invoice_metadata_valid_v1;
ALTER TABLE public.ad_campaigns
 ADD CONSTRAINT gu_ad_campaign_invoice_metadata_valid_v1 CHECK (
  (stripe_invoice_id IS NULL OR stripe_invoice_id ~ '^in_[A-Za-z0-9_]{6,}$')
  AND (stripe_customer_id IS NULL OR stripe_customer_id ~ '^cus_[A-Za-z0-9_]{6,}$')
  AND (stripe_invoice_url IS NULL OR stripe_invoice_url ~ '^https://invoice[.]stripe[.]com/[^[:space:]]+$')
  AND (stripe_invoice_sent_at IS NULL OR stripe_invoice_id IS NOT NULL)
 );
