# Stripe Cloudflare Configuration Consolidation — Record of Changes

**Document ID:** SMFGU-COMMERCE-ENV-RENAME-20261030  
**Project:** The Stock Market: From the Ground Up  
**File:** `docs/STRIPE_CLOUDFLARE_BINDING_MIGRATION_2026-10-30.md`  
**File type:** Markdown  
**Google Drive location:** Not assigned; authoritative copy is in GitHub `main`  
**Version:** 1.1  
**Status:** Partial implementation accepted; webhook cutover and encrypted-secret migration pending  
**Effective record date:** 2026-10-30  
**Owner authorization:** Simplify Cloudflare Stripe variables without affecting merchant entitlements or other businesses  
**Scope:** Primary Cloudflare Pages project `stock-market-from-the-ground-up`; Primary Stripe TEST `acct_1URGkDJY9FI7byHB`, LIVE `acct_1OxhOiJL0O4GGVBH`  
**Exclusions:** MommaBee Stripe and Cloudflare projects; no nonzero LIVE charges

## Implemented — Cloudflare Production

1. Actual nonsecret variable rename: `GU58_STRIPE_LIVE_ACCOUNT_ID` -> `STRIPE_LIVE_ACCOUNT_ID`; old binding deleted, value verified.
2. Consolidated LIVE catalog: `STRIPE_LIVE_CATALOG_JSON` with `legacy` and `founding` sections. The two old LIVE catalog bindings were deleted after byte-for-byte logical JSON equality checks.
3. Consolidated TEST catalog: `STRIPE_TEST_CATALOG_JSON` with `legacyPriceMap` and `founding` sections. The two old TEST catalog bindings were deleted after logical equality checks.
4. Website origin: `PUBLIC_SITE_URL` is authoritative; deleted redundant `GU_BILLING_SITE_ORIGIN` and `GU_PUBLIC_SITE_ORIGIN` after verifying identical values and updating billing notices.
5. Created encrypted `STRIPE_TEST_WEBHOOK_SECRET` from a newly created **Primary Stripe TEST** webhook endpoint `we_1UWNRSJY9FI7byHBHABdyP3R` whose URL is `/api/stripe-test-webhook`. The newly created endpoint is currently **disabled** pending acceptance; existing two TEST endpoints remain enabled.
6. Production environment now has **51 bindings** versus 54 before this consolidation. This is a net reduction of three; six legacy nonsecrets were removed and three new bindings were created.
7. All pre-existing encrypted secret bindings were preserved. No LIVE charge, refund, entitlement grant, webhook routing change or change in LIVE launch flags was performed during this consolidation.

## Existing Stripe secrets that remain in Cloudflare

| Binding | Current role | Migration status |
| --- | --- | --- |
| `GU58_STRIPE_LIVE_SECRET_KEY` | LIVE API key | Retained; new `STRIPE_LIVE_SECRET_KEY` needs secure value provisioning |
| `GU58_STRIPE_LIVE_WEBHOOK_SECRET` | GU58 LIVE webhook signing secret | Retained; new `STRIPE_LIVE_WEBHOOK_SECRET` needs secure value provisioning |
| `GU_F600_LIVE_WEBHOOK_SECRET` | Founding Members LIVE webhook signing secret | Retained; new `LIVE_WEBHOOK_SECRET` needs secure value provisioning |
| `GU39_STRIPE_TEST_SECRET_KEY` | TEST membership/sandbox API key | Retained; may share one TEST key after scope verification |
| `GU39_STRIPE_TEST_WEBHOOK_SECRET` | Original GU39 TEST webhook secret | Retained until unified endpoint acceptance |
| `GU_BOOK_STRIPE_TEST_SECRET_KEY` | TEST book API key | Retained; new `STRIPE_TEST_SECRET_KEY` needs secure value provisioning and permissions verification |
| `GU_BOOK_STRIPE_TEST_WEBHOOK_SECRET` | Original Book TEST webhook secret | Retained until unified endpoint acceptance |
| `STRIPE_TEST_WEBHOOK_SECRET` | New consolidated TEST endpoint secret | **Configured**; endpoint disabled pending signed-delivery and fulfillment tests |

Cloudflare does not return secret values after they have been set. Never create empty aliases or delete existing encrypted keys before the replacement and signed webhook delivery have been verified.

## Controls intentionally retained

Keep LIVE vs TEST API credentials separate. Keep separate LIVE GU58 and Founding Members webhook signing secrets unless a separate LIVE endpoint consolidation is explicitly designed and accepted. Keep checkout, webhook, fulfillment, emergency-disable and internal billing task authorization controls independent. The GU39 database Owner switch is a separate gate; Cloudflare's enabled setting is not sufficient to authorize shadow settlement.

## TEST single-webhook cutover acceptance criteria (still open)

- [x] Shared TEST webhook code deployed on `main`; separate Book and membership processors retained.
- [x] Shared TEST signing-secret binding configured in Production.
- [x] Automated checks: forged signatures, stale timestamps, LIVE event rejection, wrong account rejection, book/membership routing.
- [ ] Reconcile shared TEST API key permission scope and configure `STRIPE_TEST_SECRET_KEY` securely.
- [ ] Deliver genuine signed TEST webhook events through the consolidated endpoint and verify provider event delivery (2xx).
- [ ] Confirm fully bound sandbox membership creation, cancellation, renewal/refund behavior, duplicate-event idempotence, and Book purchase/fulfillment/reversal independently.
- [ ] Disable the two original TEST webhook destinations after successful acceptance. Then delete obsolete TEST webhook secrets and Book TEST API key only if no remaining dependencies.
- [ ] Repeat a no-charge LIVE readiness check after all legacy binding removals.

## Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-10-30 | Original canonical naming and legacy fallback strategy |
| 1.1 | 2026-10-30 | Document actual catalog and origin consolidation, new TEST endpoint, 51-binding inventory and safe activation gate |
