# Cyber Nexus — Combined Commerce / Personally Signed KDP Author Copies

| Document-control field | Value |
|---|---|
| Company / imprint | Cyber Nexus / Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up — Website |
| Document ID | GU-WEB-BE-20261015-011 |
| Filename | `BACKEND_PHASE_9_COMBINED_COMMERCE_v0.14.0.31.md` |
| File type | Markdown |
| Google Drive location | **Not assigned** — generated download is not automatically stored in Google Drive |
| Release | v0.14.0.31 |
| Status | **Staging candidate — not approved for production payments** |
| Created / revised | October 15, 2026 / October 15, 2026 |
| Source baseline | GitHub `main` `4fd986cdb470958e3080180f90dc3bdbbb2ae8b7` (v0.14.0.30) |
| Required dependencies | v0.14.0.28 OWNER guard, v0.14.0.29 signed/Lulu options, Supabase Auth, Cloudflare Pages Functions, Stripe Checkout + Tax, KDP published author copies |
| Purpose | Implement OWNER-controlled physical signed-book prices, Stripe checkout, verified payment event reconciliation, manual KDP fulfillment queue and shipping visibility without touching existing membership/digital ebook entitlements |

## 1. Controlling business decisions

**Owner-selected fulfillment:** Website-sold signed paperback and hardcover editions will be ordered from Amazon KDP as **author copies** to the Owner, personally signed, packaged and reshipped to the buyer. Do **not** programmatically order KDP copies or use KDP proof copies for resale. Lulu Direct remains a separate independent Enable/Disable alternative for ordinary unsigned print-on-demand purchases.

**Existing digital rules preserved:** On-site digital ebook sales and private downloads are implemented under v0.14.0.30, but remain gated per title by actual KDP Select exclusivity end, OWNER rights attestation, private file, verified paid digital order and explicit sales/download controls. A signed paper order does **not** grant EPUB/PDF or a paid membership entitlement.

**Activation is strictly opt-in:** New `commerce.signed_books_checkout_enabled` is inserted `false`. Cloudflare `ENABLE_SIGNED_BOOK_STRIPE` and `STRIPE_SIGNED_TAX_ENABLED` must **both** be `true` for any signed-book quote or purchase to be available. No new production Stripe secret or webhook configuration is included in this release.

## 2. Verified project state before preparing v0.14.0.31

The v0.14.0.30 source commit passed 10 of 12 GitHub Actions workflows. **Backend Contract v0.14.0.28 and v0.14.0.29 failed** in the old `tests/test_v014028_commerce_api.mjs`, because its mock did not implement the additional v0.14.0.30 rights RPC `gu_digital_offer_status_v01430`. The test has been fixed to mock both **allowed** and **blocked** rights without weakening production checkout. The v0.14.0.30 digital migration's 15 catalog/permission checks passed in the Owner-uploaded SQL CSV. Database object existence does not establish final live storefront/payment acceptance.

### Database and authorization

New independent tables: `gu_signed_book_offers_v01431` (per-title/edition price, shipping, sale switch), `gu_signed_book_orders_v01431` (buyer-linked payment and KDP fulfillment), `gu_signed_stripe_events_v01431` (unique Stripe event IDs). RLS enabled; no direct `anon`/`authenticated` table privileges. Browser access occurs only through scoped PostgreSQL functions.

PostgreSQL RPCs include authenticated member order creation, OWNER-AAL2 price changes and paid-order management, Stripe service-role-only session reconciliation and refund/chargeback changes, and customer-only paid-order history. Order creation uses server-stored prices and edition flags. OWNER fulfillment transitions are sequential, row-locked, optimistic and audited: `not_started → ordered_from_kdp → received_by_author → signed → packed → shipped → delivered`. Owner hold/resume prevents shipping disputed work. Client-supplied amount is never trusted.

### Cloudflare Pages Functions

- `POST /api/signed-book-checkout?action=create` — authenticates Supabase member, begins a scoped pending order, creates a **Stripe-hosted** payment session from database prices, collects an **US-only** delivery address with Stripe, requires Stripe Tax and a configured delivery fee, and attaches session identifier.
- `GET /api/signed-book-checkout?action=quote&code=...&edition=...` — read-only pricing with combined server and database activation gate; it never charges or creates an order.
- `POST /api/signed-book-stripe-webhook` — validates Stripe HMAC over exact raw bytes with timestamp tolerance; checks environment, payment status, currency, subtotal, configured shipping and order/session linkage. Applies paid order in one database transaction, idempotent by Stripe event ID. Handles Stripe card refund and new dispute event, **but complete refund/dispute resolution processes still require manual validation**.
- `GET /api/signed-book-owner-detail?id=...` — authenticated OWNER/AAL2 only. Reads shipping recipient/address **on demand** from Stripe *after confirmed payment*; postal addresses are not copied into Supabase order records and are never returned to ordinary members.

The webhook **never** grants digital access, updates `site_orders` or bypasses Lemon Squeezy's existing separate membership/ebook payment flows. New signed order history is displayed in a separate section of `My Purchases` and reconciled via `gu_signed_book_orders_v01431`.

### Frontend

The existing Admin → Commerce adds an OWNER price/shipping/toggle editor, global signed-checkout master control, paid order queue, on-demand recipient details and sequential KDP/signature/tracking workflow. The Store adds buy buttons only for backend-enabled formats. Customers must check terms before creating Stripe Checkout. The previous v0.14.0.28/29 Lulu and signed availability notes are updated to avoid contradictory language when signed checkout eventually becomes active.

## 3. Required Stripe and publishing configuration

