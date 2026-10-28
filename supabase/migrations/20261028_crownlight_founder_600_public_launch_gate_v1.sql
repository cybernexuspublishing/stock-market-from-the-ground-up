-- Crownlight chart tiers / Founding 600 release lifecycle V1.
-- Public launch is deliberately OFF. No checkout, money, or member grants change.
BEGIN;
ALTER TABLE public.gu_founder_release_v014173
 ADD COLUMN IF NOT EXISTS public_launch_open boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.gu_founder_release_v014173.public_launch_open IS
 'Owner-controlled general admission phase. Stops new founder marketing and enrollment when true; does not revoke earned founder benefits or start LIVE payments.';
COMMIT;