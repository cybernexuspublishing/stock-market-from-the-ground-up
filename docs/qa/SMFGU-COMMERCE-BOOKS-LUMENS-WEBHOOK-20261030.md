# SMFGU — Books, Crownlight Lumens, and LIVE Webhook Acceptance

**Document ID:** SMFGU-QA-COMMERCE-20261030-002  
**Filename / type:** `SMFGU-COMMERCE-BOOKS-LUMENS-WEBHOOK-20261030.md` / Markdown  
**Project:** The Stock Market: From the Ground Up  
**Location:** GitHub `cybernexuspublishing/stock-market-from-the-ground-up` / `main` / `docs/qa/SMFGU-COMMERCE-BOOKS-LUMENS-WEBHOOK-20261030.md`  
**Google Drive location and file ID:** Not assigned; no duplicate file created  
**Version:** 1.4  
**Status:** PARTIAL ACCEPTANCE; paid purchases, signed LIVE delivery, and Lumens package purchases not accepted end-to-end  
**Date:** October 30, 2026 (some evidence on October 31 UTC)  
**Dependencies:** Primary SMFGU Stripe TEST/LIVE, Supabase, Cloudflare Pages, secure member session, real provider event delivery.  
**Purpose:** Record precise verified controls, changes, gaps, and cleanup.

## Book correction and verification

Five separate digital titles are rights-attested and present in private storage with EPUBs of approximately 4–5 MB each. Their Supabase `gu_digital_books_v01430` rows have sales and downloads enabled, exclusivity expired, and corresponding `catalog_products` records show direct digital and website checkout enabled, KDP Select disabled. Each LIVE Stripe Price and Product was verified active at: Foundations I $10.99, Foundations II $10.99, Foundations III with RCT $11.99, Day Trading $14.99, Reading the Tape $14.99.

**Changed:** Five `gu_storefront_items_v014174` records to `visible=true`, `status=for_sale`, `sale_ready=true` after guarded source-asset checks; changed Foundations Book III `catalog_products.sales_status` to `published`. Synchronized the five Stripe LIVE Product metadata `site_checkout_enabled=true`, `launch_state=for_sale`. Preserved `fulfillment_verified=false`; no paid event falsely claimed.

**Verified production smoke test:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41149500242 (PASS). The five book checkout GET preflights returned available and accurate prices; public Store displayed all five sale-ready.

**Inventory:** 61 registered Store SKUs; **12 customer-visible sale-ready** = 5 books, 3 Founding Memberships and 4 à-la-carte tools. The two book bundle listings, 15 Boot Camps/clinics, six included features, hidden memberships and currency packages are not added to this sellable count.

## James_Test My Books download testing

An authorized, 12-minute QA-only `LIFETIME` grant was temporarily created solely for download testing. It was **canceled** with an explicit QA audit marker immediately after a first browser-runner pathname error (`/my-books` instead of `/my-books.html`). Subsequent database verification showed `James_Test` on FREE, with no active QA grant. No paid order or synthetic provider event was created. The first run is https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41149822162 (failure unrelated to file payload). The browser test was corrected to support both URLs and to require server denial when the authenticated member has no entitlement; passing that test demonstrates access control, not a paid purchase.

**New verified evidence:** The corrected James_Test QA browser passed at https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41150779618. Authentication succeeded, and the secured download API correctly denied all five books to the Free QA member. No file payload was downloaded because the user had no genuine paid entitlement. The prior 12-minute test grant had been canceled.\n\n**Still open:** A genuine Stripe TEST checkout paid via official card -> signed webhook -> book ledger paid -> My Books entitlement -> actual EPUB download -> refund -> disappearance of entitlement. A manual QA grant is never equivalent to provider-verified paid fulfillment.

## LIVE $0 diagnostic and webhook

Prior genuine zero-dollar LIVE session `cs_live_a1bbjaB1N0UNjQqTQTM9YTDUuLfHBPF8YFuAHG7ZOirAOa3q9h4eAazJeQ` remains `complete/paid`, amount 0, no PaymentIntent or subscription, with valid GU71 metadata. Its actual event `evt_1UVaw9JL0O4GGVBHKjQTd21w` remains `pending_webhooks=1`. LIVE webhook delivery has **not** passed; original endpoint delivery-attempt HTTP details and a genuine provider retry/new completed signed Checkout are required. Do not forge a signature, claim that session granted membership, or rotate LIVE secrets as an unverified guess.

