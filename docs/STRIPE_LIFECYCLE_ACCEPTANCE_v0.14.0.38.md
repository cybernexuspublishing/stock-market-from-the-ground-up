# Stripe Managed Payments — Staging Lifecycle Acceptance and Open Risks

| Document control | Value |
| --- | --- |
| Company / project | Cyber Nexus / The Stock Market: From the Ground Up |
| Filename | `STRIPE_LIFECYCLE_ACCEPTANCE_v0.14.0.38.md` |
| Type / ID | Markdown / `GU-WEB-STRIPE-LIFECYCLE-20261016` |
| Version / status | v0.14.0.38 / STAGING CANDIDATE, production release blocked |
| Date | 2026-10-16 |
| GitHub | `cybernexuspublishing/stock-market-from-the-ground-up/docs/` |
| Google Drive | Location and document ID not assigned |
| Purpose | Technical integration design, dependencies, tested scope, and outstanding acceptance gates |

## Product scope

Eight Owner-observed Stripe Product IDs (`prod_`) are preserved in `data/stripe-product-registry-v01437.json` and administrative reporting. The eight actual Price IDs (`price_`) are **not known**; no checkout can work until the real IDs are configured. Website server queries the authoritative Supabase price and validates the Stripe API price, product, currency, billing period, active/test status. This avoids client-controlled price manipulation. Failed match aborts before session creation.

V1 approved plans: Full Monthly $69.99/month; Full Annual $699/year; Lifetime $2,499 one-time; Historical Replay $19.99/month; Interactive Learning, Journal Analytics, Simulator and Market Tutor $29.99/month each. These are the approved published list prices; product suitability and Stripe Managed Payments acceptance are not yet confirmed. The observed annual training tax code differs from monthly; refer the correct product classifications to Stripe/tax counsel before activation.

## Security design

1. Customer may initiate a checkout ONLY from an authenticated eligible account, using server-side catalogue and Owner-controlled switches. Restricted, suspended and Showcase accounts are rejected. Already-active duplicate subscriptions and duplicate Lifetime purchases are blocked in the initial checkout check.
2. A dedicated staging environment is mandatory; the Preview build must use the staging Supabase Auth URL and publishable key as well as the Worker. `scripts/build-pages.sh` enforces this for a marked non-main preview build; the known production Supabase project is explicitly excluded. Stripe test credentials and dedicated staging URL/ref must match. Enable flags default off when absent.
3. Stripe Checkout session is created by Cloudflare Functions. The bound member, SKU, Price ID, amount, session ID, and provider subscription/payment intent IDs are stored as internal intent records; raw client metadata never grants access.
4. Customer webhook verifies Stripe's `Stripe-Signature` HMAC on raw bytes with a 300-second time tolerance, then re-fetches Checkout, subscription, invoice, charge, and refund evidence from Stripe. Signature or price/session mismatch fails closed. One-time signatures must never be validated twice by separate token consumers.
5. A `service_role`-only PostgreSQL RPC operates transactionally on billing records, idempotently keyed by Stripe event ID and locked by checkout identity. Client and anonymous execution rights are revoked. User grants are restricted to the specific Stripe purchase, so refunds cannot remove independent admin/previous grants.
6. Active paid subscriptions update `site_subscriptions` or `user_tool_passes`; cancellation and payment failure change only the provider-bound rows. `current_period_end` is used in downstream access checks. New Lifetime purchases create a provider-bound `user_plan_grants` record. Existing lifetime grants are not overwritten.
7. Full refund/dispute of the current paid subscription invoice pauses its provider-owned access. The refunded invoice cannot reactivate access until a newer paid invoice is verified. A refund of an older invoice after a newer paid term requires manual handling; we do not automatically revoke the newer paid period. Partial refunds require manual review. Full Lifetime refunds/disputes revoke only the grant created by that specific payment. Negative terminal states cannot be used to re-grant via replay.
8. The system does not create digital eBook entitlements or expose private Storage files from these Stripe subscription events. Lifetime books remain controlled by the existing rights-attested/KDP Select download function.

## Turnstile correction

The source `assets/js/turnstile-auth.js` now has one global boot latch, one managed `#v135-turnstile` container and one Supabase token consumption. `assets/js/site.js` injects the adapter only once. The previous forced MFA enrollment redirect in `assets/js/signin.js` has been removed. The code does not disable Cloudflare/Supabase server verification. If a **second independently injected Cloudflare widget** exists outside the tracked form, it must be removed from its other integration/Cloudflare configuration after live DOM inspection; the application cannot safely guess which external challenge to discard.

## P0 release acceptance — not yet verified

- Stripe API acceptance of `managed_payments[enabled]` for all eight product types and exact product tax classification.
- Valid `price_` mapping for all eight products, with actual mode, currency, billing interval and amount checks.
- Staging migration review and postflight on a **separate Supabase project**, followed by authenticated customer test payments (one-time and recurring) and actual webhook propagation; no fake service keys.
- Receipt-level reconciliation of first payment, renewals, failed charge, cancellation-at-period-end, immediate cancellation, expiration, duplicate webhook, out-of-order delivery, full and partial refunds, dispute, retry and downtime recovery.
- Refund and chargeback case-management workflow for older-invoice adjustments; manual tools must not bypass least privilege.
- Customer self-service cancellation/billing portal, subscription receipts, accessible failures, payment privacy, and applicable refund/tax/customer disclosure review.
- Verify Turnstile has exactly one challenge on the **actual deployed page**, for email sign-in, username sign-in, registration and password recovery, including browser caching and Cloudflare transformations. Cloudflare/Supabase must validate the token server-side.
- Full Admin, Market Commons, book access, learning tools, membership switching, replay/simulator and accessibility regression; restore and test database backups and rollback.
- Production fulfillment code, environment isolation, merchant approval, funding and legal review. These are NOT declared completed by the test-only staging implementation.

## Test evidence scope

Local source syntax, single-CAPTCHA browser simulation, and mocked Stripe session/webhook workflows cover active/past-due/canceled subscription, current-invoice full refund, Lifetime charge and Lifetime full refund. They do **not** prove the real Supabase SQL compiles, provider accepts Managed Payments, or live payout/fulfillment works. GitHub Actions and Cloudflare deployment need separate validation after source upload.

## Revision History

| Revision | Date | Change |
| --- | --- | --- |
| v0.14.0.38 | 2026-10-16 | Single auth Turnstile, remove forced MFA redirect, Stripe staging-only checkout/fulfillment candidate, preserve previous pricing, rights and Admin navigation. |
