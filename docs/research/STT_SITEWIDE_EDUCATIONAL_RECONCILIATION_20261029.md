# STT research — sitewide existing-product educational reconciliation
**Date:** 2026-10-29  
**Project:** The Stock Market: From the Ground Up  
**Branch:** `main` only  
**Source classes:** Owner-provided `STT.zip`, `StocksToTrade-Browser-Research (8).zip`, additional owner-provided transcript extracts, and existing first-party study catalogs.  
**Purpose:** Improve existing lessons and products where supported. Do NOT create a competing curriculum or treat source claims as independently measured trading performance.

## Controlling integration rules
1. Preserve the 419 canonical Lab IDs, 30 original competency guides, the v3.3 shared learning journey, member grades and private answer keys. Material added here is ungraded teaching and review.
2. Preserve the existing 30-day Boot Camp; the Academy's additional programs enrich their own existing daily study objects, including Free Foundations. No new course enrollment or progress tables were introduced.
3. Preserve the canonical existing Free Watchlist (20 account-scoped records) and existing authorized Advanced Workbench backend. Research gates are self-reported evidence notes, never independent market verification.
4. Preserve original plan snapshots, actual history and authenticated journal records. Review outcomes without hindsight.
5. ECharts is visualization only. No quote feed, licensed vendor replay, market-data permissions, proprietary scanner, guaranteed stop fill, live order, statistical edge or grader is implied.
6. Exclude pattern-day-trading rules from *this instructional expansion* per Owner instruction. Do not silently delete the separate historical account-rules teaching already present in earlier source assets.
7. No Stripe, prices, Sparks, current entitlements, subscriptions, migration, live brokerage activity or historical market-data publication changes.

## Source-to-existing-product map

| Research family | Existing product(s) | Integration in this source pass | Remaining acceptance |
|---|---|---|---|
| Candles, doji, gap and OHLCV | 419-Lab shared instructor; Free Foundations; Academy; Tutor | Expanded shared domain teaching and Academy candle cases, with explicit intrabar order uncertainty | Case-by-case visual and zero-knowledge editorial review |
| News, SEC, issuer, earnings, hot sectors, sympathy | Existing research Labs, Academy, Free/Advanced Watchlist, Tutor, Journal | New shared catalyst domain; Academy original case; structured note fields and source gate; Journal source-time review | Exact-source chronology and approved actual case datasets |
| Watchlist screening and candidate quality | Free Research Watchlist, Advanced Workbench, 22 Tutor watchlist studies, Boot Camps | 4-part structured Free note composer; four self-reported Advanced readiness gates; Academy screening lesson | Authenticated multi-account browser acceptance; no new full scanner engine |
| Patterns: dip/rip, red/green, VWAP, HOD, breakout and failure | Shared Labs, Academy, Tutor, Crownlight Studio curriculum | New pattern domain and Academy pattern explanation; completed trigger versus forming and failed state | Chart-specific interactive visualization, qualified case data, reproducible outcomes |
| Trade thesis, stop, sizing, targets | Existing Labs, Academy, Advanced Workbench, Journal | New trade-plan domain, Academy risk worked case, Advanced invalidation and gate requirements, Journal coaching | End-to-end user plan-to-journal flow in authenticated browser |
| Volume, bid/ask spread, executable depth | Shared Labs, Academy, Advanced Workbench, Tutor, Journal | New liquidity domain; Advanced self-report gate; Journal risk/actual-price caveats | Quotes/market rights and actual fill observations unavailable from transcripts |
| Journaling, MFE/MAE, learning feedback | Shared Labs, Academy, Tutor, existing Journal | New review domain; Academy no-hindsight teaching; expanded Journal feedback across six existing steps | Actual member learning outcomes and journal analytics acceptance |
| Indicators/technical studies | 61 indicator Tutor topics; Crownlight charts; Lab instruction | Existing vwap and EMA units preserved; new indicator-context Academy teaching | Specialty numeric implementations and historical chart data remain separate work |
| Short covering and float mechanics | Tutor source lessons, advanced research and Academy | Source-informed observable pattern, not inference of hidden short positions | Broker-specific contemporaneous short data cannot be inferred |
| Master 300-topic research crosswalk | Existing research index and Tutor catalog | Existing source register retained; supplements reuse it | Full row-by-row 300-topic provenance and editorial acceptance not asserted |
| Historical replay and image rights | Existing historical replay and Chart Studio | Explicit no-lookahead and source-versus-example boundaries preserved | Authorized authentic OHLCV, source review and authenticated replay tests required |

## Exact source paths modified
- `assets/js/lab-v33-instruction-content.js` — five full original lessons (tradeplan, catalyst, momentum, liquidity and journal), each with guided examples, a misconception, limitation, self-check and transfer.
- `functions/_lib/bootcamp-academy-v014168.js` — original, optional topic-matched lesson enrichment for existing Academy days and Free Foundations; no changes to canonical Lab registry or grades.
- `assets/js/bootcamp-academy-v014168.js` — renders supplement within the original Academy instructor stage, before ungraded self-check.
- `free-watchlist.html` and `assets/js/free-watchlist-v1.js` — optional structured research-note composer using existing source/research text fields and same authenticated save.
- `assets/js/advanced-tools.js` — original source, chart, liquidity and invalidation gate checkboxes on existing member-owned records. READY requires all four self-reported gates; previously saved records remain readable.
- `assets/js/journal-guided-v2.js` — source chronology, plan risk, contemporaneous liquidity, and no-hindsight process feedback in the existing six-stage Journal.
- `tests/test_stt_sitewide_reconciliation_v1.mjs` — first-party source assertions for these integration points, original instructor examples and existing fourteen video-derived Tutor cards.
- `.github/workflows/market-tutor-v014147.yml`, `.github/workflows/research-tools-v014145.yml` — register that new test in the already existing continuous-integration gates.

## Existing source material preserved
- `data/tutor-video-transcript-research-v1.json`: fourteen supplemental Tutor teaching cards previously recorded.
- `data/tutor-guided-practice-v1.json`: 134 original guided-practice units (20 calculated indicators, 41 interpretation-only indicator lessons, 22 watchlist decisions, 50 source-informed research workflows, one issuer event chronology).
- `data/tutor-watchlist-study-v1.json`: existing 22 reference lessons.
- `data/tutor-strategy-study-v1.json`: existing 50 workflow teaching records.
- Original 419-Lab catalog and official assessment/rubric boundaries remain unchanged.
- `docs/research/STT_VIDEO_TRANSCRIPT_RESEARCH_INTAKE_20261029.md` remains the dated historical intake and should not be retroactively rewritten.

## Evidence and release status
- This is a **source integration** into existing products, not full acceptance of every Lab, 300 research topics, authorized live market-data feeds or all historical replay cases.
- Direct GitHub `main` commits are independently reviewable; production status must be checked against the exact latest commit, not a prior deployment.
- Existing no-charge CI now calls the new integration regression test. Full acceptance requires its successful job results and preexisting privacy and permission tests.
- Authenticated beta-member browser acceptance, a licensed historical-data source and independent exercise/editorial approvals are separate requirements.
- No owner acceptance tests of partial implementation are requested.

## Rollback
Rollback only the source changes identified above through controlled commits on `main`, preserving all authenticated member data and existing schema. There is no new database migration to roll back.

**Copyright:** All new student-facing teaching is first-party original explanatory material; no third-party video transcript, vendor chart image or proprietary signal logic was republished.
