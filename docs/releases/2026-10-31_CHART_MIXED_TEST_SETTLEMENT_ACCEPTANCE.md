# Chart Studio Mixed TEST Checkout — Implementation & Acceptance Ledger

**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-COMMERCE-CHART-MIXED-TEST-001  
**File:** docs/releases/2026-10-31_CHART_MIXED_TEST_SETTLEMENT_ACCEPTANCE.md  
**Type:** Markdown release/acceptance record  
**Version:** 1.0  
**Date:** 2026-10-31  
**Status:** TEST IMPLEMENTED; GENUINE DISCOUNTED STRIPE ACCEPTANCE PENDING  
**Repository location:** main / docs/releases  
**Owner approval:** TEST-only, $0 additional services; no LIVE commerce activation.

## Boundary and scope

Two existing one-time nonrenewing Chart Studio products only: CHART_ADVANCED_30D at $9.99 and CHART_PROFESSIONAL_30D at $19.99. Existing Stripe TEST product IDs and prices are validated before dynamic discounted sessions. No second Lumen currency; the existing non-expiring credit buckets are the settlement source. Normal membership/temporary access takes priority over any duplicate purchase.

**Controls:** CHART_STUDIO_TEST_CHECKOUT_ENABLED and separately gated CHART_MIXED_TEST_ENABLED; server-controlled, expiring noncommercial QA Auth metadata; Stripe sk_test credentials and exact TEST account ID; existing signed unified TEST webhook. Production storefront sale_ready remains false; no LIVE charges authorized.

## Implemented components

- Additive private order, debit, and signed-event tables in supabase/migrations/20261031_chart_mixed_test_settlement_v1.sql
- Atomic per-user wallet reservations, order idempotency and duplicate outstanding-order rejection using existing wallet advisory lock.
- Server-created Stripe TEST Checkout Sessions for original verified product with dynamically priced reduced cash amount. Session identity and payment intent metadata bind order/user/SKU; Stripe session is bound in the private database.
- Signed provider webhook processor functions/_lib/chart-mixed-test-webhook-v1.js, routed from functions/api/stripe-test-webhook.js; canonical Stripe session/line item/payment intent/charge reconciliation and idempotent revocation.
- Full-Lumen $0 fulfillment without Stripe payment; server-controlled zero-refund credit restoration in supabase/migrations/20261031_chart_mixed_test_zero_refunds_v1.sql.
- TEST-only customer selection and breakdown in assets/js/store-chart-cash-upgrades-v1.js.
- Server-side quote and checkout endpoints, no untrusted client price values.
- Expired/failed TEST Stripe sessions release reserved credits; explicit cancellation expires the Stripe session and relies on signed expiration event before release.
- Separate CI source gate .github/workflows/chart-mixed-test-v1.yml.

## Database acceptance evidence — rolled back

1. One-Lumen reservation on Professional: original 1,999 cents, 7-cent discount, 1,992-cent cash due, wallet reduced 29 to 28 inside transaction; rolled back.
2. Simulated provider-backed order: four Lumens, 28-cent reduction, 1,971-cent cash due; SQL bind + grant + full refund returned credits, revoked entitlement, wallet restored to 29; rolled back. This did **not** validate a signed Stripe webhook.
3. 286-Lumen fully covered Professional order with temporary QA credit bucket: zero cash due and active 30-day entitlement; rolled back.
4. Fully covered order refunded once; duplicate refund did not double-return credits; rolled back.
5. Same request ID gave the original reservation; another unresolved order was rejected; expiry returned credits; rolled back.
6. Anonymous and ordinary authenticated roles lacked private order-read and SQL settlement execution permissions.
7. After tests, James_Test balance was 29 non-expiring Lumens, zero retained mixed orders/events, zero active cash purchases and one saved Chart Studio workspace.

## Outstanding acceptance

- Source CI job results and exact-commit deployment confirmation after activation.
- Authenticated James_Test browser quote/checkout in actual TEST session and Stripe-signed payment event.
- Verified discounted Stripe TEST amount, committed Lumen debit and active 30-day entitlement.
- Real provider refund and dispute reconciliation with exact Lumen restoration and revocation.
- Real session cancellation and expiration webhook release.
- Browser cross-account rejection, workspace continuity and expected downgrade.
- Any other eligible product class, LIVE checkout, general-purpose subscriptions, and recurring credit policy are excluded from this release.

**Final classification:** IMPLEMENTED IN TEST / GENUINE SIGNED MIXED-PAYMENT ACCEPTANCE NOT YET VERIFIED. Do not mark public sale ready.
