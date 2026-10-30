# Talia — Watchlist & Trade-Research Instruction V4.0
## Document control

| Field | Value |
|---|---|
| Organization / imprint | Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up |
| Document identifier | SMFGU-TALIA-WL-RESEARCH-V4-001 |
| Document title | Talia Watchlist & Trade-Research Instruction V4.0 — Implementation and Acceptance |
| File name | 2026-10-30_TALIA_WATCHLIST_RESEARCH_V4_IMPLEMENTATION.md |
| File type | Markdown (.md), maintained in the GitHub repository |
| Canonical repository location | docs/releases/2026-10-30_TALIA_WATCHLIST_RESEARCH_V4_IMPLEMENTATION.md |
| Google Drive location | Proposed: SMFGU / Website / Learning / Talia / Watchlist Research / Releases; **not uploaded** |
| Google Drive document ID | Not assigned |
| Version | 4.0 |
| Status | IMPLEMENTED SOURCE; production deployment requires exact-commit confirmation; authenticated role, browser and editorial acceptance remain separate |
| Authored | 2026-10-30 |
| Effective / acceptance dates | Pending evidence of deployment and member review |
| Dependencies | Shared nine-stage Learning Engine; existing Free Watchlist; existing Advanced Watchlist Workbench; self-hosted Apache ECharts 6.1.0; existing Supabase Auth and API access; source rights and approved fictional data |
| Purpose | Consolidate the user's research into original, instructive, evidence-based Talia workflows while protecting member records, existing entitlements and graded assessment integrity |
| New file? | Yes: this release control file; new JS/CSS and regression test files are also created in this release |

**Repository:** cybernexuspublishing/stock-market-from-the-ground-up. **Branch:** main only. No feature branch.

## 1. Owner-level decisions and architecture

1. There is **one reusable Talia research curriculum and one workstation** embedded into two existing products, not a new paid product or parallel data store.
2. In the **Free Research Watchlist**, permanent member-owned records continue to use the existing server-side 20-symbol limit and authorization. The same Talia instructional quality is available free once that product is accessible.
3. In the **Advanced Watchlist & Trade-Plan Workbench**, private saved candidates continue to use existing authenticated APIs. Premium access remains governed by its current entitlement; the research workstation does not bypass it.
4. The canonical **nine-stage Learning Lab** and protected assessment bank remain unchanged. The eight Talia *research actions* are a different, subordinate workflow: Observe, Explain, Investigate, Interpret, Challenge, Plan, Practice, Review.
5. **Knowledge, Recognition, Decision and Process** remain the four official skill dimensions. The new in-session report counts ungraded attempts and self-identified mistakes by dimension; it does **not** assign an official competence grade or imply mastery. Server persistence, independently graded retries and authoritative member longitudinal analytics are deferred until supported, authorized evidence exists.
6. Crownlight **Lumens** is the sole canonical customer-facing rewards currency. No new wallet, purchase, Sparks conversion or deduction is created. Explanations, remediation, retries and teaching are always free.
7. Sample ECharts data are original *fictional* authored examples. No future bar from a protected dataset, third-party historical chart, brokerage execution or live quote is exposed.
8. No real paid tests, production financial products, live broker trades, or unauthorized regulatory claims are enabled.

## 2. Coverage — 27 original teaching subjects

| Learning cluster | Subject codes | Required instruction |
|---|---|---|
| Discovery and preparation | building, sector, compare, reject, maintenance | Candidate discovery, issuer/sector comparison, exclusion/no-trade, time budgeting and explicit research cadence |
| Price, structure and patterns | pricevolume, structure, trends, candles, levels, breakout, failure, patterns | OHLCV, higher-high/lower-low structure, consolidation, wicks, time-bounded levels, triggered versus untriggered and failed setups |
| Company, catalyst and chronology | company, catalyst, hindsight | CIK identity, filings, company risk, primary-source catalyst time, release/observation chronology and decision-time integrity |
| Volume and liquidity | rvol, spread | Comparable RVOL baseline, date-stamped float, volume ≠ spread/depth, observable liquidity friction |
| Indicators and technical context | vwap, averages, indicators, macd, rsi, bollinger | Unit-based formula, warm-up, assumptions, one-indicator-at-a-time comparison, limits and false signals |
| Plans, risk and execution | thesis, risk, shorts | Falsifiable thesis, conditional triggers, invalidation, risk sizing with slippage/spread reserve, short borrow and asymmetric loss exposure |

Each topic stores an original definition, independently worked fictional example, source challenge, contradiction/misconception and transfer exercise. Talia has contextual instructional writing for all eight research actions, rather than a shared “this stock looks strong” label.

## 3. Instructor teaching sequence