A second isolated $0 LIVE session was created by authorized Stripe administrator tools to check transport but remains OPEN/UNPAID; this created no event or entitlement and does not establish success. Existing GU71 remains a zero-cost one-time diagnostic and never grants membership.

## Crownlight Lumens package purchasing

**Customer-facing package data** `data/crownlight-sparks-store-v014167.json` defines five coming-soon packages: **25/$5**, **55/$10**, **90/$15**, **125/$20**, **275/$40**. Global `checkoutEnabled=false`; each package's checkout also disabled.

**Database/Stripe mismatch:** Three hidden old storefront entries and LIVE Stripe Products/Prices remain: `SPARKS_10` $3.99, `SPARKS_30` $9.99 and `SPARKS_75` $19.99. Their Stripe Product metadata says `site_checkout_enabled=false`, `fulfillment_verified=false`, `launch_state=coming_soon`. This does not match the five bundles displayed on the website.

**Decision:** Do not activate obsolete or newly advertised bundles for real-money checkout. Purchased-Lumens end-to-end acceptance is blocked because no verified, bound five-package checkout -> genuine signed provider payment -> nonexpiring member credit bucket -> replay-safe ledger -> full-refund reversal path has been demonstrated. Existing tests of mixed Lumens *spending* and QA shadow credits are not tests of *purchasing* Lumens.

## Open acceptance items

1. Finish provider-signed TEST book purchase, bound paid grant and file download/refund/revocation using a QA member.
2. Diagnose Stripe's failed/pending GU71 event from genuine delivery-attempt HTTP responses; confirm a new or retried Stripe-signed event is acknowledged 2xx.
3. Align the five package catalog SKUs and pricing in all systems, implement TEST-only protected bundle purchase/credit/refund ledger and verify with real TEST card events; only then authorize LIVE product exposure.
4. Preserve original customer entitlement and payment records, and prevent any nonzero LIVE QA charges absent a genuine user-controlled payment method.

## October 30 addendum — exact QA acceptance and release state

### Five private EPUB files: real authenticated delivery ACCEPTED

Browser acceptance https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41156247733 (PASS). Real James_Test member authentication, five My Books records, five server-issued private signed URLs, five HTTP 200 private downloads, and ZIP/EPUB header validation. Actual bytes: Foundations I 4,407,701; II 4,523,352; III 4,811,622; Day Trading 4,391,053; Reading the Tape 4,592,189. The temporary QA-only Lifetime grant (id 12) was canceled immediately after passing. Read-only account check confirmed FREE and zero active temporary grants. The delivery test is not payment-granted ownership.

Unentitled negative test previously passed: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41150779618 — the Free member could not download any of the five books.

### Five official Stripe TEST Lumens packages

Five isolated Stripe TEST products and prices were created to **match the existing five approved storefront packages** exactly:

| Internal SKU | Lumens | TEST price | TEST Stripe Price |
|---|---:|---:|---|
| SPARKS_25 | 25 | $5.00 | price_1UWQzYJY9FI7byHBEuMNO2lI |
| SPARKS_55 | 55 | $10.00 | price_1UWQzrJY9FI7byHBGqJqnVVb |
| SPARKS_90 | 90 | $15.00 | price_1UWR0AJY9FI7byHBBUc0L3uw |
| SPARKS_125 | 125 | $20.00 | price_1UWR0SJY9FI7byHBqmNHBTyt |
| SPARKS_275 | 275 | $40.00 | price_1UWR0lJY9FI7byHBhETFtRi0 |

