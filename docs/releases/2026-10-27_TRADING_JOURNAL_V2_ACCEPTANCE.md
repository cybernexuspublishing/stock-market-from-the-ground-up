# Trading Journal 2.0 — Controlled Upgrade and Acceptance Register

**Company:** Cyber Nexus · **Imprint:** Crown & Lantern Press  
**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-JOURNAL-V2-001  
**Filename / file type:** `docs/releases/2026-10-27_TRADING_JOURNAL_V2_ACCEPTANCE.md` / Markdown (.md)  
**Google Drive folder / Google Drive document ID:** Not assigned; GitHub `main` is controlling. Do not create an unapproved duplicate in Drive.  
**Version:** 2.0 · **Owner approval:** October 27, 2026 · **Release status:** Source implemented, deployment/CI and genuine member acceptance require independent evidence.  
**Purpose:** Correct V1 stage-mapping and stale closed-trade arithmetic; introduce a more useful educational risk budget, structured decision-process review and better privacy/concurrency behavior.
**Dependencies:** Existing `decision_journal` table, immutable `trade_plan_snapshots`, `journal_actual_history_v1`, private `journal_evidence_v1`, `journal_reviews`, Supabase member RLS, Cloudflare Pages and existing Free/premium entitlement contracts.

## Owner-controlled scope and invariants

1. Work on **the same GitHub `main`** and existing Yahoo-account Cloudflare Pages project. Do not create another website, branch, payment product, membership, journal table, paid analytics engine or third-party subscription.
2. Free member policy remains **15 new Journal records per UTC week**, including up to **10 saved browser simulator exercises**; reset Monday 00:00 UTC. Server enforcement remains authoritative.
3. Paid `JOURNAL_ANALYTICS` retains its separate private server authorization and existing price; V2 free process review does not expose premium net P&L, expectancy, drawdown, profit factor or strategy conclusions.
4. Pre-decision snapshots remain immutable. The risk-budget worksheet cannot change locked shares and no browser action executes a trade.
5. Live, paper, observation and historical Lab records retain distinct provenance. No simulated or self-reported trade creates a graded competency or broker-certified history.
6. **No LIVE Stripe payment of any amount** was initiated or authorized by this feature release; no LIVE payment/checkout settings changed.

## Version 2 deliverables

| File | Type | Role |
|---|---|---|
| `assets/js/journal-v2-logic.js` | JavaScript | Deterministic pure risk-budget and date-filtered process-review functions |
| `assets/js/journal-guided-v2.js` | JavaScript | Guided vs full-form workflow mapped by actual headings/IDs rather than incorrect V1 numerical section indexes |
| `assets/js/journal-weekly-v2.js` | JavaScript | Member-specific filters (1/4/12 UTC weeks, record type), count/mistake/no-trade summaries |
| `assets/css/journal-v2.css` | CSS | Responsive, compact, accessible V2 controls, risk cards and process summary |
| `journal-entry.html` / `journal.html` | HTML | V2 module/stylesheet activation; V1 duplicate controllers not mounted |
| `assets/js/journal-entry.js` | JavaScript | Postclosure recalculation, optimistic updated_at update and original closed timestamp retention |
| `tests/test_journal_v2.mjs` | Node test | Risk math, short side, invalid/blank values, as-of periods, setup/section source integrity and concurrency contract |
| `tests/test_journal_guided_integrity_v1.mjs` | Node test | Preserves V1 risk and evidence security regressions while accepting V2 module wiring |
| `scripts/build-pages.sh` | Shell | V2 test and JavaScript syntax checks block a production release if failing |
| `.github/workflows/market-analysis-v014146.yml` | GitHub Actions | Same V2 checks in existing market-analysis suite |
| This document | Markdown | Owner signoff and release/rollback acceptance record |

## Release design details

**Stage mapping:** Context, Pre-trade Plan (with original locked snapshot), Actual Execution/No Trade, Results and Comparison, Supporting Chart Evidence, and Correction History. Any step whose original section is explicitly hidden by the authenticated replay mode remains unavailable. Full-form mode displays the original sections. Critical input/actions remain the same existing form handlers and member authorization.

**Position-risk worksheet:** Uses `entry`, `stop`, `quantity`, optional target and user-entered maximum dollar risk. Computes initial risk/share, current planned risk, positive reward/risk when valid, and the maximum whole shares `floor(riskBudget/riskPerShare)`. A zero/invalid stop distance, missing values or nonpositive risk input is explicitly marked unmeasured. Members must manually select **Use suggested whole-share quantity**. Risk is an arithmetic estimate, *not* a guaranteed stop fill or sizing recommendation tailored to an account.

