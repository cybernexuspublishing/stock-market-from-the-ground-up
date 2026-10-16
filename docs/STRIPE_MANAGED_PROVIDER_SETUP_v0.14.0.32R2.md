# Stripe Managed Payments — Provider Onboarding and Technical Control Plan

| Document control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Publisher / company | Crown & Lantern Press / Cyber Nexus |
| Document ID | GU-WEB-PAYMENTS-20261015-R2 |
| Filename | `STRIPE_MANAGED_PROVIDER_SETUP_v0.14.0.32R2.md` |
| File type | Markdown |
| Version | v0.14.0.32-R2, revision 1 |
| Status | **STAGING / INTEGRATION READINESS ONLY**. No live digital payment entitlement creation. |
| Date | 2026-10-15 |
| Google Drive | No location / Google Drive document ID has been provided; GitHub `docs/` controls until an approved location exists. |
| Dependencies | R1 security/Turnstile changes; Supabase R2 migration; Stripe Managed Payments approval, Sandbox; KDP title rights; provider APIs/webhooks; provider eligibility/taxes and legal review. |
| Purpose | Prepare managed-payments transition without making unverified purchases possible. |

## Architecture decision

**Preferred digital Merchant of Record:** Stripe Managed Payments, for eligible website memberships/subscriptions, digital tools and legally distributable eBooks, subject to Stripe approval. Stripe Managed Payments uses Stripe Checkout with the documented `managed_payments[enabled]=true` parameter in a Checkout Session and supports digital subscriptions and one-off content. See https://stripe.com/managed-payments .

**Digital fallback:** Lemon Squeezy is retained in source but can be independently selected; no account or API credentials are assumed to exist. It is NOT used for physical goods.

**Signed print:** Standard Stripe Payments (not Managed Payments) for printed editions signed by the author, under the existing v0.14.0.31 system with separate OFF switches. **Lulu Direct:** optional print-on-demand channel. Printed copies are not automatically included in the ebook entitlement ledger.

**Owner control:** R2 adds one audited OWNER-selected route (`STRIPE_MANAGED` or `LEMON_SQUEEZY`) for digital orders, default `STRIPE_MANAGED` but **DISABLED**. Any change requires valid OWNER role and the already-approved R1 *recent password confirmation*; ordinary ADMIN may view operational status but cannot change provider or bypass the step-up. The R2 migration adds a trigger denying new legacy Lemon Squeezy checkout intents if the selected route is not enabled for Lemon. Old paid orders, renewals, chargebacks, entitlement revocations and refunds are unaffected by that insert guard.

**Security limit:** R2 does not create verified Stripe Managed digital membership/book entitlements. The only Managed checkout allowed by the included code is a **OWNER-only TEST-MODE checkout** using a `sk_test_` key, explicit environment gate, price validation and isolated non-entitling test ledger. A signed Stripe test webhook may be received and logged, but NEVER grants membership or book downloads. Live customer Managed Payments checkout remains **NOT IMPLEMENTED and BLOCKED**. Do not publish a purchase CTA or promise digital delivery until a separately reviewed atomic webhook/order-entitlement implementation is accepted.

## Owner steps while creating the account

1. Continue the **Stripe Managed Payments** account onboarding in the official Stripe Dashboard. Provide actual legal merchant and payout identity. Confirm the account is eligible to sell your *specific* digital products. An onboarding recommendation does not certify the business is approved.
2. Confirm Stripe Managed Payments is enabled for the account, what markets/products are supported, the merchant-of-record legal arrangement, subscription support, refund/customer support behavior, recurring Billing fees, and consumer/financial education product restrictions. This platform teaches stock trading but should not represent personalized investment advice unless independently reviewed.
3. Open **Stripe Sandbox**. Create a distinct test Product/Price for each eligible membership or digital product. Confirm price currency (USD), amount in cents and recurring intervals. No real book downloads if Kindle eBook rights remain under KDP Select.
4. Create a Stripe restricted/secret *test* key and webhook signing secret through Stripe. Set only via **Cloudflare Pages → Settings → Variables and Secrets**. DO NOT share private credentials in GitHub, Google Drive, screenshots or this chat. The public publishable key belongs client side only if a specific component requires it.
5. Secure Cloudflare server secrets (R2 sandbox only):
   - `STRIPE_MANAGED_SECRET_KEY`: `sk_test_...` (test only; never add a live key to this R2 integration)
   - `STRIPE_MANAGED_WEBHOOK_SECRET`: `whsec_...`
   - `STRIPE_MANAGED_TEST_CHECKOUT_ENABLED=false` initially; `true` ONLY in reviewed staging
   - `STRIPE_MANAGED_PRICE_MAP_JSON`: private JSON mapping such as `{"plan:FULL_MONTHLY":"price_..."}` using REAL test IDs.
   - Existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `PUBLIC_SITE_URL`.
   - `ENABLE_PAID_CHECKOUT=false`, `ENABLE_SIGNED_BOOK_STRIPE=false` until full provider tests and tax/legal review.