1. Create and verify the company's Stripe account and payout identity. Obtain restricted access to the actual account's `STRIPE_SECRET_KEY`; add it only as a **Cloudflare secret**, never to `config.js`, a file, commit or a screenshot.
2. Configure a dedicated Stripe webhook endpoint: `https://<public-domain>/api/signed-book-stripe-webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`. Store `STRIPE_SIGNED_WEBHOOK_SECRET` as a Cloudflare secret. Do not accept an unsigned event; verify using Stripe test mode first.
3. Configure Stripe Tax and applicable registrations. `STRIPE_SIGNED_TAX_ENABLED=true` declares that Stripe Tax is operational; it is not a substitute for licensed tax review. Set `STRIPE_SIGNED_TEST_MODE=true` in test and `false` in approved live production. Do not share test and live webhook secrets.
4. Set `PUBLIC_SITE_URL` to the canonical HTTPS site origin. Review privacy/Terms/return-shipping notice, seller contact information, and FTC shipping promises for KDP-to-Owner-to-customer delivery. Physical orders require adequate chargeback, returns/refund and consumer-law processes.
5. Import v31 staging SQL only after examining existing table layouts/grants and creating a backup. Confirm postflight, role-negative tests and actual sandbox payments. Set per-format signed retail prices and US handling/shipping only after a true author-copy cost estimate plus your signature/packing/shipping margin.
6. Manually enable database `commerce.signed_books_checkout_enabled` **through the new OWNER UI**, and Cloudflare `ENABLE_SIGNED_BOOK_STRIPE=true`, only **after** tests and legal review. To halt, switch off either; do not manipulate orders or refund records manually.
7. Place an actual KDP author-copy test order from a published print book, sign, pack, ship to a consenting tester, verify handling times, shipment tracking and customer communications. Print ISBN/cover proofing is outside this release.

## 4. Readiness and known limits

| Gate | Release result | Required production proof |
|---|---|---|
| GitHub mock test regression | Fixed source | All required workflows green **on the new v31 SHA** |
| Payment amount/edition | Protected through RPC and Stripe Checkout | Stripe sandbox subtotal, shipping, tax, rejected tampering |
| Webhook HMAC/idempotency/refund | Implemented and locally mocked | Real test webhook replay, invalid signature, refund and dispute statuses |
| Shipping address privacy | Provider-only collection, OWNER-only detail | Actual Stripe checkout address, ordinary member denial, correct privacy policy |
| Admin KDP queue | Implemented as audited state machine | OWNER AAL2 allowed, other roles blocked, stale updates rejected |
| Signed author-copy completion | Workflow implemented | Real KDP author copy ordered, signed and separately shipped |
| Signed checkout configuration | Default OFF | Stripe provider keys, taxes, refund terms and explicit Owner signoff |
| Existing ebook/membership commerce | Untouched source contracts | Separate Lemon Squeezy webhook/rights/refund E2E |
| Market Commons/moderation | Existing files preserved | Role/notification/report-policy E2E still outstanding |
| Trading labs/simulator/journal/tutor | Existing files preserved | Historical no-lookahead, paid entitlements, privacy and live market licenses outstanding |
| Branch protection | Baseline `main` showed `protected=false` | Required checks and deployment controls established |

## 5. Risks and limitations requiring decisions or specialized review

- **Consumer delivery promises:** KDP author copies shipped to the Owner and then to the buyer make fulfillment slower and incur two shipping legs. Do not advertise guaranteed ship dates until author-copy production, packing and mail transit have been tested. Orders that miss promised shipment periods may require customer notice, consent to delay or prompt refunds under applicable law.
- **Taxes:** Stripe Tax helps calculate taxes but does not itself establish registrations, nexus, filing or legal compliance. Confirm the correct selling entity and regional requirements before switching payment on.
- **Shipping details:** Addresses stay with Stripe, which minimizes local exposure. OWNER must verify each recipient and address before fulfilling; no automated KDP integration exists. Manual transcription creates operational error risks; confirm address before shipping.
- **Refunds/chargebacks:** A charge refund or dispute holds commerce state even if a physical book has already shipped. Business processes for return merchandise authorization, dispute response, seller liability and partial refunds require acceptance before live activation.
- **Accounting:** Stripe signed print orders use a separate ledger, not the prior Lemon Squeezy `site_orders` tables. Reconcile financial exports by processor and date, and eventually consolidate finance reporting without co-mingling entitlement grants.
- **Sitewide:** No claim that the whole 731-file repository has passed a line-by-line security audit; this release addressed confirmed CI defects and reviewed affected commerce contracts. Overall frontend/backend, forum, all labs, mobile accessibility and operational acceptance remain independent release gates.

## 6. Rollback and deployment boundaries

This package consists of **complete files at matching GitHub paths**. Preserve unrelated repository assets. New migration is additive and **must not auto-apply**. Do not drop the new order/audit tables to roll back a checkout deployment; instead disable `ENABLE_SIGNED_BOOK_STRIPE` and the site setting, reconcile pending/paid orders, then revert source code only after records are accounted for.

GitHub Action checks are meaningful but cannot prove Supabase production RLS, Stripe tax calculations, signed-in role boundaries, Cloudflare release SHA, or actual KDP purchases. Never call a release payment-ready based solely on an object-existence query.

### Revision history

| Revision | Date | Authoring purpose | Status |
|---|---|---|---|
| 1 | October 15, 2026 | Combined Stripe/KDP print purchase implementation and targeted GitHub CI repair | Staging candidate |

**Footer — GU-WEB-BE-20261015-011 • v0.14.0.31 • Controlled source candidate • Not legal, tax, or payment-provider certification.**