All five QA TEST Products explicitly have \`qa_only=true\`, \`site_checkout_enabled=false\`, \`fulfillment_verified=false\`, and belong exclusively to TEST account \`acct_1URGkDJY9FI7byHB\`. Existing LIVE obsolete bundle prices and customer checkout flags are unchanged.

New isolated TEST-only runtime:
- \`functions/api/lumen-bundle-test-checkout.js\`: authenticated QA-only server checkout, real TEST Prices, immutable TEST Checkout line items, server-bound reservation, explicit QA gate. Never grants production credits.
- \`functions/api/lumen-bundle-test-webhook.js\`: verified HMAC and account, provider fetched Checkout/PaymentIntent, exact TEST price, quantity and amount, duplicate/refund protection, atomic database shadow-credit reconciliation.
- \`functions/api/stripe-test-webhook.js\`: routes provider-verified bundle events to the dedicated processor, without weakening Book or GU39 processors.
- \`supabase/migrations/20261030_lumen_bundle_stripe_test_shadow_v1.sql\`: versioned already-applied SQL migration (schema originally applied as \`smfgu_stripe_test_lumen_bundle_shadow_checkout_v1\`). Separate TEST catalog, order, events, QA allowlist, nonexpiring QA-only credit ledger, service-role-only RPCs, denied anonymous/member direct table access.
- \`tests/test_lumen_bundle_stripe_test_shadow_v1.mjs\`: all five package prices, server gate, no real-wallet writes and signature rejection.

Source CI PASSED: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41155410195. Comprehensive payment regression PASSED: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41156183615.

**Transactional database acceptance PASSED with rollback:** Test order reserved 25/$5, bound to a QA session ID, applied QA paid event, verified exactly 25 purchased shadow credits with null expiry, replayed same event without duplicates, applied full refund to zero shadow credits, and denied late paid replay. This test generated **no real Stripe provider event** and was rolled back. It is a database contract test, not provider-signed acceptance.

**Authenticated provider checkout initiation PASSED:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41155826848. James_Test signed in, GET verified all five active Stripe TEST Prices, and POST created a genuine $5.00 Stripe TEST Checkout for \`SPARKS_25\`. Stripe session \`cs_test_a1tG0MwYBq3apx6SDRz1kuUGrKHg91hxyCrztFfphBsP5gMOQWKZgmKebB\` remains open/unpaid; no credits were issued or refunded.

**QA cleanup VERIFIED:** Removed Cloudflare \`LUMEN_BUNDLE_TEST_CHECKOUT_ENABLED\`; production returned to 48 variables. Disabled James_Test in \`gu_lumen_bundle_test_qa_v1\`; removed James_Test from \`gu_book_test_qa_v1\`. No TEST bundle shadow-credit rows exist; real James_Test wallet remains 53 manual, zero purchased. LIVE keys, paid prices, general member roles and the retired GU72 gate remain unchanged.

### Remaining release blockers after this addendum

1. **Genuine book paid fulfillment:** Complete an authenticated Book I TEST Checkout with official Stripe test card and receive a genuine Checkout completion event; confirm signed TEST webhook, book ledger, real QA EPUB download, actual TEST Stripe refund, and revocation. There is an existing genuine but unpaid Book I TEST session. Automated hosted card completion was not accepted.
2. **Original LIVE $0 webhook:** Genuine Stripe event \`evt_1UVaw9JL0O4GGVBHKjQTd21w\` still reports \`pending_webhooks=1\`. The configured LIVE route is \`/api/stripe-live-webhook\`, which forwards to the versioned implementation. Provider delivery-attempt HTTP evidence and Stripe Dashboard resend or a newly completed $0 hosted Checkout are still necessary. No claim of 2xx signed acknowledgment.
3. **Actual purchased Lumens:** Complete the genuine $5.00 TEST Checkout above; verify real Stripe signed event, QA shadow-credit grant, full TEST refund event, zero shadow balance and replay protection. Then separately build/approve the real LIVE wallet issuance and legal customer refund model before allowing paid package checkout. Do not count simulated shadow-credit tests as customer fulfillment.

### Independent note

The exact five customer-facing book SKUs remain sale-ready. Twelve of sixty-one storefront SKUs are customer-visible and sale-ready; five Lumens packages are not yet customer sellable.

## October 30 continuation — independent provider/configuration audit (20:48 America/Chicago)

**Result: PARTIAL ACCEPTANCE, NOT SIGNED PAYMENT ACCEPTANCE.** Live API reads through the connected Stripe account, Cloudflare Pages production config, primary Supabase and repository confirm the exact remaining constraints. No card was charged and no test grant or refund was fabricated.

- **Stripe TEST account:** `acct_1URGkDJY9FI7byHB`. One active unified event destination `we_1UWNRSJY9FI7byHBHABdyP3R` at `https://stock-market-from-the-ground-up-d1r.pages.dev/api/stripe-test-webhook`; five older standalone TEST webhook destinations are disabled. Book I `cs_test_a1tsiNURFRBqSvHKPUN0EO5X5jpQoYeO0zaZ3ijKPzP0xHTpOMcrSUIBtg` remains open/unpaid ($10.99). The 25-Lumens `cs_test_a1tG0MwYBq3apx6SDRz1kuUGrKHg91hxyCrztFfphBsP5gMOQWKZgmKebB` remains open/unpaid ($5.00). These are genuine provider-hosted sessions but **not paid purchases**.
- **Database state:** `gu_book_test_intents_v1`: one `checkout_created`; `gu_lumen_bundle_test_orders_v1`: one `bound`; `gu_book_test_events_v1`: zero; `gu_lumen_bundle_test_events_v1`: zero; `gu_lumen_bundle_test_shadow_credits_v1`: zero; `gu58_live_stripe_events`: zero. This matches the unpaid sessions and lack of signed recorded fulfillment. No TEST or LIVE refund is eligible without a successful provider payment.
- **LIVE account:** `acct_1OxhOiJL0O4GGVBH`. Stripe LIVE endpoint `we_1UUZvAJL0O4GGVBH5Tp77DVM` is enabled at `/api/stripe-live-webhook`, subscribed to `checkout.session.completed`. A separate LIVE Founding Members endpoint `we_1UUZvEJL0O4GGVBHa1CTpKMO` remains enabled for invoice/subscription/refund lifecycle, not this zero-dollar checkout. The historical zero-dollar `evt_1UVaw9JL0O4GGVBHKjQTd21w` is provider-verified as complete/paid and has `pending_webhooks=1`. There is no verified 2xx signature acknowledgment.
- **Cloudflare production:** `GU58_LIVE_DB_CONTRACT_APPROVED`, `GU58_LIVE_FULFILLMENT_APPROVED`, `GU58_LIVE_WEBHOOK_ENABLED` and `GU71_ZERO_LIVE_QA_ENABLED` are all `true`. `STRIPE_LIVE_ACCOUNT_ID` and `GU71_ZERO_LIVE_PRICE_ID` match the actual diagnostic Stripe event's account/price. Encrypted LIVE signing and API key variable names exist; plaintext secret contents were not exposed or compared. Most recent successful main deployment observed at `d3653ee36284cd5f545b4f25868c3f54f6c32bc4`. Therefore a signing-secret mismatch, prior failure before current flags, and/or transport errors are **possibilities requiring real delivery-attempt evidence**, not demonstrated root causes.
- **Cloudflare observability:** scoped search for `stripe-live-webhook` returned no matching available telemetry events. This neither proves nor disproves a Stripe HTTP delivery, and does not substitute for the Stripe Dashboard webhook-attempt status/body.
- **Five TEST Lumens packages:** official TEST provider prices remain configured. The `lumen-bundle-test-webhook.js` intentionally writes ONLY isolated QA shadow-credit balances, not the live nonexpiring purchased-Lumens wallet. Separately implement and validate actual customer wallet issuance, accounting, refund, negative balance/clawback rules and entitlement synchronization before releasing customer bundle sales.
- **Automation constraint:** the optional connected browser automation wallet has insufficient funds and its workflow is metered. With the Owner's $0 budget, no charged browser run was initiated. Stripe's current API surface here can read/create Sessions but does not provide a hosted payment-form submission or legacy event-resend/delivery-attempt operation. Do not substitute API-generated payment intents or forged events for Session completion.

