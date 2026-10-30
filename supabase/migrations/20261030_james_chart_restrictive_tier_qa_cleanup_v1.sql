-- Remove the short-lived James_Test-only QA ceiling after genuine Standard,
-- Advanced, and Professional Chromium acceptance. No membership, roles, or
-- customer workspaces were stored in this table. Production resolver no longer
-- references the table (verified Cloudflare deployment).
BEGIN;
DO $cleanup$
BEGIN
 IF to_regclass('public.crownlight_chart_tier_ceiling_qa_v1') IS NOT NULL AND
    EXISTS(SELECT 1 FROM public.crownlight_chart_tier_ceiling_qa_v1)
 THEN RAISE EXCEPTION 'Refuse QA table retirement: records remain';END IF;
END $cleanup$;
DROP TABLE IF EXISTS public.crownlight_chart_tier_ceiling_qa_v1;
COMMIT;