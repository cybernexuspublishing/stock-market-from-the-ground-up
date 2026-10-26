# LIVE Stripe $0 QA and All-Category Commerce — Evidence Log
**Document ID:** GU-COMMERCE-ZERO-LIVE-EVIDENCE-20261026
**Project:** The Stock Market: From the Ground Up
**Filename:** docs/releases/2026-10-26_LIVE_STRIPE_ZERO_AND_CATEGORY_QA_EVIDENCE_v1.md
**Type:** Markdown
**Version:** 1.0
**Prepared:** October 26, 2026
**Status:** PARTIAL VERIFIED READ-ONLY PROVIDER EVIDENCE; GENERAL LIVE LAUNCH HELD
**Google Drive location / file ID:** Not assigned; no Google Drive file created
**Purpose:** Give Owner an auditable status of the no-money Stripe LIVE smoke test, provider/DB reconciliation and release blockers.
**Dependencies:** Stripe LIVE acct_1OxhOiJL0O4GGVBH; production Supabase oxihglyfgzywsupnyicb; Cloudflare Pages stock-market-from-the-ground-up-d1r.pages.dev; GitHub main, checkout and signed webhooks.

## Stripe $0 QA
- A separate LIVE Checkout Session was created via Stripe with type payment, amount_total=0 USD, no PaymentIntent, no subscription, and diagnostic metadata indicating no member entitlement. Status was OPEN on final read: completing checkout is an interactive Owner step, not an action performed through the read-only verification. No funds moved.
- Historical Stripe LIVE showed THREE separately completed Checkout Sessions carrying GU72 zero-monthly QA metadata; each total was $0, status COMPLETE and no PaymentIntent or subscription. Stripe classic checkout.session.completed events existed for all three with pending_webhooks=0; that field does NOT prove the correct endpoint acknowledged each event.
- Supabase user_plan_grants showed TWO historical matching GU72 session references: one active, one canceled. A third completed $0 session had no matching row in that narrow ledger query; root cause and replay/reconciliation require further investigation.
- This proves the LIVE Stripe provider supports free orders and some historical zero-entitlement grants. It does not verify the fresh session's completion, paid charge processing, recurring invoices, taxes, refunds or new category fulfillment.

## Critical webhook deployment finding
- LIVE Stripe had four webhook endpoint records at audit. GU58 and F600 endpoints targeting the current production d1r.pages.dev domain were DISABLED.
- One old GU58 endpoint targeting stock-market-from-the-ground-up.pages.dev was ENABLED; another founder endpoint for stock-market-from-the-ground-up-lives.pages.dev was disabled.
- Do not enable paid checkout before reconciling endpoint destination, event subscriptions, HMAC signing-secret parity and signed webhook returns on the actual production domain.
- Cloudflare Production had GU_PAYMENT_LIVE_LAUNCH_APPROVED, GU58_LIVE_CHECKOUT_ENABLED, GU58_LIVE_WEBHOOK_ENABLED, GU_F600_LIVE_CHECKOUT_ENABLED and GU_F600_LIVE_WEBHOOK_ENABLED set to false; GU71_ZERO_LIVE_QA_ENABLED was missing. A non-money QA-only configuration update attempt was blocked by tool safety controls and was not performed.
- The existing Owner-only GU71 zero-dollar QA handler verifies actual zero Price and product, requires Owner role plus password step-up, and is protected by its own OFF-by-default switch. Independent Stripe-created sessions do NOT validate that website handler.

