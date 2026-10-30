# Products & Prices — Owner Production Acceptance Record

## Document control

| Field | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up — Website / Admin Control Center |
| Document ID | SMFGU-ADMIN-PRODUCTS-OWNER-ACCEPT-20261030 |
| Filename | `2026-10-30_PRODUCTS_AND_PRICES_OWNER_PRODUCTION_ACCEPTANCE.md` |
| File type | Markdown (.md) |
| GitHub location | `docs/releases/2026-10-30_PRODUCTS_AND_PRICES_OWNER_PRODUCTION_ACCEPTANCE.md` on `main` |
| Google Drive folder | Not assigned; this is the authoritative GitHub source record |
| Google Drive document ID | Not created or assigned |
| Version | 1.0 |
| Record date | October 30, 2026 |
| Status | **OWNER-ATTESTED ACCEPTED — Products & Prices functional scope only** |
| Owner account used | Adissel (as personally stated by Owner) |
| Purpose | Preserve the Owner's explicit six-of-six production-browser acceptance and accurately separate remaining commercial release gates |
| Dependencies | Production Admin Control Center, GitHub main, Cloudflare Pages, Supabase catalog, automated product-tab Chromium tests, existing Owner RBAC, and separately governed payment systems |
| New file required | Yes — permanent scoped Owner acceptance record |

## 1. Controlling Owner acceptance

On October 30, 2026, the Owner explicitly confirmed in the project conversation:

> I have personally verified all six production Owner acceptance checks in the Products & Prices panel using Adissel. Record the Owner acceptance results and identify any outstanding release gates.

This is an **Owner assertion of actual production functional verification**, not an assistant impersonation of the Owner, not a recovered JWT session, and not a database-signed in-app acceptance event. The Owner's direct statement is controlling for the six limited checks below. No repetition of these tests is required solely because the earlier automated fixtures simulated roles.

### Owner-reported acceptance checklist

| # | Area | Accepted outcome | Evidence basis |
| --- | --- | --- | --- |
| 1 | Memberships | Free, Pick What You Want, OnDemand, Full Monthly, Full Annual, Lifetime, and their USD prices display correctly | Owner's six-of-six signed-in production attestation |
| 2 | Founding Offers | Current 14-, 30-, and 60-day offers grouped separately; legacy founding records archived | Same |
| 3 | Books | Existing records load; authorized Book Edit controls open | Same |
| 4 | Tools | Registered tools load with correct release/price labels and authorized editing controls | Same |
| 5 | Sparks | Package and redemption catalog, Sparks costs, fulfillment statuses, and pricing editor entry are visible | Same |
| 6 | Navigation / permissions | All five tabs open without reported errors and Owner controls are available | Same |

**Owner decision:** **6 PASS, 0 reported FAIL.** Close the **Products & Prices authenticated Owner-browser acceptance gate**. Treat the earlier request for the Owner to repeat these specific six checks as superseded by this attestation.

### Supporting automated evidence (separate from the Owner's session)

- The source/fixture Chromium regression for the five product tabs, plan-code classification, Sparks inventory, and simulated Owner/Moderator restrictions passed: [GitHub Actions run 41010953049](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41010953049), revision `f89cce1d66caf287253a65f821f467808087377f`.
- This historical CI revision is not represented as the exact source SHA used in the Owner's personal production browser session.
- The Owner's sign-in token, browser recording, and independent audit trail were not retained in this document. This limitation does not negate the Owner-attested functional decision.

## 2. Release-scope boundary

**Approved:** Products & Prices navigation, correct membership/founding product classification, catalog display, Sparks catalog visibility, and the Owner's authorized editor affordances.

**Not approved by this decision:** Charging customers, Stripe product/price reconciliation, LIVE billing subscription or renewal/refund behavior, signed webhook delivery, entitlement propagation, book distribution rights, digital download fulfillment, Sparks purchase/refund reversals, or all-site launch readiness. Each remains governed by its separate acceptance evidence and Owner financial authorization.

A product's `active`, `public_visible`, `checkout_enabled`, or Store `sale_ready` fields are not sufficient evidence of a completed payment-to-entitlement lifecycle.