6. Configure Stripe test events at `https://stock-market-from-the-ground-up.pages.dev/api/stripe-managed-webhook-v01432r2` **only for staging/test**, or the staging custom domain. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`. The receipt handler accepts only signed sandbox events; no customer entitlements are created.
7. Staging: run R1 migration prerequisite preflight, R1 reviewed migration, and R1 postflight first. Then use `v0.14.0.32R2_PAYMENTS_PREFLIGHT_READ_ONLY.sql`, review/apply R2 candidate in staging, then `v0.14.0.32R2_PAYMENTS_POSTFLIGHT_READ_ONLY.sql`. Use a disposable staging project whenever feasible. **Never auto-run R1 or R2 in Cloudflare builds**.
8. Log in to Admin → Commerce. New **Digital Payments** controls should show the preferred provider and readiness booleans without revealing secrets, card details or merchant credentials. A missing R2 table disables checkout. A successful configuration check is NOT a verified payment.
9. Use only sandbox/test credit card details from the official Stripe docs. For each SKU validate server-side price against Stripe `Prices` API, run a test checkout with an OWNER account, receive a signed test webhook, confirm one test receipt and that **zero** real member entitlements/downloads were granted. Verify replay, signature forgery, mismatched amount/interval, stale Owner settings, member/Showcase denial and refund scenarios.
10. **Production launch is another controlled release** after verifying Stripe Managed sales and recurring subscription webhooks, deterministic idempotent paid-order ledger, chargebacks/refunds, current plan/entitlement revocations, per-book KDP exclusivity, customer messaging and settlement reconciliation. Until then *do not enable live managed payments*, even if Stripe approves the account.

## Known unresolved concerns

- Legacy Lemon Squeezy checkout endpoints were not rewritten. The R2 DB trigger is the authoritative insert-level gate; it denies **new** Lemon digital intents unless the site route is explicitly selected and enabled for Lemon. If R2 migration is not installed and the legacy global checkout switches are enabled, those older APIs may still operate. **Keep all global checkout switches OFF until R2 is verified**.
- Prices mapped to Stripe must match website list prices and cadence; the sandbox validates price data against Stripe. A future production implementation must also bind provider-reported price, customer identity and resulting entitlement in a single idempotent server-controlled operation.
- R2's UI includes routing preferences, not an assertion that Managed Payments is ready for customer checkout. All provider route changes are audited. Test-only Stripe data is kept in separate locked Supabase tables.
- Stripe Managed Payments is a digital-eligible merchant-of-record product; do not route author-signed physical book payments through it. Standard Stripe merchant tax/shipping obligations for signed books remain the seller's responsibility.
- Before removing mandatory MFA from deployed staff access, verify `REQUIRE_STAFF_AAL2_V135` is OFF in Cloudflare Pages only **after** the reviewed R1 password-step-up migration and staff role-negative tests pass. CAPTCHA is human-verification only, not identity assurance or an investment compliance certification. Prior R1 intentionally replaces mandatory staff MFA with recent password verification. Its security regressions must pass before production deployment.

## Acceptance and signoff

**Required before R2 staging acceptance:** all GitHub Actions on a single commit, R1 and R2 migration postflight checks, negative RLS and test receipt tests, Cloudflare deployment SHA parity. **Required before selling:** real Stripe Managed sandbox end-to-end digital payment/subscription webhook fulfillment, refund/chargeback/renewal tests and merchant approval; this part is still NOT implemented by R2.

## References

- Stripe Managed Payments overview and Checkout flag: https://stripe.com/managed-payments
- Stripe Managed Payments legal terms (2026): https://stripe.com/legal/ssa-services-terms
- Stripe sandbox tests: https://docs.stripe.com/testing
- Stripe Checkout fulfillment via webhooks: https://docs.stripe.com/payments/existing-customers
- KDP Select exclusivity: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7
- Supabase CAPTCHA: https://supabase.com/docs/guides/auth/auth-captcha

## Revision history

| Revision | Date | Details |
|---|---|---|
| 1 | 2026-10-15 | Stripe Managed Payments preferred route, preserved Lemon Squeezy, OWNER controls, sandbox-only checkout, signed test webhook and explicit live-commerce hold. |