Within each accessible watchlist:
- **Observe** — identify the currently available prices, participation, sources and dates; distinguish issuer data from member-entered text.
- **Explain** — define every relevant symbol/measurement, state units and demonstrate arithmetic when numerical.
- **Investigate** — separate issuer/filing identity, primary-source publication timestamp, sector context and known gaps.
- **Interpret** — consider trend, range, reversal, catalyst and setups as hypotheses, not predicted outcomes.
- **Challenge** — explicitly name disconfirming evidence, data that cannot be independently verified, liquidity friction, failed-pattern examples and no-trade conditions.
- **Plan** — write trigger, invalidation, risk budget, spread/slippage allowance and cancellation; distinguish “watch” from a broker order.
- **Practice** — document an ungraded, in-memory research checkpoint before an additional fictional bar can be revealed. Each bar requires a fresh cutoff-specific record; the chart only renders the revealed prefix.
- **Review** — preserve the recorded original evidence cutoff, note revisions chronologically and transfer the reasoning to a fresh example. No hypothetical P&L, market fill or official competency score is generated.

**Teaching parity:** “Play written explanation”, complete accessible transcript, free “Teach This in More Depth”, free “Try Another Guided Example” and “Retry with more instruction” are available within both products. There is no paid-per-explanation rule.

## 4. ECharts evidence standard

One fictional canvas and a synchronized OHLCV table are used in the workstation. The chart shows candlesticks, volume and current completed-candle High/Open/Close/Low guide prices. Only one optional study is selected at a time, to teach indicator selection rather than layer correlated signals.

Technical methods:
- SMA n: arithmetic mean of n completed closes, first valid at bar n.
- EMA n: seed with a complete n-close SMA; smoothing factor 2/(n+1); no invented warm-up values.
- RSI14: Wilder-smoothed changes after 14 completed close-to-close intervals. Flat periods are handled as neutral, not an automatic prediction.
- MACD12/26/9: fast/slow EMA difference, 9-valid-MACD signal EMA, histogram difference. No signal prior to its own warm-up.
- Bollinger20: current 20-close SMA plus or minus two **population** standard deviations, documented as a classroom convention.
- Session VWAP: cumulative bar typical-price × volume / cumulative shares; clearly labeled an **approximation**, not exact trade-level VWAP.
- Risk: absolute entry-to-stop difference plus modeled adverse spread/slippage per share; whole shares limited by a loss budget. Stops and slippage assumptions do not guarantee price or a loss cap.
- RVOL: current cumulative volume over a **compatible time-of-day cumulative average**. Float ratio is not a count of distinct owners or confirmed float rotation.

All examples are original generated fictional series, *not* a substitution for the existing server-owned historical/replay datasets.

## 5. Member workflow and report

- From a Free watchlist record, “Study this candidate with Talia” selects only that existing member-entered symbol in the UI. The ECharts sample is explicitly **unrelated** to this ticker.
- From a premium workbench saved record, “Study selected candidate with Talia” applies the same UI-only context, after existing entitlement and account authorization.
- The research report counts attempted checkpoints in Knowledge, Recognition, Decision, Process, repeated member-selected misconception categories, study topics, revisions, and the boundaries of revealed fictional bars.
- Reports are **in-memory only**. The member can explicitly copy the plain-text educational report. No private reasoning is written into localStorage, a URL, a public endpoint or a new table. Browser reload removes in-session records; account switching resets the panel.
- Existing Free research saves and Advanced notes remain under their original database/API contracts. This feature does not silently create permanent Tutor reports or graded skill claims.

## 6. Research provenance and source corrections

The user's StocksToTrade archive and text/transcript corpus includes concepts from watchlists/scanning, candle structures, catalysts, patterns, VWAP, EMA, MACD, RSI, Bollinger Bands, volume, shorting, brokerage order risks and journaling. It is research input, not reusable copyrighted screenshots, copied lessons or licensed exchange data.

The source material includes promotional and anecdotal statements that must not be elevated into product claims:
- Higher volume does not mechanically imply a rising price or a liquid executable quote.
- Indicator crossovers, “leading” indicators and historical examples do not independently establish statistically reliable profitability.
- Bollinger touches, high RSI, MACD divergence and VWAP crosses do not guarantee reversal/continuation.
- A doji can have a substantial full range; OHLC alone cannot establish the exact intrabar transaction sequence.
- Stock float, short interest, volume/float ratio and confirmed short covering are separate quantities.
- VWAP from OHLCV bar typical prices is an approximation of trade-level VWAP.
- Stop-market, stop-limit and trailing-stop orders have different triggers/constraints; no stop price is guaranteed under gaps or illiquid trading.
- Capital, margin, borrow, exchange restrictions and regulatory statements depend on broker, instrument, jurisdiction and date; they require updated verification before definitive student guidance.

No copied StocksToTrade articles, proprietary scanner algorithms, restricted datasets or author images are republished.

## 7. Implementation inventory

