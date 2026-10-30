# SMFGU — Stripe Full Payment Acceptance Report

**Document ID:** SMFGU-QA-STRIPE-PAYMENTS-20261030-001  
**Project:** The Stock Market: From the Ground Up  
**Filename:** `SMFGU-STRIPE-FULL-PAYMENT-ACCEPTANCE-20261030.md`  
**File type:** Markdown  
**Authoritative location:** GitHub `cybernexuspublishing/stock-market-from-the-ground-up`, `main`, `docs/qa/SMFGU-STRIPE-FULL-PAYMENT-ACCEPTANCE-20261030.md`  
**Google Drive location:** Not assigned. Create a separate Drive record only if adopting Drive as an additional controlled repository.  
**Version:** 1.2  
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

## $0 LIVE QA and storefront inventory addendum — 2026-10-30

**Document status:** PARTIAL ACCEPTANCE; production build safety safeguard preserved; zero-dollar entitlement test NOT executed successfully.  
**Scope:** Primary SMFGU Cloudflare Production, Supabase, and Stripe LIVE; no other merchant account.  
**Google Drive location:** Not assigned. GitHub `main` remains the controlled record.  
**Dependencies:** Published product registry, GU71/GU72 zero-dollar QA routes, release build guard, actual signed event delivery.

### Exact storefront inventory

`public.gu_storefront_items_v014174` contains **61 distinct SKU records** in 7 categories. Purchase-ready is strictly `visible = true AND sale_ready = true AND status = 'for_sale'`.

| Category | Total SKU records | Visible, marked for sale |
| --- | ---: | ---: |
| Founding Memberships | 3 | 3 |
| À-la-carte tools | 22 | 4 |
| Books | 7 | 0 |
| Legacy memberships (including Free) | 5 | 0 |
| Add-ons / Crownlight currency (legacy Sparks naming) | 3 | 0 |
| Boot Camps and clinics | 15 | 0 |
| Included features | 6 | 0 |
| **Total** | **61** | **7** |

Founding sale-ready SKUs: `founding:FOUNDING_14`, `founding:FOUNDING_30`, `founding:FOUNDING_60`. Tool sale-ready SKUs: `tool:INTERACTIVE_LEARNING`, `tool:JOURNAL_ANALYTICS`, `tool:MARKET_SIMULATOR`, `tool:MARKET_TUTOR`. The four legacy paid membership listings are marked sale-ready internally but have `visible=false`, so they are NOT counted as customer-visible sales. Five distinct book titles are visible and listed but `sale_ready=false`; their catalog-level external/website purchase flags are not equivalent to an accepted storefront paid-fulfillment flow. The full book database contains separate release-status contradictions, requiring editorial synchronization before expanding the sellable count.

### GU71 general $0 LIVE acceptance

- A prior Stripe LIVE GU71 Checkout Session `cs_live_a1bbjaB1N0UNjQqTQTM9YTDUuLfHBPF8YFuAHG7ZOirAOa3q9h4eAazJeQ` is provider-confirmed `complete`, `paid`, `amount_total=0`, `payment_intent=null`, `subscription=null`; this is a one-time zero-cost diagnostic, NOT a membership.
- Its `checkout.session.completed` event `evt_1UVaw9JL0O4GGVBHKjQTd21w` appears in Stripe's **unsuccessful-delivery** event results, with `pending_webhooks=1`. The current enabled GU58 LIVE webhook endpoint subscribes to `checkout.session.completed`. Event acknowledgment remains an unresolved operational acceptance issue.
- Historic GU72 $0 LIVE sessions were completed in Stripe, but the exact zero-cost QA grants now have canceled status; no active QA grant remained in the verified account. Those events do not validate Founding paid subscription renewals or their reserved-seats lifecycle.

### Temporary GU72 membership-entitlement acceptance attempt and rollback

- The existing dedicated `/api/store-zero-monthly-qa` route would grant a **temporary QA-only FULL_MONTHLY** entitlement to a single allowed Free member through a service-only signed-webhook RPC and then reset to Free. It is distinct from paid Founding Memberships.
- On authorized QA-only testing, temporarily scoped `GU72_QA_ALLOWED_USER_ID` to `James_Test` and switched on the retired GU72 offer/fulfillment flags; no public membership price or paid secret was altered.
- **BLOCKED BY REQUIRED SECURITY BUILD GUARD:** Cloudflare Pages builds at commits `96d96c2` and `e9c5629` rejected `GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED`, stating `SECURITY BUILD BLOCK: retired zero-dollar entitlement QA cannot run in production`. The tests therefore reached an older production release and reported QA unavailable. This is correct enforcement of an intentionally frozen safety policy; do not bypass it.
- The test-only GitHub harness and workflow were removed from `main`; no zero-amount LIVE Checkout, signed grant or paid entitlement was created by this attempt.
- **Rollback VERIFIED:** `GU72_ZERO_MONTHLY_QA_ENABLED=false`, `GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED=false`, and temporary `GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED` / `GU72_QA_ALLOWED_USER_ID` removed. Cloudflare Production returned to **48 variables**. Latest deployment `a4493af0fdfc36a335ff2365978a1e91a4f949aa` succeeded. `James_Test` returned `FREE` with no active QA grant.
- Existing GU71 Owner-only diagnostic remains enabled; its handler intentionally **does not grant any memberships or tool entitlements**. Its use requires a real Owner session and password step-up; it cannot substitute for the retired GU72 benefit test.

### Open release blockers

1. Obtain an acknowledged genuine GU71 `checkout.session.completed` LIVE delivery and identify why `evt_1UVaw9JL0O4GGVBHKjQTd21w` remains unsuccessful/pending; do not forge signatures.
2. Verify website-originated authorized paid-member fulfillment in Stripe TEST independently; avoid treating a $0 one-time Checkout as a paid subscription.
3. Accept 30-/60-day real renewal and payment-recovery workflows through authorized time advancement, then test access revocation and recovery.
4. Reconcile the five visible book listings with their `sale_ready=false` state, published dates, direct checkout maturity and QA evidence before counting them as sale-ready.

| Version | Date | Change |
| --- | --- | --- |
| 1.2 | 2026-10-30 | Verified seven sellable SKUs among 61 storefront entries; documented completed $0 LIVE provider evidence, unresolved webhook, production build safety block and complete QA rollback. |
