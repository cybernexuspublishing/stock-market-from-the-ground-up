# The Stock Market: From the Ground Up — Shared Learning Engine Reference

## Document control

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up (unified books + website workstreams) |
| Company / imprint | Cyber Nexus / Crown & Lantern Press |
| Filename | `Shared_Lab_Engine_Reference_v3_2.zip` |
| File type | ZIP source package containing HTML, CSS, ES modules, tests, and screenshots |
| Reference prototype | `Preview_Standalone.html` — self-contained HTML |
| Version | Reference v3.2.0 (NOT a production website version) |
| Status | Developer reference prototypes built and smoke-tested; Owner visual/functional acceptance PENDING |
| Created | October 23, 2026 |
| GitHub repository | `cybernexuspublishing/stock-market-from-the-ground-up` — source inspected; NOT modified |
| Google Drive location | Not assigned; new Drive file required only if Owner authorizes storage |
| Google Drive document ID | Not assigned / not created |
| Purpose | Validate one shared learning framework through Candlestick and VWAP reference Labs before integration with canonical 419-Lab system |
| Dependencies | Browser (standalone preview); Node.js 22 for unit tests; Python + Playwright + Chromium for browser smoke tests |

## Open and test immediately

Open **`Preview_Standalone.html`** in a browser. It is self-contained and does not require a development server, account, API keys, Supabase access, Stripe, or paid hosting.

The page has a **Select reference Lab** dropdown at the top. Choose either:

* **Candlestick Construction:** OHLC chart, price-level labels, side-panel reference, interactive close slider, independent calculations, three-stage practice, credit confirmations, assessment, retry, and unfamiliar candle transfer.
* **VWAP + Replay:** introductory symbols and worked example, interactive volume slider, price×volume calculation, independent assessment, free retry, and chronological candle-by-candle VWAP replay with two synthetic scenarios.

For code integration and editing use `src/engine.mjs`, `src/labs.mjs`, `src/app.mjs`, `src/styles.css` and `index.html`. The standalone file embeds their current content as an independent preview.

## Testing

```bash
npm test
python3 tests/browser_smoke.py
python3 tests/browser_modes.py
```

The unit tests check: OHLC integrity, candle body/range percentages, VWAP arithmetic, running VWAP using previously revealed candles only, descriptive VWAP labels, 60-day included-credit rollover, credit expiry, and spending included credits before purchased credits.

The Playwright smoke tests operate the prototype in Chromium through the bundled standalone HTML. They check both Labs' instructional-to-results journeys, corrected answers, multiple-choice assistance, credit confirmation placement, independent grading, new-case assessment retry, replay correction without advancing, classification and decision locking, and completed VWAP replay. The mode test covers allowed changes under 33%, reset confirmation/cancellation, and locked selector behavior above 33%.

## Architecture decisions retained

1. **One framework, 419 existing canonical Lab IDs:** This source package demonstrates a reusable instructional framework, but is **not** a complete 419-Lab import or an alternate canonical catalog. Production content remains in the existing `lab-catalog.json` / `platform_labs` and individually approved private records.
2. **Thirty official competencies:** No new competency identifiers or mastery certificates were introduced.
3. **Deep teaching for every accessible Lab:** Definitions, symbols, where values originate, numbered steps, common misconceptions, interpretation, limitations, and a different worked example. `Explain This Concept` and `Teach This in More Depth` cost no credits.
4. **Credits are for convenience, not teaching:** Reveal/Skip uses one simulated Question Pass Credit and is marked Study Only/Not Assessed. Confirmation is directly above Reveal/Skip buttons. Purchased credits do not expire. Eligible included monthly credits expire **60 calendar days after their originating billing period ends**, without renewal extending earlier allocations. Spend the earliest expiring eligible included bucket before purchased buckets.
5. **Memberships do not imply universal replay rights:** The visible preview selector simulates access to included credits. The separate replay entitlement switch illustrates an independent authorization gate. Neither is production security.
6. **No-hindsight protocol:** The UI draws and describes only bars at or before the current replay index. The member submits VWAP classification, a hypothetical decision, and forecast before the next bar becomes available.
7. **Separate independent scoring:** Original assessment answers are immutable inside the attempted workflow; additional retries use different input data. In Guided mode, mistakes can be corrected for learning, while first-attempt unassisted correctness is separately reported.
8. **Fictional market data:** Nothing is represented as historical price verification or personalized investment advice. Replay VWAP uses **bar close × bar volume**, not tick-level trades or the typical-price approximation.

## Critical non-production limitations

* **Replay is not server-secure in this standalone file.** Full synthetic sessions and sample answers are visible in shipped JavaScript source. A production member could inspect them. Production must retrieve only authorized chronological bars from Cloudflare/Supabase and keep private rubrics, answers, and future values server-side.
* **No production persistence or payments.** All progress, wallet balances and entitlements are browser-memory demonstrations. Closing the page resets the demo. No real credits are charged.
* **No actual accessible-account entitlement verification.** The Free, Full, OnDemand and separate tool grant rules require connection to existing server-side access logic.
* **No actual 419-Lab release.** All 419 canonical Labs need individual editorial acceptance, data rights review, assessment acceptance and QA. Existing repository documentation expressly distinguishes catalog records from published, graded instruction.
* **No live deployment** and no Supabase SQL, Cloudflare secrets, or Stripe product modifications.
* **Quality gaps before production:** Content authoring/completeness for 419 Labs, reviewed competency mappings, protected assessment keys, idempotent durable credit ledger, renewal/cancellation handling, mobile accessibility audit, historical replay permissions, telemetry, localization as appropriate, and end-to-end release acceptance.

## Recommended production integration sequence (not performed)

1. Register the two reference configurations in a non-production feature flag, mapping them to existing canonical Lab IDs only after content-owner review.
2. Adapter layer for current `site-lab.html`, `assets/js/interactive-training.js`, and existing `platform_labs` / instructional metadata. Preserve published versions and the current 30 competencies.
3. Server-controlled streaming replay and assessment scoring: read one permitted bar at a time, bind event records to attempt IDs, and never send protected future bars or correct answer keys in advance.
4. Durable, atomic Question Pass Credit ledger with included monthly expiration buckets and purchased non-expiring buckets; authorization and concurrency checks.
5. Membership entitlement enforcement on the API, plus explicit replay right independent of basic Interactive Learning.
6. Playwright regression against existing website routes, product access, accessibility, mobile, migrations and rollbacks. Collect evidence of individual Lab editorial acceptance.
7. Owner signs off prototypes and deployment only after reviewing functional tests and the manual Cloudflare/Supabase change list.

## Revision history

| Version | Date | Status | Notes |
|---|---|---|---|
| v3.2.0 | 2026-10-23 | Reference prototype; Owner review required | Combined two reference subjects into one reusable engine; interactive replay, free teaching, optional credits, staged progress, fresh retries, browser and unit tests. |
