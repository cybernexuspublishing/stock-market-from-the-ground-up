# TradingView Affiliate and Page Advertising Visibility — Implementation Record

| Control | Value |
|---|---|
| Document ID | SMFGU-ADS-TRADINGVIEW-001 |
| Project | The Stock Market: From the Ground Up |
| Owner | Crown & Lantern Press / SMFGU Website |
| File type | Markdown (.md) |
| Filename | 2026-10-30_TRADINGVIEW_AFFILIATE_PAGE_VISIBILITY_v1.md |
| Google Drive location | Unassigned — GitHub repository main is controlling source |
| Version | 1.0 |
| Date | 2026-10-30 (America/Chicago) |
| Status | Source implemented; full live browser acceptance pending |
| Dependencies | Owner JWT; existing Supabase ad_placements and plan_ad_policies; Cloudflare Pages; existing ad-slot endpoint |
| Purpose | Govern affiliate artwork and allow disabling all page ad placements without authorizing paid billing |

## Recorded partner and inventory

- TradingView partner program referral ID: `1173728`.
- Affiliate destination is the Owner-provided URL, with `aff_sub=smfgu_website` and the canonical Pages source.
- Live Supabase records: Advertiser #3 (active affiliate partner); Campaign #3 (draft, `amount_cents=0`, `payment_state=unpaid`, `approval_state=pending`); Creative #3 (draft with supplied official 728x90 image and tracked destination).
- Placement `KNOWLEDGE_TRADINGVIEW` is configured for `/knowledge-database.html` and managed with the other placement codes. The existing first-party banner is separate from the paid-campaign serving path. Ad-free policies remain effective.
- No real-money sponsorship invoice, checkout, entitlement adjustment, revenue estimate, or Stripe operation was created.
- Partner contact email was not invented. The partner is explicitly classified as affiliate/commission-based rather than a cash-prepaid sponsor.

## Admin page visibility design

- Admin → Website Management → Advertising Sales → **Page advertising visibility**.
- The Owner sees pages with the count of enabled placements; an indeterminate checkbox means mixed individual settings.
- Disabling a page toggles **all** its configured placement codes off through a single Owner-authorized API mutation. A page enable switches all of that page’s placements on (does not restore individual prior choices).
- Individual placement toggles and carousel preferences are preserved as secondary controls.
- A page toggle changes `ad_placements.active` only. No campaign approval, payment flags, Stripe state, invoice evidence, or global release gate is modified.
- Existing paid/house placements are hidden by the server when inactive; the Knowledge Database direct banner is initially hidden and becomes visible only after server eligibility. Owner preview remains layout-only.
- An unavailable visibility endpoint fails closed rather than showing the banner. The former sentence-length commission notice has been removed. Owner directed removal of the visible `Paid link` label without replacing it; financial-promotion disclosure review remains outstanding.

## Security and testing

- `/api/ad-sales` protects page bulk mutations through existing Owner JWT checks and same-origin restrictions, validates page patterns against real database placements, verifies updated counts, and audits the change.
- `/api/ad-slot` verifies the known route, active database placement, member ad-free conditions, and policy eligibility. Its paid-campaign invoice and release gates remain unchanged.
- Regression coverage: `tests/test_ad_page_controls_and_tradingview_v1.mjs`, `tests/test_knowledge_database_store_v1.mjs`; CI gate: `ad-sales-acceptance-v014231.yml`.
- Dynamic partner banner uses no third-party JavaScript or tracking pixel.
- **Outstanding acceptance:** Confirm actual Owner/Free/Lifetime page visibility in authenticated browser sessions; verify the exact production deployment; test disable/re-enable on each page and mobile layout. Do not report a full browser pass before completion.

## Data and source parity

The specified partner rows and placement were directly created in the live SMFGU Supabase project. A future environment provision/recovery must apply an idempotent copy of these configuration records and reattach the approved banner asset. Do not infer that this live data was also added to Supabase migrations.

## Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-30 | Partner records, original media, Owner page controls, disclosure change, and tests | Implemented; browser QA pending |