## 3. Outstanding release gates — snapshot October 30, 2026

| Priority | Release gate | Snapshot / why it remains open | Required closure |
| --- | --- | --- | --- |
| P0 | Live paid-commerce lifecycle and final Owner payment decision | Current Cloudflare production configuration has the principal GU58/F600 checkout, webhook and fulfillment switches set to true, **but** `GU_LIVE_FINAL_OWNER_PAYMENT_TEST_ACCEPTED` is not configured. A configured switch is not signed payment acceptance. | Read-only all-category LIVE preflight, actual provider price/interval and signed webhook mapping verification, authenticated customer entitlement after a permitted payment, safe refund/cancellation/renewal cases, and a distinct explicit final Owner financial decision. Never create a positive-value charge without authorization. |
| P0 | Founding security/source CI | Latest reviewed main-head Founding 600 Source & Security Gate run [41014832116](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41014832116) failed. Reported failed step: Stripe LIVE founding checkout and paid-cycle fail-closed contract. The failure is not a Products & Prices browser-test failure. | Diagnose and rerun this contract against a stable accepted revision before treating the affected Founder paid flow as certified. |
| P1 | Actual paid-product readiness by SKU | Read-only Supabase snapshot showed `sale_ready=true` on 3 founding, 4 memberships and 4 tools; books, boot camps, features and add-ons showed zero sale-ready in their categories. These are release signals, not fulfilled transactions. | For each publicly sold SKU: match price and cadence, website readiness and entitlement, confirm provider rights and returns, and preserve fail-closed behavior for unfinished items. |
| P1 | Digital book customer delivery and rights | Existing delivery acceptance documentation separates Owner private preview from customer paid checkout, secure file assignment, refunds and KDP/distribution rights. | Individually verify title/edition assets, rights, Stripe or authorized-provider signed purchase-to-book entitlement, and revocation/download lifecycle before releasing direct sales. |
| P1 | Sparks purchased-credit lifecycle | Displayed Sparks prices and catalog visibility are accepted here, not purchased-wallet accounting or provider refund/chargeback outcomes. | Verify signed purchase, atomic balance credit, duplicate suppression, expiry policy, spending order, reversal, and reconciliation under real authorized access. |
| P1 | Paid subscription lifecycle, discounts and access | Plan-level display correctness is not proof of billed intervals, 600-seat allocation, permanent Founding discounts, renewal/cancellation or provider history entitlements. | Verify provider and database evidence for each enabled offer and signed lifecycle under independent member sessions. |
| P2 | Other sitewide release controls | The Products & Prices attestation does not close unrelated Learning, Chart Studio, Market Data, Forum, accessibility or security work. | Use each subsystem's independent published acceptance record and exact-revision CI; do not reopen this accepted panel without a subsequent defect or material change. |

**Important snapshot note:** Commercial flags and SKU readiness are configuration observations as of the review, not a claim that a payment succeeded or that the entire platform is approved to collect money. Later commits/configuration changes may require a fresh technical release review.

## 4. Decision, reopening criteria and controls

1. **Close** the outstanding Products & Prices real Owner-browser acceptance milestone as Owner-attested, effective October 30, 2026.
2. Keep payment/webhook, book delivery, Sparks accounting, and overall general release gates **separate and open** until independent evidence is accepted.
3. **Reopen this narrow acceptance only** for a material regression affecting one of the six accepted areas, a role-permission change, a changed category/price model, or an explicit Owner instruction—not because a different subsystem has an outstanding gate.
4. Record future regression evidence against exact GitHub and deployed Cloudflare revision. A new technical source commit does not automatically repeal the Owner's historical sign-off; it may require a scoped regression.

## 5. Revision history

| Version | Date | Change | Approval / status |
| --- | --- | --- | --- |
| 1.0 | 2026-10-30 | Initial six-of-six Owner production acceptance attestation; mapped outstanding non-panel release gates and current risk boundaries | Owner statement recorded; limited functional scope ACCEPTED |

---

**Footer:** SMFGU-ADMIN-PRODUCTS-OWNER-ACCEPT-20261030 · v1.0 · Owner-attested functional acceptance; general paid-release gates remain independent.
