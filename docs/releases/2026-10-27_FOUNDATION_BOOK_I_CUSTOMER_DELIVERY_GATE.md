# Foundations Book I — Customer-Delivery Release Gate
Date: October 27, 2026 | Product: FOUNDATION_BOOK_1
Status: NOT YET ACCEPTED FOR CUSTOMER DELIVERY; LIVE SALES OFF

## Verified production evidence
- Private EPUB current v2 (4,393,701 bytes) and archived v1 present in Supabase Storage and edition registry.
- Owner downloaded and opened EPUB v2; signed-preview audit entry October 27 2026 07:54:06 UTC, 60-second link, no customer access change.
- Production read-only authenticated Free QA database simulation denied generic and EPUB format downloads. Not an authenticated HTTP/browser test.
- Digital website list price 1099 cents; checkout variant missing.
- Book remains coming_soon; direct digital sales and website checkout disabled.
- No digital publishing-control record, primary customer-delivery file, rights attestation, or customer download enablement.
- Zero site_orders and site_order_items at inspection.

## Outstanding customer-delivery release gates
1. Owner independently verifies actual KDP Select enrollment/exclusivity expiry in Amazon KDP. The database KDP flag is not proof. Official source: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7
2. Owner selects current EPUB v2 as primary delivery in Book Edit and saves through authenticated, password-step-up publishing controls. Keep sales/downloads OFF until actual distribution rights are attested. Do not bypass the guarded publishing procedure with SQL.
3. Configure and TEST-verify an actual digital checkout variant and provider Price ID, without inventing a provider mapping or enabling LIVE transactions.
4. Acceptance with authenticated noncharging test data: signed paid order and digital item; My Books; 60-second signed file; Free/anon/cross-account denial; refund/chargeback revocation; replay/idempotency; stale/restricted account; missing file; KDP exclusivity denial.
5. Verify consumer disclosures, refund and tax handling, and separately approve LIVE activation after genuine fulfillment acceptance.

Preserve both EPUB versions, private Storage, and existing customer-access and payment safety switches. No LIVE charges or production entitlement grants are authorized by this release-gate record.
Source: production read-only Supabase queries, Owner-confirmed EPUB opening, and GitHub download-service contracts.