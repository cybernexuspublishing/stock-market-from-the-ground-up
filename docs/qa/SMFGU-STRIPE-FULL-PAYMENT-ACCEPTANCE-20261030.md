# SMFGU — Stripe Full Payment Acceptance Report

**Document ID:** SMFGU-QA-STRIPE-PAYMENTS-20261030-001  
**Project:** The Stock Market: From the Ground Up  
**Filename:** `SMFGU-STRIPE-FULL-PAYMENT-ACCEPTANCE-20261030.md`  
**File type:** Markdown  
**Authoritative location:** GitHub `cybernexuspublishing/stock-market-from-the-ground-up`, `main`, `docs/qa/SMFGU-STRIPE-FULL-PAYMENT-ACCEPTANCE-20261030.md`  
**Google Drive location:** Not assigned. Create a separate Drive record only if adopting Drive as an additional controlled repository.  
**Version:** 1.1  
**Status:** PARTIAL ACCEPTANCE — authenticated LIVE Checkout initialization PASSED; 30/60 Stripe TEST initial payments PASSED; 30/60 chronological renewals and LIVE nonzero payment/refund NOT VERIFIED  
**Test date:** October 30, 2026 (UTC evidence timestamps; local America/Chicago)  
**Primary Cloudflare project:** `stock-market-from-the-ground-up`  
**Primary Supabase project:** `oxihglyfgzywsupnyicb`  
**Primary Stripe TEST account:** `acct_1URGkDJY9FI7byHB`  
**Primary Stripe LIVE account:** `acct_1OxhOiJL0O4GGVBH`  
**Dependencies:** Connected Primary Stripe API, Cloudflare deployment, existing GitHub Actions QA login secrets, genuine QA/member funding for LIVE card acceptance.  
**Purpose:** Capture precise provider and member evidence, known blockers, QA cleanup, and release decision without substituting mocked tests for real purchases.

## Scope and acceptance definitions

The owner requested (a) authenticated website Checkout through actual member paid fulfillment, (b) genuine 30-/60-day subscription renewals and failed-payment recovery, and (c) an actual customer-facing LIVE nonzero payment followed by a refund. An authenticated LIVE Checkout session is not proof of payment or entitlement. An initial TEST subscription charge is not a renewal. A refund in Stripe TEST mode is not a LIVE refund.

### Track A — Authenticated member checkout

- **PASS:** Existing James_Test QA member authenticated on the deployed production site with GitHub Actions encrypted `LAB_QA_EMAIL` and `LAB_QA_PASSWORD`; verified expected user UUID, account eligibility, published Founder 30-Day access and recurring $49.99/30-day terms.
- **PASS:** Production POST `/api/founding600-checkout` created a genuine Stripe LIVE Checkout session, correctly bound to the QA founder reservation. Session creation time and expiration confirmed from the Stripe LIVE API; `mode=subscription`, `status=open`, `payment_status=unpaid`.
- **NOT VERIFIED:** Completing that Checkout with a legitimate LIVE payment instrument, subsequent LIVE `invoice.paid` webhook and verified member entitlement. No card was entered. No paid membership was conferred.
- **QA session:** `cs_live_a1YTjkQjccAoJMq5W2B8hVS8i8n54iDKOhVjwjI7JKZVbrVOGXQHhkYtix`; reservation `f03db0bf-da5e-4790-a4ef-54dd86b70fcd`; Stripe Checkout session configured to expire after 30 minutes; no charge was made.
- **CI evidence:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41144130677 (PASS)
- **Source:** `tests/test_authenticated_founder_checkout_production_20261030.mjs` and `.github/workflows/authenticated-founder-checkout-qa-20261030.yml`.

### Track B — 30-/60-day TEST subscription cycles

| Plan | TEST subscription | Initial invoice | Initial payment | Refund | Subscription cleanup | Genuine renewal |
| --- | --- | --- | --- | --- | --- | --- |
| Founding 30-Day | `sub_1UWP6YJY9FI7byHBps2YagVY` | `in_1UWP6YJY9FI7byHBZXQrIcQ7` | $49.99, paid | `re_3UWP6YJY9FI7byHB1JdHUqin`, succeeded | Canceled | **Not observed** |
| Founding 60-Day | `sub_1UWP6oJY9FI7byHByuvmMu6l` | `in_1UWP6oJY9FI7byHBzqaUoXpc` | $59.99, paid | `re_3UWP6oJY9FI7byHB1L0XH2id`, succeeded | Canceled | **Not observed** |

