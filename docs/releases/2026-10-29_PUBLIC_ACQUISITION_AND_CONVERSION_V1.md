# Public Acquisition & Conversion V1 — Coordinated Release Record

## Document Control

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up — Website |
| Document ID | SMFGU-WEB-ACQUISITION-20261029-001 |
| Filename | `2026-10-29_PUBLIC_ACQUISITION_AND_CONVERSION_V1.md` |
| File type | Markdown (.md) |
| Version | 1.0 |
| Date prepared | 2026-10-29 (America/Chicago) |
| Prepared for | Site Owner |
| Google Drive location | Not assigned; authoritative copy is GitHub `main` |
| Repository | `cybernexuspublishing/stock-market-from-the-ground-up` |
| Repository path | `docs/releases/2026-10-29_PUBLIC_ACQUISITION_AND_CONVERSION_V1.md` |
| Status | Source implemented; release and authenticated acceptance evidence must be confirmed independently |
| Purpose | Establish public organic discovery content and protected conversion paths without changing approved retail products or payment controls |
| Dependencies | GA4 property `561523001`; Search Console URL-prefix `https://stock-market-from-the-ground-up-d1r.pages.dev/`; existing Free Foundations member entitlement and authenticated course engine |

## Approved V1 scope — coordinated delivery

1. Publish five original public introductory study guides, without reproducing customer-book chapters, private grading keys, or unverified historical market datasets.
2. Each guide contains a fictional teaching example, a prerequisite-based explanation, limitations, checkpoint, and links to publicly available sample Labs and the member-gated Free Foundations program.
3. Include the guides in the public SEO allowlist, sitemap, unique canonical/description/title and the existing consent-first GA4 loader.
4. Insert visible, responsive links from Home, Learning, and Tools to all five guides, without creating tile-heavy navigation.
5. Add accurate JSON-LD Article markup to the five guide pages and WebSite/Organization markup to the homepage. Crown & Lantern Press is named as publisher/imprint, not invented as a verified legal entity, personal author, employer, or financial adviser.
6. Preserve current Free Foundations direct-route parameters (`program=free5` and `day`), privacy-sensitive authentication, server-side progress and entitlement checks.
7. Require an automatic static source regression check in `scripts/build-pages.sh` plus the extended 15-public-route SEO fixture.

## New public guide inventory

| Filename | Learning focus |
|---|---|
| `how-stock-market-works.html` | Shares, orders, brokers and trading venues |
| `how-to-read-candlestick-charts.html` | OHLC, wicks, sequences and volume limitations |
| `vwap-explained.html` | Price-volume weighting, session references and limitations |
| `bid-ask-spread-explained.html` | Quotes, spread and executable order risk |
| `stock-trading-risk-management.html` | Fictional position sizing, trade invalidation and no-trade decisions |

**Instructional controls:** Each guide must include clear fictional-example labeling, educational risk disclosure, accessible semantic markup, crosslinks and user-facing learning resources. The site must not label these examples as historical candlestick evidence, real market data, trading signals, or personalized financial advice.

## Privacy and tracking

- Keep the consent-first GA4 module `assets/js/ga4-consent-v1.js` intact.
- Do not include personal member journal entries, private lesson answers, email addresses, credentials, quote providers, or financial order details in analytics events.
- A click to Free Foundations is interest, not proof of login, enrollment, exercise completion or paid purchase.
- Verified `purchase` conversion work remains a separate payment-provider reconciliation gate; this release does not initiate any LIVE charges, issue credits, mutate Stripe, or change memberships.
- Existing daily Windsor.ai GA4/Search Console monitoring continues. Reports with no returned rows are not proof of zero visitors or zero indexed pages.

## Acceptance matrix

| Area | V1 source expectation | Acceptance requirement |
|---|---|---|
| Public content | Five original files exist | Source tests pass; editorial accuracy review remains separate |
| Discovery | Home, Learning and Tools link to all five files | Source tests pass; real responsive browser checks desirable |
| Indexability | 15 allowlisted public URL entries | Cloudflare production build and deployed sitemap inspection |
| Metadata | Unique titles, descriptions and canonical URL per page | Build fixture and live fetch |
| Schema | WebSite/Organization homepage and Article guides | JSON parse tests; Google processing remains independent |
| Privacy | Public consent and private noindex behavior preserved | Source/build tests and authenticated browser checks |
| Free Foundations | Existing `free5` and deep links untouched | Real signed-in member route, five-lesson loading and persistence must be tested; source checks alone are not acceptance |
| Commerce | No checkout and no payments modified | Signed-fulfillment purchase reporting remains pending |
| Mobile | Responsive lesson and link layout | Source responsive checks; actual 390px/900px browser QA still recommended |
| Analytics and indexing | GA4 and Search Console connected | Live consented event receipts and indexed page reports must be verified through Google; no guarantee of rankings |

## Release caveats

- This document does not assert that Google indexed the new pages, selected their canonical URLs, or granted rich search features.
- The user requested a single coordinated release, not five separate approvals; the implementation intentionally treats SEO content and navigation as one integration.
- Historical chart source approval and genuine authenticated learning QA remain independent release gates.
- Cloudflare production is the connected Yahoo account project `stock-market-from-the-ground-up` at `stock-market-from-the-ground-up-d1r.pages.dev`. Old LIVES migration handoff notes are archived context, not authority to silently change this verified deployment target.
- No assertion of legal compliance or independent market-data verification is made.

## Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-29 | Five public guides, linked discovery navigation, build-time metadata/schema, sitemap and source checks | Source delivery; deployment acceptance pending |
