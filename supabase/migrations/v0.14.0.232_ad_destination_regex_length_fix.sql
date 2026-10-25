-- v0.14.0.232: PostgreSQL regex quantified repetition range >255 is invalid.
-- Replace the ad destination constraint with a separate length bound.
ALTER TABLE public.ad_creatives DROP CONSTRAINT IF EXISTS gu_ad_https_destination_v014227;
ALTER TABLE public.ad_creatives ADD CONSTRAINT gu_ad_https_destination_v014232
 CHECK(length(destination_url) BETWEEN 12 AND 1000 AND
 destination_url ~* '^https://[A-Za-z0-9][^[:space:]<>"'']+$');
