# Direct Paid Sponsorships — Operational and Billing Control Record

| Document control | Value |
|---|---|
| Document ID | SMFGU-ADS-DIRECT-001 |
| Project | The Stock Market: From the Ground Up |
| Filename | 2026-10-30_DIRECT_PAID_SPONSORSHIPS_V1.md |
| File type | Markdown source (.md) |
| Google Drive location | Not created / not assigned; canonical source is GitHub main |
| Repository location | docs/releases/2026-10-30_DIRECT_PAID_SPONSORSHIPS_V1.md |
| Version | 1.2 |
| Status | Owner browser PASS; actual Stripe TEST payment and signed refund event PASS; genuine LIVE sponsor payment and signed LIVE settlement pending |
| Decision date | October 30, 2026 (America/Chicago) |
| Implementation timestamp | October 30–31, 2026 UTC |
| Dependencies | Cloudflare Pages Functions; Supabase; Stripe LIVE (stock-market merchant only); sitewide Owner authentication; Turnstile |
| Purpose | Configure quote-led direct sponsorship sales and isolated, Owner-issued Stripe invoices without compromising affiliate or member experiences |

## Approved V1 scope

1. Public `/advertise`: business inquiries for Site, Section, and Educational Resource Sponsorships with Turnstile; all three packages remain custom quote. No invented prices, automatic checkout, guaranteed impressions, or upfront charge.
2. Owner Admin `/admin-advertising`: retain advertiser intake, qualify an advertiser, prepare negotiated fixed-amount contract, choose approved advertising placement, review creative/destination, approve campaign, issue one LIVE Stripe-hosted invoice, independently verify successful payment, and separately release delivery.
3. Stripe invoicing uses the verified stock-market LIVE merchant, not MommaBee or Stripe TEST. Customer and invoice creation use stable per-campaign idempotency keys. The Owner must attest the written agreement and authorized recipient before the invoice can be sent.
4. Payment by the advertiser occurs on Stripe's hosted invoice page; the website does not collect credit card numbers. The published ad pipeline requires a settled, unrefunded LIVE payment, Owner-approved creative, valid dates and explicit display activation.
5. TradingView is an independent affiliate campaign and stays active on its configured eligible public placements. Never convert its $0 arrangement to a paid sponsor, paid invoice, or billable CPM event.
6. Admin switches are separate: accepting inquiries, enabling invoice billing and enabling paid campaign delivery. Enabling billing does not release ads. Actual customer invoice email requires a separate Owner click.

## LIVE configuration confirmed at implementation

- Existing three sponsorship products remain custom-quote, no public fixed prices.
- Invoices require a mutually approved amount of at least $1 USD; no set retail rate is assumed.
- `accepting_inquiries=true`; `accepting_payments=true`; `ad_delivery_enabled=false`. The last remains disabled until actual authenticated payment, refund/reversal, and deployment acceptance is complete.
- Stripe LIVE merchant ID was independently matched to the website's production Cloudflare variable without exposing the secret key.
- No external advertiser has been invoiced, no LIVE amount charged, and no real campaign has been published.

## Campaign processing and controls

1. Prospect submits Turnstile-secured inquiry or emails the advertising contact.
2. Owner verifies advertiser identity, website, intended audience, campaign content and suitability under applicable financial-promotion standards.
3. Owner and advertiser approve written terms: inventory/placement, dates, flat total, invoicing party, cancellation/refund rules, editorial rights, delivery commitments, metrics and dispute procedure.
4. Owner creates the advertiser and campaign, chooses `SITE_SPONSOR`, `SECTION_SPONSOR`, or `RESOURCE_SPONSOR`, then reviews creatives. Approved creatives and campaign are required separately.
5. Owner explicitly confirms terms and payment contact and clicks **Create & email LIVE Stripe invoice**. Stripe creates a `send_invoice` invoice with campaign and advertiser IDs embedded in metadata. No card is charged by sending the invoice.
6. Invoice status and settled PaymentIntent/charge are verified through LIVE Stripe API; no simulated success or manually marked paid status is accepted.
7. Owner separately turns on paid sponsor delivery and publishes the campaign only when evidence, dates, creative, and placement conditions pass.
8. Pausing/withdrawing a campaign remains possible from Admin. Refund/dispute event automation is not yet certified, therefore keep the global paid-delivery switch OFF until those lifecycle controls are independently accepted.

## Technical and privacy safeguards

- Mutations use Owner JWT validation, same-origin CSRF guard and first-party server secrets.
- Advertiser contact details and hosted invoice links remain private to the Owner Admin.
- Invoices are idempotent per campaign and bound to one approved amount and verified LIVE merchant; reissued attempts fail when campaign metadata no longer matches.
- A draft invoice is recorded before finalization and customer email so interrupted requests can be recovered without creating duplicate invoices.
- Stripe payment reconciliation is activated only after the invoice has been expressly sent.
- No student grading, Market Tutor decisions, Chart Studio, books, storefront entitlements, paid memberships or first-party product ranking are changed.
- No fake sponsor impressions are recorded. Separate advertising policy and FTC disclosure review remains necessary.
- No new paid third-party infrastructure is introduced beyond existing Stripe processing if a future advertiser actually pays.

