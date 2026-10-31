# Direct Paid Sponsorships — Operational and Billing Control Record

| Document control | Value |
|---|---|
| Document ID | SMFGU-ADS-DIRECT-001 |
| Project | The Stock Market: From the Ground Up |
| Filename | 2026-10-30_DIRECT_PAID_SPONSORSHIPS_V1.md |
| File type | Markdown source (.md) |
| Google Drive location | Not created / not assigned; canonical source is GitHub main |
| Repository location | docs/releases/2026-10-30_DIRECT_PAID_SPONSORSHIPS_V1.md |
| Version | 1.0 |
| Status | Implemented in main; staged customer-payment acceptance outstanding |
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

## Revision history

| Version | Date | Summary | Status |
|---|---|---|---|
| 1.0 | 2026-10-30 | Quote intake, reviewed advertiser/campaign, Owner LIVE invoice issuing, test coverage, separated paid display release | Implemented, payment acceptance pending |