**Closed-trade integrity:** When the existing user saves actual values on a `closed` record, the same mutation recalculates gross/net P&L, R and MFE/MAE from the revised inputs. A last-updated timestamp condition rejects overwriting a newer record from another session. Re-closing retains the original `closed_at` where present. The existing append-only `journal_actual_history_v1` records changed actuals after closure. Existing historical data is not backfilled silently.

**Review summary:** Counts only the current signed-in member's rows provided by the RLS-protected Journal list. Dates are validated; future-dated rows and excluded record types do not count. Counts are process-only; missing process scores remain explicitly ungraded. A browser session change hides previous member's results. This is **not** server-attested financial analytics.

## Acceptance requirements and evidence tiers

- **Source tests:** `node tests/test_journal_guided_integrity_v1.mjs` and `node tests/test_journal_v2.mjs`, all six V1 and three V2 module syntax checks, existing GitHub market-analysis regression and Pages build.
- **Deployment:** Verify Yahoo Cloudflare production account, exact `main` SHA, successful production Pages build, and log line `PASS Journal V2`.
- **Database:** No V2 schema or data migration should be necessary. Preserve V1 RLS, evidence bucket, caps, history trigger and existing records.
- **Signed-in member acceptance:** Test draft save, step transitions, manual sizing, locking and its disabled quantity modification, a closed trade correction plus updated metrics and audit, two-tab conflict, no-trade completion, private image access, 1/7/30D reviews, 1/4/12-week process aggregation, Free quota boundary, paid analytics denial, user switch and screen reader/keyboard/mobile behavior. These require a real member HTTP/browser journey; source and SQL simulation cannot substitute.
- **Operational performance:** Large Journal histories remain a distinct pagination/indexing review. V2 does not claim automated broker reconciliation, full position-path/partial fills, authenticated chart provenance, or assessment mastery.

## Rollback / incident response

1. Revert V2 HTML/CSS/script references and concurrent-edit source changes together, preserving the still-supported V1 form and protected persistence. Verify the restored build against the chosen Git SHA.
2. Do not drop `decision_journal`, `journal_actual_history_v1`, `journal_evidence_v1` or storage buckets to roll back a browser feature.
3. If a logged-in data integrity or privacy defect occurs, disable the affected V2 client control and investigate the specific RLS/API path; do not bypass entitlement or make private screenshots public.
4. Reconcile any client-side calculation issues against the member's original locked plan and auditable actual correction history before correcting historical records.

## Acceptance status

**Implementation:** source complete after all paths and tests are committed.  
**Verification:** requires exact main revision build log, CI completion and real member browser signoff; do not call this fully accepted from a GitHub commit alone.  
**Owner decision:** Version 2.0 approved for implementation, with LIVE payments expressly excluded.

## Verified V2 build evidence — October 28, 2026 UTC

**Cloudflare owner account:** Yahoo Stock Market from the Ground Up (not MommaBees); **Pages project:** `stock-market-from-the-ground-up`; **production branch:** `main`; **public Pages domain:** `https://stock-market-from-the-ground-up-d1r.pages.dev`.

At source commit `010975e5b5203c7b0021ccfbd7b787e7b5604a4d`, production deployment `c4958a72-215a-4710-9409-9b4cb129a60b` completed `deploy/success`. The provider build log independently contained:

- `PASS Journal v1: null/flat, planned R, fee validation, MFE range, ET/DST, enum, guided UI.`
- `PASS Journal V2: stage mapping, budget math, no-trade, date bounds, source isolation and closed-trade recalculation.`
- `Cloudflare Pages static output: 578 files`
- `Success: Your site was deployed!`

V2 tests and syntax checks are now included in `scripts/build-pages.sh` and `.github/workflows/market-analysis-v014146.yml`. This is independent evidence of the deterministic regression run and exact-revision Cloudflare build, **not** confirmation that every GitHub Actions job has completed or that a signed-in user has passed full end-to-end testing. Later documentation-only commits and unrelated concurrent site changes require their own exact-SHA deployment matching.

**Database migration:** None for V2. Original V1 evidence storage and correction history remain in place.

**Unresolved acceptance:** Actual signed-in browser verification of draft, lock, edit/recalculate, review queue, two-user RLS, attachment upload/download/delete, concurrent editor, quotas and keyboard/screen-reader behavior remains open; do not certify a complete live member journey using static code assertions alone.

## Revision history

| Version | Date | Description | Status |
|---|---|---|---|
| 2.0 | 2026-10-27 | Six-stage guided Journal, risk worksheet, process review, postclosure integrity and tests | Implementation and acceptance gates documented |

**Document control footer:** SMFGU-JOURNAL-V2-001 · Version 2.0 · October 27, 2026 · GitHub main · No LIVE payment changes.