## Limitations and outstanding acceptance

- No actual advertiser, invoice payment or refund/dispute end-to-end acceptance has been performed. A simulated invoice lifecycle and source tests are not substitutes for those checks.
- Public quote form and LIVE invoice issuing are configured; a public instant-pay catalog is intentionally not offered because sponsor rates, placements and contract terms are negotiated.
- No direct ad is authorized to display until the Owner confirms independent LIVE payment, verifies any refund and compliance requirements, and activates the separate paid delivery control.
- Counsel review recommended for advertising contract terms, deceptive financial promotions, FTC sponsorship disclosure, data use and tax obligations.
- Verify authenticated Owner Admin in production, one authorized TEST invoice lifecycle with a simulated identity, real-browser presentation and Stripe email delivery before final commercial sign-off.
- If no approved customer or rate exists, do not manufacture an acceptance record or misrepresent a test as an actual sale.

## Source dependencies

- `functions/api/ad-sales.js`
- `functions/_lib/paid-sponsor-invoicing-v1.js`
- `assets/js/admin-ad-sales-v014228.js`
- `admin-advertising.html`
- `advertise.html`
- `supabase/migrations/20261030_direct_paid_sponsorship_invoice_v1.sql`
- `supabase/migrations/20261030_direct_paid_sponsorship_invoice_url_regex_fix.sql`
- `tests/test_direct_paid_sponsor_invoices_v1.mjs`

## October 30/31 acceptance continuation (V1.1)

**Evidence classification — real provider vs isolated simulation**

- Production paid sponsorship switches: inquiries = on, Owner LIVE invoice issuing = on, paid advertisement delivery = off. TradingView affiliate placement remains active.
- Stripe LIVE merchant verified: `acct_1OxhOiJL0O4GGVBH`. Enabled LIVE event destination `/api/stripe-live-webhook` was read directly from Stripe and subscribes to `invoice.paid`, `charge.refunded`, and `charge.dispute.created` alongside existing commerce lifecycle events. Endpoint presence is not proof of a successfully delivered advertising event.
- Actual Stripe TEST provider: synthetic noncommercial customer `cus_VXWqc22rOO43mC`; invoice `in_1UWRnKJY9FI7byHBqiS8OgLM`; `send_invoice`; one $1.00 USD test invoice line; finalized with `status=open`, total 100 cents, LIVE mode false, and genuine Stripe-hosted test invoice page. Invoice remains unpaid until a TEST card completes it; no email was sent.
- Stripe provider schema correction: current invoice objects use `status=paid`, `amount_paid`, `amount_remaining` rather than a `paid` boolean. Existing verification and signed webhook now use those fields. Current invoice PaymentIntent's `payment_details.order_reference` identifies its invoice even when charge/PaymentIntent lack historical `invoice` properties.
- Signed LIVE webhook routing now checks HMAC and account first; it independently retrieves invoice, invoice allocations, PaymentIntent and charge, binds the verified Stripe invoice/customer/amount to the Owner-approved campaign and records events in a service-only ledger. Validated refunds (including partial) and disputes pause campaign delivery. Untagged membership/book events retain the original routing.
- Database settlement, activation, refund pause, dispute pause, duplicate-event idempotency and non-regrant were exercised in explicit PostgreSQL transactions followed by `ROLLBACK`. No fake approved campaigns, event records, funds, or delivery switches survived.
- GitHub regression test `tests/test_direct_sponsor_signed_live_lifecycle_v1.mjs` tests signed webhook processing, invalid signature/account, underpayment, refund/dispute and unrelated-event classification with mocked provider objects. Passing source/provider-mock checks is not proof of genuine Stripe event delivery.

**Historical V1.1 blockers (superseded by V1.2 evidence below)**

1. TEST invoice must be paid with a genuine Stripe TEST card transaction, and provider-created PaymentIntent and charge confirmed; the available Stripe connector cannot invoke the invoice-pay endpoint. No real-money LIVE customer charge was attempted.
2. Confirm actual Stripe-origin signed TEST and LIVE advertising webhook deliveries are acknowledged by Cloudflare; synthetic signed HMAC events cannot substitute.
3. Verify full/partial refund and dispute transitions using actual Stripe TEST transaction events without enabling the shared LIVE/TEST switches unsafely; a genuine LIVE reversal is unavailable without a real advertiser contract/payment.
4. Authenticated Owner Admin browser E2E remains unverified: the available browser connector has no saved sign-in for the site and the metered browser wallet is not funded. Never simulate access using a fake user.
5. Final legal review of written advertising agreement, cancellation/refund terms, permitted financial promotions, and disclosures.
6. Leave `ad_delivery_enabled=false` pending signed real-provider and authenticated acceptance. Existing TradingView affiliate inventory stays separate.