- **PASS:** Stripe TEST accepted the approved recurring price, charged the initial invoice, created correct 30-/60-day billing periods, processed TEST refunds, and canceled both QA subscriptions.
- **NOT VERIFIED:** Renewal billing after a complete 30-/60-day elapsed term, recovery from failed renewal invoice, restored account access or actual QA member-benefit grants. Resetting the 30-Day subscription billing-cycle anchor did not create a second invoice and is not counted as a renewal.
- **Technical blocker:** The connected Stripe API exposes test-clock creation but not test-clock advancement. Performing a complete accelerated renewal requires authorized test-clock advancement and positive QA entitlement binding, not fabricated invoice or grant records.
- **Isolated source-level tests:** The previously passing comprehensive payment suite covers mocked invoice failure, cancellation, signed webhooks and entitlement reversals; these are not substituted for provider-based renewal acceptance.
- **Prior CI evidence:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41142763802 (51 payment-related test files passed).

### Track C — Customer-facing nonzero LIVE payment and refund

- **NOT PERFORMED:** No verified QA-owned LIVE payment method is available to perform the requested charge. No customer card was charged or refunded.
- **Stripe pricing floor:** Minimum standard nonzero USD charge is $0.50 (https://docs.stripe.com/currencies). A LIVE payment generally incurs real processing fees even if its principal is refunded; fee treatment depends on applicable account pricing.
- **Required evidence:** A payment voluntarily completed by the authorized payer through production Checkout, confirmed LIVE `payment_intent.succeeded` and fulfillment, a targeted refund of that exact authorized payment, the corresponding refund webhook, and verified access-reversal behavior. Never select or charge an unrelated customer payment method.
- **Authorized scope:** Owner authorized a paid test, but that authorization alone cannot substitute for a genuine controlled payment instrument.

## Environment and safeguards

- Existing LIVE and TEST Stripe account separation maintained.
- Existing LIVE credentials not rotated or exposed.
- Stripe TEST-only account used for all newly created 30-/60-day subscription charges; all QA subscriptions canceled and charges refunded.
- LIVE QA Checkout session was not completed; no LIVE charge created by these tests.
- Existing primary store pricing, shipping, refunds, and member entitlements not modified for QA.
- No role elevation, CAPTCHA bypass, fake paid entitlement, fake Stripe webhook, or unsafe user-visible QA test control introduced.

## Release disposition and open acceptance

**Not accepted as a complete end-to-end paid-launch test.** A signed genuine member-paid LIVE transaction and refund, actual 30-/60-day renewal and recovery, and positive member entitlement verification remain open. Existing provider and source-level acceptance is positive but narrower.

## Revision history

| Version | Date | Description |
| --- | --- | --- |
| 1.0 | 2026-10-30 | Recorded real authenticated checkout creation; initial Stripe TEST 30-/60-day subscriptions, reversals and cancellation; explicit missing acceptance items. |

## Official Stripe TEST card acceptance addendum — 2026-10-30

**Objective:** Execute the user-authorized, zero-real-money fake-card tests, not a LIVE nonzero charge.

- **PASS:** Provider TEST transactions using Stripe's sandbox card/token fixtures `tok_visa` succeeded for Founding 14-, 30-, and 60-Day initial subscriptions. All specifically created 30-/60-day QA subscriptions were canceled and refunded in TEST mode. This is not proof of a chronological subscription renewal or member fulfillment.
- **PASS:** `tok_chargeDeclined` returned `card_declined` / `generic_decline` from the Primary Stripe TEST account. No real charge.
- **PASS:** Real authenticated `James_Test` login to production and Book I TEST Checkout initiation. Stripe created TEST Checkout session `cs_test_a1tsiNURFRBqSvHKPUN0EO5X5jpQoYeO0zaZ3ijKPzP0xHTpOMcrSUIBtg` for $10.99.
- **BLOCKED:** In the first Chromium run, the hosted Stripe TEST form did not navigate after submitting the official success test card; after the 60-second timeout, the Stripe session remained `open/unpaid`. The second diagnostic browser run encountered an unavailable hosted card-number input. The tests are *not* successful end-to-end payments.
- **QA cleanup VERIFIED:** The temporary `gu_book_test_qa_v1` allowlist entry for `James_Test` was deleted and confirmed absent. TEST Book fulfillment events remain zero; no LIVE entitlements or charges were created.
- **OPEN:** Real hosted TEST card payment completion, verified TEST Book shadow-fulfillment and refund revocation; real chronological 30-/60-day TEST renewal and failed-renewal recovery through a test clock. The connected Stripe API does not expose test-clock advancement.

**Evidence:** [Authenticated Book TEST browser attempt 1](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41145113758) and [diagnostic attempt 2](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41145446263), both failed at the hosted card interaction. Never present them as successful purchases. Stripe's automated-testing documentation warns that hosted payment UI may enforce automation security controls.

**Release impact:** LIVE purchase/refund acceptance remains unverified; TEST card fixtures cannot pay a LIVE Checkout.

| Version | Date | Change |
| --- | --- | --- |
| 1.1 | 2026-10-30 | Official fake TEST-card scenarios, real authenticated Book TEST session, failed hosted card acceptance, verified QA allowlist cleanup. |