**Created**
- assets/js/watchlist-talia-research-v4.js — first-party curriculum and deterministic numeric methods.
- assets/js/watchlist-talia-workstation-v4.js — common Talia instructor and ECharts member workflow.
- assets/css/watchlist-talia-v4.css — responsive, accessible member presentation.
- tests/test_talia_watchlist_v4.mjs — math, completeness, provenance, no-lookahead, integration and non-commercial regression suite.
- docs/releases/2026-10-30_TALIA_WATCHLIST_RESEARCH_V4_IMPLEMENTATION.md — this document.

**Modified**
- free-watchlist.html — canonical Free instructor mount.
- advanced-tool.html — canonical Advanced instructor dependencies.
- assets/js/free-watchlist-v1.js — Free research record count, explicit candidate teaching handoff, account-clear behavior.
- assets/js/watchlist-intelligence-v2.js — existing premium Research lifecycle companion's shared instructor mount/refresh, candidate handoff.
- scripts/build-pages.sh — required node syntax/regression gate.

**Explicitly NOT modified**
- Protected grading/RPC data and official assessment schemas.
- Original Free 20-symbol quota, membership entitlements or Stripe.
- Crownlight Lumens ledger, credit prices or rewards.
- Market data licensing and server-owned fictional replay.
- Official Lab/Boot Camp curriculum stage count.

## 8. Acceptance evidence and unresolved work

**Source-level acceptance checklist** (the required automated test is checked by the normal Cloudflare Pages build):
1. All 27 curricula are nonempty and original, with specific numerical examples and contradictions.
2. Eight research steps and four non-mastering report dimensions remain separate from the nine-stage grading system.
3. SMA, EMA, RSI, MACD, VWAP, Bollinger and risk math match independent fixture outputs with transparent warm-up.
4. Fictional cases contain valid OHLCV; chart series render only the prefix of bars currently revealed.
5. The Free and Advanced mount scripts load in dependency order, and neither module performs a wallet debit, checkout, protected assessment write or unauthorized API request.
6. Existing member record APIs remain the sole sources of saved research.
7. Price/volume visuals and report remain usable if ECharts or clipboard is unavailable.

**Open acceptance gates** — do not call these complete based solely on CI:
- Authenticate a true Free member: save/edit/archive/restore all allowed records and verify Talia's per-record handoff, logout clearing and report isolation.
- Authenticate a premium member: verify authorized Workbench, candidate handoff and data retention, then verify expired/Free account cannot use the premium endpoint.
- Browser-test ECharts on desktop and mobile, keyboard/screen reader, indicator warm-up and paused fictional reveal sequence.
- Test exact-source times, SEC identity and source rights with authorized data before presenting current issuer events or quantitative research.
- Design an approved RLS-backed *member longitudinal research report* if permanent cross-session K/R/D/P records are later authorized. It must distinguish practice from graded competency.
- Run an independent editorial review for all 27 topics and practical transfer cases, and verify existing Tutor + Lab cross-links against actual entitled routes.
- Do not rewrite or bulk-claim acceptance for all 419 Labs based on this teaching-surface release.

## 9. Deferred ideas — not blocking Version 4

An authorized, source-validated real-time scanner, issuer/catalyst chronology, point-in-time historical market dataset, verified cross-day RVOL baseline, alert delivery and persisted official longitudinal member report would require separate API, data-rights, entitlement, historical case and governance acceptance. They should be introduced in bounded future versions rather than silently simulating live verification.

## Revision history

| Date | Version | Action | Owner approval |
|---|---|---|---|
| 2026-10-30 | 4.0 | New shared 27-topic Talia research curriculum, numerical visual teaching, Free/Premium handoff, ungraded report and production regression scope | Acting Owner routine scope accepted; no authority assumed for real-money charges or official grading changes |

**Footer / control:** SMFGU-TALIA-WL-RESEARCH-V4-001 · Crown & Lantern Press · Version 4.0 · Draft acceptance pending independent editorial and authenticated browser verification.


## Controlling post-release addendum — Permanent Reports V1 (October 30, 2026)

The original V4 statement that research reports are *in-session only* describes the historical status at initial V4 release. It has been **superseded for persistent ungraded research reports** by \`SMFGU-TALIA-PERSIST-001\` in \`docs/releases/2026-10-30_TALIA_PERMANENT_MEMBER_RESEARCH_REPORTS_V1.md\`. The shared V4 curriculum and eight-stage research workflow have not been replaced.

Member-authored checkpoint reasoning is now permanently saved in server-owned \`gu_talia_watchlist_checkpoints_v1\` and reflected in the transactionally maintained \`gu_talia_watchlist_reports_v1\` summary. Member restoration, authenticated owner scope, duplicate retry safety, explicit delete functionality, Free/Advanced presentation and report metrics are implemented. Production-source and database security checks have passed; authenticated end-to-end Free/Premium browser acceptance remains open. Official four-dimension *mastery* still depends on independent protected Lab assessments and was not altered.