**Remaining acceptance actions, in strict order:** (1) complete original Book I TEST hosted session with official fake test card and verify signed provider event, Book I grant, real EPUB download, TEST refund and revocation; (2) complete original 25-Lumens TEST hosted session, signed shadow issuance and full TEST refund/reversal; (3) inspect and resend original LIVE event through Stripe Dashboard/CLI, verify actual 2xx and event linkage; (4) only afterward extend purchased-Lumens to the production nonexpiring wallet with controlled refund rules, repeating real TEST acceptance before customer sale.

**Release gates:** all five EPUB titles remain in their current sale-ready state as recorded previously, but paid-fulfillment acceptance is NOT asserted. Lumens package LIVE customer checkout remains disabled. No LIVE nonzero QA payment, secret rotation, new webhook endpoint, customer entitlement grant or automated billing mutation was performed.


## Provider-hosted execution on October 30, 2026 — independent acceptance results

**Browser-run evidence:** [Stripe TEST and $0 LIVE run 41157810796](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41157810796), concluded FAILURE by design. GitHub Actions reached all three official hosted Checkout forms and submitted the approved Stripe TEST card only for the two TEST sessions. The hosted UI displayed "Please try again" and remained on Stripe for each attempt. A browser-only failure message cannot establish actual provider payment state.

