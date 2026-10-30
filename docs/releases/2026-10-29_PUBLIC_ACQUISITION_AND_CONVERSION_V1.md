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


## Acceptance batch evidence — 2026-10-29 (America/Chicago)

**Combined scope:** Public discovery and responsive readiness; authenticated Free Foundations acceptance; GA4 event reporting; Google search discovery. Stripe financial verification remains an independent safety gate.

| Check | Evidence | Result |
|---|---|---|
| Cloudflare production release | Production deployment `eb9fa162-a0dd-4d2e-8896-34c913e314b8`, SHA `edd6ead0b627d1ae9d7b9f56f4d779411a4a8071`, all five deployment stages succeeded | Passed |
| 15 public pages | Cloudflare build log: `PASS public SEO: 15 unique titles/descriptions, canonicals, social tags, consent isolation, sitemap, protected noindex, rebuild` | Passed in build fixture, not independently browser-audited |
| New guides and navigation | Cloudflare build log: `PASS public acquisition V1: five public lessons, source links, risk disclosures, responsive layout and protected Free Academy deep links` | Passed in source tests |
| Opt-in Analytics rules | Cloudflare log: `PASS GA4: opt-in public intents, confirmed signup handoff, 15-minute expiry, no PII, no purchase fabrication` | Passed in source/fixture tests; live receipt pending |
| Free Foundations database | Read-only Supabase query on `gu_bootcamp_academy_enrollments_v014168`: 2 `free5` enrollment rows; on `gu_bootcamp_academy_progress_v014168`: 0 `free5` progress rows | Enrollment exists, persisted reflection acceptance not proven |
| Academy audit | `gu_bootcamp_academy_audit_v014295`: 2 `free5` `enrollment_created` events; no `free5` `day_started` or `reflection_updated` events in available data | No evidence that either account attempted a save |
| Access controls | Academy enrollment/progress tables have RLS enabled and no direct public table policies; server endpoint `functions/api/bootcamp-academy.js` uses account authorization and a private progress operation | Source+schema inspected; live signed-in requests not executed |
| GA4 reported metrics | Windsor.ai GA4 `561523001`: no returned rows for queried visits, users or events covering October 26–29 | Processing/no data; never interpreted as zero visitors |
| Search Console | Windsor.ai URL-prefix property: no returned search-performance or sitemap rows for available query | Processing/no data; indexing not verified |
| HTTP and mobile browser | External public fetch could not reliably retrieve the five new pages or sitemap; no mobile/desktop browser viewport acceptance performed in this pass | OPEN; no false HTTP or viewport success claim |
| Stripe | No LIVE/TEST payment requests or changes | Intentionally untouched |

**Release classification:** SOURCE/CI/DEPLOYMENT PASSED. Authentic mobile/desktop browser accessibility and interaction checks, Free Foundations authenticated saving, GA4 Realtime receipt, and direct Google indexing confirmation remain OPEN. Do not describe this release as fully end-to-end accepted.

**Interpretation:** A missing Free Foundations progress row is not a defect by itself: the two enrolled accounts may simply never have started or saved lessons. Genuine QA requires authorized member access, a new reflection save, a page reload, a second-account isolation check, and confirmation that the saved record belongs only to that test identity.

## Revision history addendum

| Version | Date | Change | Status |
|---|---|---|---|
| 1.1 | 2026-10-29 | Added production Cloudflare logs, aggregated Academy records, GA4/Search Console reporting check, and precise remaining browser/QA gates | Production build accepted; end-to-end acceptance pending |


## Production browser acceptance — 2026-10-29 local / 2026-10-30 UTC

**Exact real-browser evidence:**

- GitHub Actions workflow: `.github/workflows/public-acquisition-live-acceptance-v1.yml`; run `40991146258`.
- Anonymous production Chromium public-pages job: **PASS**, 30/30 checks, 15 source-whitelisted public routes at 390px and 1440px. Tested real HTTP responses, page headings and readable content, canonical tags, unique descriptions, source navigation links, mobile viewport, noindex exclusion and horizontal overflow. Log marker: `PRODUCTION_PUBLIC_15 {"checks":30,"passed":30,"failed":0}`.
- Genuine Free Foundations browser: run `40991590637`. Real QA sign-in and account-bound Supabase session verified. Private `free5` program GET returned five lessons. Day 1 opened through the production UI, an explicitly fictional ungraded reflection was saved through the UI, survived full browser reload, and was returned on a separate authenticated API GET. Unsigned private API GET was rejected. Log marker: `FREE5_PRODUCTION_QA {"checks":6,"blocked":1,"failed":0,"complete":false}`.
- Independent Supabase read-only verification: `gu_bootcamp_academy_progress_v014168` contains one `free5` row with `status='reflection_saved'` following the UI acceptance run, timestamp `2026-10-30 02:26:30.776559+00`.
- Genuine **second-member isolation** is the single open gate within this two-item acceptance batch: the test requires a second existing noncommercial QA account in GitHub Secrets `LAB_QA_SECOND_EMAIL` and `LAB_QA_SECOND_PASSWORD`. Anonymous rejection and server RLS/API ownership checks are not equivalent to a second real member session. Do not claim 100% authentication-isolation acceptance.
- A previous live QA run encountered a case-sensitive heading assertion (`Lesson 1 of 5` vs displayed `LESSON 1 OF 5`); that test-only mismatch was corrected. The latest script safely recognizes the previously saved fictional QA reflection on subsequent runs instead of overwriting member data.
- No paid Stripe transactions, book entitlements, mastery awards, other members' reflections, or privileged provider credentials were modified.

**Current classification:** Public-page desktop/mobile acceptance **PASSED**; Free Foundations authenticated Day 1 save/reload **PASSED**; anonymous privacy denial **PASSED**; second-member isolation **PENDING NONCOMMERCIAL QA IDENTITY**.

## Revision history addendum — production browser

| Version | Date | Change | Status |
|---|---|---|---|
| 1.2 | 2026-10-29 | Verified 30/30 live public browser checks, actual QA Day 1 save/reload, Supabase persistence and anonymous denial; separated unavailable second-account isolation | Public browser and progress accepted; full member isolation open |