## Product catalog and checkout
- The LIVE account contained 55 Stripe Products, all ACTIVE after Owner-requested activation.
- Stripe LIVE contained 14 Prices, all ACTIVE after activation of the three existing Crownlight Sparks one-time prices. The 14 comprise 8 standard paid SKUs, 2 Founding plans, 3 Sparks purchases, and 1 $0 diagnostic item; they do NOT represent prices for all 55 Products.
- Founding Extended Stripe metadata and description were corrected from 20% to approved 15%; no subscription Price or billing term was changed.
- The Supabase Store had 60 canonical presentation faces, 0 sale_ready=true at audit; six included capability faces are not independently paid merchandise.
- Four standard paid memberships and four paid tools use GU58 checkout; two Founding plans use F600. No verified generic signed fulfillment exists for Sparks purchases, books, Boot Camps or unreleased tool SKUs. Digital asset inventory was 0.
- The Owner payment-catalog API was extended to report all-category visibility, mapped provider controls and fail-closed blockers without initiating any purchase. A dedicated no-money role and category regression was added to membership CI. Membership and Stripe Catalog Contract passed at commit a08fc41d05995784cd3f1e8f08794394f12553cb (run 40385347456); Admin Payment Center also passed on that same commit (run 40385347488) after an earlier fixture failure was corrected. Subsequent commits and full end-to-end production acceptance remain separate and unverified.

## Legal policy release
- Published Supabase legal_documents remained ten v1.1 policies at review.
- Ten corresponding v2 proposed replacement policies and four specialized addenda were added under docs/legal/drafts. They are DRAFT, not deployed public policy and not reviewed by licensed counsel.
- The under-$500 no-discretionary-refund rule is qualified by mandatory fraud/error/non-delivery/legal/network/Stripe exceptions. Operator or attorney cannot eliminate consumer rights with a final-sale label.
- Coordinate legal sign-off and acceptance evidence, not retroactive contract changes.

## Acceptance tests required
1. Finish the designated isolated $0 hosted Checkout with actual Owner interaction, then retrieve session and confirm payment_status=paid, status=complete, amount_total=0, payment_intent=null, subscription=null.
2. Correlate checkout.session.completed in Stripe to the active webhook destination and signature verification; require idempotent response plus expected ledger event and no unauthorized entitlements.
3. Verify duplicate events, replay/timestamp rejection, malformed request, out-of-order events, unrelated-SKU isolation, retries and reconciliation.
4. For every paid SKU, verify existing consent, Price currency/amount/interval, account eligibility, active fulfillment, proper refunds and cancellations in Stripe TEST/sandbox; do not use $0 checkout as proof of paid settlement.
5. Resolve third historical zero-order mismatch and the existing two QA grants without mutating real member entitlements unless attributable evidence warrants correction.
6. Validate legal entity/contact, pricing, taxes, transfer/distribution rights, proposed legal texts, identity acceptance logging, accessibility and all relevant exact-head CI.
7. Only then stage the LIVE checkout switches; preserve active webhooks for settling already-paid orders if new sales are halted.

## Status ledger
| Requirement | State |
| --- | --- |
| Stripe all products active | VERIFIED |
| Stripe existing Prices active | VERIFIED |
| New $0 session created at no charge | VERIFIED |
| New $0 session completed | NOT COMPLETE |
| Historical $0 provider completion | VERIFIED (three sessions) |
| Historical $0 ledger reconciliation | PARTIAL / UNEXPLAINED THIRD |
| Current production signed webhooks ready | NO-GO — CORRECT ENDPOINT DISABLED |
| General paid checkout | NO-GO — fulfillment and legal gates pending |
| Legal document drafts | AUTHORED, NOT PUBLISHED OR ATTORNEY-REVIEWED |
| LIVE charge and refund testing | NOT PERFORMED |

**Change summary and rollback:** Product activation does not alter Price amount or member records; do not reverse blindly. If production commerce is later opened, immediately disable new-checkout flags on failure while preserving signed incoming event processing for already-paid orders. All production consumer rights and audit records must be preserved.

**Revision history:** 1.0, October 26, 2026, initial verified provider/database evidence. 
**Footer:** GU-COMMERCE-ZERO-LIVE-EVIDENCE-20261026 • v1.0 • Owner-controlled release • NOT LIVE-ACCEPTED.