**Files added**

- `functions/api/stripe-live-webhook-v01458.js` — signed LIVE ad event routing
- `supabase/migrations/20261030_paid_sponsor_signed_live_lifecycle_v1.sql` — RLS-protected, idempotent live event ledger and pause logic
- `tests/test_direct_sponsor_signed_live_lifecycle_v1.mjs` — regression evidence

## V1.2 acceptance evidence — October 30, 2026 (Central) / October 31 UTC

**Genuine Owner browser sign-in acceptance: PASSED.** The Owner's visible browser result was verified against production Supabase audit record `#7` with recorded UTC time `2026-10-31T03:17:19.94217+00:00`. The record includes `ownerIdentityVerified=true`, `uiChecksReported=true`, and `readonly=true`. No invoice or advertising charge was initiated. A separate free Playwright production regression established anonymous requests HTTP 401, signed-in Free QA HTTP 403, and protection of the Owner-only Admin controls. Test run: `https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41162044503`.

**Genuine Stripe TEST payment: PASSED.** TEST invoice `in_1UWRnKJY9FI7byHBqiS8OgLM` for USD $1.00 was paid, with a real TEST PaymentIntent `pi_3UWRnWJY9FI7byHB0k9jW899` and charge `ch_3UWRnWJY9FI7byHB07d9u8xa`. These are Stripe TEST API objects and created no real-money charge.

**Genuine provider-signed TEST sponsorship webhook: PASSED.** A $1.00 TEST-only refund `re_3UWRnWJY9FI7byHB0O5aXqvt` succeeded. Stripe's genuine `charge.refunded` event `evt_3UWRnWJY9FI7byHB0XHkPPGI` showed `pending_webhooks=0` after delivery. The unified signed Stripe TEST webhook acknowledged the event, independently retrieved its Stripe TEST invoice/PaymentIntent/charge, and persisted an isolated Supabase service-only ledger record (received `2026-10-31T03:32:32.906063+00:00`, amount_refunded_cents=100, source=`stripe_test_signed`, signature_checked=true, stripe_provider_checked=true). The event ID and invoice/charge IDs matched in both systems.

**Segregation controls:** All acceptance journal entries remain confined to `gu_ad_sponsor_test_webhook_acceptance_v1` with RLS and no direct or indirect access to LIVE sponsor payment state, entitlements, or ad delivery. The separate LIVE sponsor ledger `gu_ad_live_event_log_v1` remains empty and `ad_delivery_enabled=false`. TradingView affiliate inventory remains independent. Both free GitHub Advertising CI jobs passed on the TEST webhook change.

**Still outstanding for commercial sign-off:**

1. Obtain an actual advertiser and an authorized, written sponsorship quote with advertising terms, permitted creative and billing recipient. Existing sponsorship catalog remains custom-quote and no real paid advertiser campaign has been created.
2. Issue an Owner-approved LIVE Stripe invoice and receive genuine, nonzero advertiser settlement through Stripe. Verify the resulting live `invoice.paid` delivery, the bound campaign/advertiser/invoice metadata, and the service-only LIVE payment ledger before any publication. Stripe TEST evidence is not a substitute for this.
3. Confirm actual LIVE partial refund and dispute behavior when supported by real-world events, without manufacturing or charging a fictional sponsor. Maintain incident pause controls; signed-event simulations already passed regression tests.
4. Review advertising contract terms, commercial disclosures, financial-promotion rules and refund policy with appropriate legal expertise.
5. Keep paid sponsorship delivery OFF pending real financial/operational acceptance.

**New implementation dependencies:**

- `functions/_lib/ad-sponsor-test-webhook-acceptance-v1.js`
- `functions/api/stripe-test-webhook.js` (added isolated signed test event routing)
- `supabase/migrations/20261030_ad_sponsor_test_webhook_acceptance_v1.sql`
- `tests/test_ad_sponsor_genuine_test_webhook_v1.mjs`

## Revision history

| Version | Date | Summary | Status |
|---|---|---|---|
| 1.0 | 2026-10-30 | Quote intake, reviewed advertiser/campaign, Owner LIVE invoice issuing, test coverage, separated paid display release | Implemented, payment acceptance pending |
| 1.1 | 2026-10-30 | Signed LIVE lifecycle controls and initial simulated acceptance | Historical snapshot |
| 1.2 | 2026-10-30 | Genuine Owner browser and Stripe TEST payment/refund webhook acceptance verified independently; LIVE commercial sign-off open | TEST and Owner accepted, LIVE pending |
