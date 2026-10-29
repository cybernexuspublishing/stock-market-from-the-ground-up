# Talia Guided Practice — Interactive Expansion Batch 02
**Date:** October 28, 2026  
**Project:** The Stock Market: From the Ground Up  
**Owner-approved scope:** Indicator and Advanced Watchlist interactive instruction  
**Status:** Authored and integrated; acceptance requires exact-main CI, Cloudflare production match, and separate beta-member comprehension.

## Document control
| Field | Value |
|---|---|
| Filename | `docs/research/TALIA_GUIDED_PRACTICE_BATCH02_20261028.md` |
| File type | Markdown |
| Version | 1.0 |
| Project | Market Tutor and Shared Learning Engine |
| Status | Implementation candidate until exact-commit CI; interactive but ungraded |
| Dependencies | Existing `tutor-guided-practice-v1.json`, `tutor-guided-practice-v1.js`, `crownlight-indicator-math-v2.js`, canonical `STUDY_*` catalogues, browser tests |
| Purpose | Convert researched study briefs into actual visual nine-stage learning exercises |

## Baseline and change accounting
- Existing original Tutor knowledge catalog: 227 authored guides + 22 glossary = 249 reference entries. **This batch creates no new catalogue entries** and does not pretend that progress reflects additional reference knowledge.
- Before: 8 completed fictional interactive indicator modules + 6 watchlist modules = **14 Guided Practice modules**.
- New: 6 indicator modules + 4 watchlist modules = **10 additional Guided Practice modules**.
- After: 14 indicator modules + 10 watchlist modules = **24 Guided Practice modules**.
- These are public fictional, ungraded teaching experiences, **not 24 separately graded Labs**, real account-specific trading strategies, or validated positive trading expectancy.
- Canonical 30 assessed competencies and 419 Lab IDs remain unchanged.

## Six new indicator exercises
| ID | Study | Calculated demonstration | Specific lesson |
|---|---|---|---|
| IND-09 | On-Balance Volume (OBV) | Complete-close directional cumulative signed volume, zero seed | Rising volume proxy does not identify buyers or guarantee continuation |
| IND-10 | Chaikin Money Flow (CMF) | Volume-weighted bar close-location ratio and zero-range protection | Bar location differs from actual institutional fund flow; gaps matter |
| IND-11 | Money Flow Index (MFI) | Typical price × volume, positive/negative flows, zero denominators | Overbought conditions are not guaranteed reversal signals |
| IND-12 | Rate of Change (ROC) | % close-to-close change at specified completed lookback | Corporate actions and lookback comparability |
| IND-13 | Donchian Channels | Complete-bar rolling price high/low and midpoint | Current-inclusive channel vs previous-channel breakout rule |
| IND-14 | Keltner Channels | EMA center ± 2 × Wilder ATR with plotted dashed boundaries | ATR envelope vs Bollinger standard deviation, vendor settings differ |

The visible chart uses synthetic OHLCV and exposes exactly the selected number of completed bars. It uses no market quote, no real ticker, and no future-bar data. Relative oscillators remain separate-scale numbers rather than misleading price overlays. The channel examples plot the upper/lower boundaries on the price axis.

## Four new watchlist exercises
| ID | Workflow | Interactive proof or veto |
|---|---|---|
| WATCH-07 | Boolean Scanner Logic | ALL(required) and ANY(alternatives) and NONE(excluded) applied to each fictional symbol |
| WATCH-08 | Source Freshness | Stale quote or post-decision published evidence cannot support a contemporaneous entry |
| WATCH-09 | Sector Relative Strength | A stock's positive return may underperform its matched-period benchmark |
| WATCH-10 | Short Borrow and Halts | Bearish price pattern cannot override missing borrow, broker restrictions or halted trading |

The existing four-row scanner now shows a **special lesson gate** where appropriate, with named exclusion reasons. Editable spread and same-clock RVOL remain declared fictional policy thresholds. The scanner does not save symbols, connect to actual brokerage data, create orders, or change production watchlist functionality.

## Pedagogical standard and limitations
All ten modules use Start → Learn → Experiment → Predict → Practice → Assess (ungraded) → Review → Transfer → Results, with original writing. For each, Talia can present a concept, why it matters, a specific method, uncertainty, a fictional visual/screen, three-choice prediction, misconception-specific correction, follow-up transfer and optional "teach another way" question handoff without auto-billing. After repeated incorrect answers, a targeted scaffold reinforces the actual formula or evidence gate.

All client text is rendered as text nodes. No paid inference, private answer bank, browser local-storage write, member grading, real historical chart or account entitlements change.

## Source hierarchy
- ChartSchool/StockCharts technical reference catalog: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays
- Official thinkorswim Stock Hacker for reference semantics of ALL/ANY/NONE, saved scans, result alerts: https://toslc.thinkorswim.com/center/howToTos/thinkManual/Scan/Stock-Hacker
- STT.zip Phase 8 scanner/candidate-state research and the owner Browser Research (8) indicator/strategy/watchlist inventory, critically interpreted and originally rewritten.
- The scanner's fictional exact thresholds are **not** a current claim about either vendor's default values.

## Automated acceptance
`tests/test_tutor_guided_practice_v1.mjs` verifies 24 authentic guide links, 9 stages, visual math including warmup and independent calculation checks, no lookahead, 4 specialized watchlist eligibility predicates, sources, privacy and zero grading.

`tests/test_tutor_guided_practice_browser_v1.mjs` exercises 390px and 1280px browser flows with original and added lessons, channel overlay, self-correction, separate watchlist veto explanations and no automatic provider call.

**Not yet accepted by these tests:** actual member comprehension, the remaining 47 indicator and 12 watchlist briefs, full source-to-Lab mapping of the 300 research inventory, licensed historical candles, independent positive-expectancy validation, or protected Lab assessment grading.

## Next batch
After current exact-commit CI and matching deploy pass, convert more of the remaining indicator/watchlist guides with explicit math variants, multi-scenario transfer, incomplete bars, counterexamples, source freshness, and deeper individualized remediation. Separately reconcile the numbered 300-source research inventory against the 227 guides and their actual instructional readiness.

## Revision history
| Date | Version | Description |
|---|---|---|
| 2026-10-28 | 1.0 | Batch 02 instructional expansion from 14 to 24 ungraded interactive Guided Practice modules |
