-- Cyber Nexus | The Stock Market: From the Ground Up
-- v0.14.0.59 | REVIEW ONLY — Stripe member/product fulfillment eligibility
-- File: supabase/admin/v0.14.0.59_LIVE_EIGHT_SKU_READ_ONLY_AUDIT.sql
-- Document ID: GU-WEB-PAY-CATALOG-AUDIT-014059-20261018
-- Database: Supabase Production | Status: READ ONLY / NO ENTITLEMENT CHANGES
-- The reference prices are from the verified GU39 TEST catalog, NOT certified
-- LIVE prices. Different owner-approved LIVE prices require separate confirmation.
-- No user IDs, credentials, payment IDs, order data or customer records returned.
BEGIN TRANSACTION READ ONLY;

WITH reference_skus(kind, sku_code, reference_test_cents, expected_billing) AS (
 VALUES
  ('plan','FULL_MONTHLY',6999,'month'),
  ('plan','FULL_ANNUAL',69900,'year'),
  ('plan','LIFETIME',249900,'lifetime'),
  ('plan','ONDEMAND_MONTHLY',1999,'month'),
  ('tool','INTERACTIVE_LEARNING',2999,'month'),
  ('tool','JOURNAL_ANALYTICS',2999,'month'),
  ('tool','MARKET_SIMULATOR',2999,'month'),
  ('tool','MARKET_TUTOR',2999,'month')
), values_from_database AS (
 SELECT e.kind,e.sku_code,e.reference_test_cents,e.expected_billing,
        CASE WHEN e.kind='plan' THEN p.plan_code ELSE t.tool_code END AS record_code,
        CASE WHEN e.kind='plan' THEN p.price_cents ELSE t.individual_price_cents END AS database_price_cents,
        CASE WHEN e.kind='plan' THEN p.billing_interval ELSE 'month' END AS database_billing,
        CASE WHEN e.kind='plan' THEN p.currency ELSE 'USD' END AS database_currency,
        CASE WHEN e.kind='plan' THEN p.active ELSE t.active END AS active,
        CASE WHEN e.kind='plan' THEN p.public_visible ELSE t.public_visible END AS public_visible,
        CASE WHEN e.kind='plan' THEN p.checkout_enabled ELSE (t.status='live') END AS checkout_eligible,
        t.status AS tool_release_status
 FROM reference_skus e
 LEFT JOIN public.platform_plans p ON e.kind='plan' AND p.plan_code=e.sku_code
 LEFT JOIN public.platform_tools t ON e.kind='tool' AND t.tool_code=e.sku_code
)
SELECT kind,sku_code,
       CASE
        WHEN record_code IS NULL THEN 'BLOCKER_MISSING_CANONICAL_PRODUCT'
        WHEN database_price_cents IS NULL OR database_price_cents<=0 THEN 'BLOCKER_INVALID_PRICE'
        WHEN database_billing IS DISTINCT FROM expected_billing THEN 'BLOCKER_BILLING_MISMATCH'
        WHEN upper(coalesce(database_currency,''))<>'USD' THEN 'BLOCKER_CURRENCY_MISMATCH'
        ELSE 'CATALOG_CONTRACT_VALID'
       END AS structural_status,
       CASE
        WHEN record_code IS NULL THEN 'UNAVAILABLE'
        WHEN active IS DISTINCT FROM true THEN 'LOCKED_INACTIVE'
        WHEN public_visible IS DISTINCT FROM true THEN 'LOCKED_NOT_PUBLIC'
        WHEN checkout_eligible IS DISTINCT FROM true THEN 'LOCKED_CHECKOUT_OR_RELEASE_STATUS'
        ELSE 'SKU_ELIGIBLE_ONLY__LIVE_GLOBAL_GATE_STILL_REQUIRED'
       END AS offer_state,
       database_price_cents,
       reference_test_cents,
       CASE WHEN database_price_cents IS NULL THEN 'NOT_APPLICABLE'
        WHEN database_price_cents=reference_test_cents THEN 'MATCHES_TEST_REFERENCE_NOT_LIVE_APPROVAL'
        ELSE 'DIFFERS_FROM_TEST_REFERENCE__OWNER_PRICE_REVIEW'
       END AS price_reference_comparison,
       database_billing,expected_billing,tool_release_status
FROM values_from_database
ORDER BY CASE kind WHEN 'plan' THEN 0 ELSE 1 END,sku_code;

ROLLBACK;