**Provider reconciliation (authoritative Stripe API):**

| Item | Actual Stripe state | Acceptance |
|---|---|---|
| Book I $10.99 TEST, cs_test_a1tsiNURFRBqSvHKPUN0EO5X5jpQoYeO0zaZ3ijKPzP0xHTpOMcrSUIBtg | open / unpaid / PaymentIntent null | No paid book or refund |
| 25 Lumens $5 TEST, cs_test_a1tG0MwYBq3apx6SDRz1kuUGrKHg91hxyCrztFfphBsP5gMOQWKZgmKebB | open / unpaid / PaymentIntent null | No purchased credits or refund |
| LIVE $0, cs_live_a1cfvoCm3vgnKzYaqn71dk4eJiyYrrOjNeUPQyS65eqePFK4btQU00Tl1V | complete / paid / exactly $0 / PaymentIntent null | Provider checkout PASSED; webhook NOT passed |

The new genuine LIVE `checkout.session.completed` event is `evt_1UWRaCJL0O4GGVBHK5A1POGx` (2026-10-31T01:59:48Z). Its `pending_webhooks=1`, and original event `evt_1UVaw9JL0O4GGVBHKjQTd21w` also remains at 1. Actual signed HTTP 2xx acknowledgment was **not confirmed**.

**LIVE webhook negative preflight:** [run 41158103786](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41158103786) PASSED. GET returned expected 405 and invalid-signature POST returned expected HTTP 401 `Invalid signature`. This verifies public route availability and fail-closed behavior, NOT acceptance of a legitimate Stripe signature.

**Official provider resend attempt:** [run 41158165130](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41158165130) successfully ran the readiness check, but **did not resend** the original LIVE event: no authorized Stripe LIVE API key was available in the checked GitHub Actions secrets. Cloudflare signing secrets were not extracted, copied, or rotated. The original event must be retried using authorized Stripe Workbench/Dashboard or CLI credentials.

**Supabase post-run:** `gu_book_test_events_v1` = 0, `gu_lumen_bundle_test_events_v1` = 0, `gu_lumen_bundle_test_shadow_credits_v1` = 0, `gu58_live_stripe_events` = 0. No customer purchased-Lumens balance was altered. No nonzero LIVE payment occurred. No TEST refunds can be performed before a successful TEST charge.

**Remaining owner/provider interactions:** Inspect LIVE Workbench event delivery-attempt HTTP status/body for both pending events, correct the evidence-backed cause, resend the original; complete two existing TEST Checkout sessions in an interactive browser accepted by Stripe, then independently verify genuine signed payment events, paid book entitlement/private EPUB, 25-Lumens QA shadow credit, and Stripe TEST refunds/reversals. Paid customer Lumens checkout remains disabled until real-wallet issuance/refund logic is independently accepted.

**Do not close** book paid-fulfillment, original/new LIVE webhook delivery, purchased-Lumens credit, or refund acceptance on the evidence available.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-30 | Books metadata reconciled; 12/61 catalog count; QA tests and grant cleanup; zero-dollar webhook event pending; Lumens five-vs-three catalog discrepancy. |

| 1.1 | 2026-10-30 | Corrected extensionless My Books test passed; verified unauthorized downloads denied for all five books as Free QA member. |
| 1.2 | 2026-10-30 | Positive five-book EPUB delivery passed; five Stripe TEST Lumens packages, new shadow ledger and refund contracts, authenticated $5 TEST Checkout, comprehensive regression, QA rollback and remaining signed-event gaps recorded. |
| 1.3 | 2026-10-30 | Independently reverified Stripe sessions, TEST/LIVE endpoint routing, Cloudflare LIVE switches, deployment, Supabase payment ledgers, QA shadow-only boundary and original pending LIVE event. No false acceptance of paid fulfillment. |
| 1.4 | 2026-10-30 | Executed live Stripe-hosted QA; genuine $0 LIVE Checkout completion, both LIVE events still pending, unsigned route preflight 405/401, no available CI LIVE resend key, two TEST sessions unpaid, no phantom grants/refunds. |
