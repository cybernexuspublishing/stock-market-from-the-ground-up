# Talia — Guided Practice Batch 03: Indicator Variants & Reproducible Watchlists

**Project:** The Stock Market: From the Ground Up  
**Date:** 2026-10-28 (America/Chicago)  
**Document version:** 1.0  
**Audience:** Owner, learning engineering, editorial QA, Founding 600 beta operations  
**Review state:** Code implemented as original ungraded synthetic instruction. Exact-commit CI and production deployment are independent acceptance gates.

## Scope and accounting
- Existing source-grounded authored library: **227 reference teaching guides + 22 glossary entries = 249** (unchanged by this batch).
- Previously interactive Guided Practice: **24 original nine-stage modules** (14 indicators, 10 advanced watchlists).
- Batch 03 adds **6 distinct mathematical indicator demonstrations and 6 distinct watchlist eligibility/source-integrity scenarios**.
- Planned total: **36 interactive Guided Practice modules** (20 indicators, 16 advanced watchlists).
- These are **NOT 36 officially scored Labs, independently validated profitable strategies, real member mastery results, or licensed historical trades**.
- No changes to official 30 competency records, 419 canonical Lab IDs, member entitlements, billing, or protected question banks.

## Six implemented indicator demonstrations

| Module | Study | Completed-bar implementation | Teaching caveat |
|---|---|---|---|
| IND-15 | Linear Weighted Moving Average | WMA with weights 1..N (oldest→newest); warmup N bars | Difference from SMA is not future-price prediction |
| IND-16 | Percentage Price Oscillator | 100 × (EMA12 − EMA26) / EMA26; SMA-seeded EMAs | Main PPO only, **no** signal line/histogram; requires 26 completed bars |
| IND-17 | Stochastic Oscillator | Fast %K = 100 × (close − lowest low)/(highest high − lowest low) | Undefined when zero price range; no smoothed slow %K/%D |
| IND-18 | Williams %R | −100 × (highest high − close)/range | Equivalence to fast stochastic under same range; not an independent vote |
| IND-19 | Average True Range Percent | 100 × Wilder ATR(N)/latest completed close | Volatility scale; not spread, maximum loss or fill promise |
| IND-20 | Average Volume | SMA of share volume in N completed, equal-duration bars | Per-bar average distinct from matched-time cumulative RVOL |

All calculations use the same fictional 48-bar OHLCV stream and the previously shared calculation primitives, seed rules and pause slider. WMA is plotted as a price overlay; percentage oscillators, relative volatility and share-volume averages remain separate-scale numerical measurements so their values are not drawn on a dollar price axis. An unfinished bar or missing warmup yields no fabricated indicator output.

Original demonstration and transfer questions contain subject-specific plausible misconceptions. After two inaccurate attempts, the lesson gives a source-specific scaffold. Exercises do not award competency scores.

## Six implemented watchlist decision scenarios

| Module | Scenario | Additional reproducible hard predicate |
|---|---|---|
| WATCH-11 | Listed security universe and class | Correct common-share universe and verified issuer identity |
| WATCH-12 | Corporate actions and historical share identity | Issuer/security verified; split/share adjustment reconciled |
| WATCH-13 | PMH/PDH/HOD level chronology | Price reference was already observed at the replay pause |
| WATCH-14 | Higher-timeframe context versus setup clock | Five-minute bar complete and higher-frame context time-stamped |
| WATCH-15 | Risk-first candidate ranking | Critical source/identity/risk fields verified separately from soft score |
| WATCH-16 | Dynamic watchlist snapshot | Original scanner query revision, timestamp, filters and candidate captured |

Each fictional four-row scanner continues to enforce the original source, trigger, RVOL, spread and halt gates, then evaluates a selected additional source/state predicate. The risk-first example deliberately allows a candidate to show a high soft score yet **fail** a hard gate. This is intentional instruction, not a scoring algorithm for real broker orders.

## Source provenance

- Original research and owner-established STT/StocksToTrade archive terminology informed the curriculum scope. No proprietary vendor formulas, credential profile data, paid screenshots, private Lab answer keys or market-data feed are included.
- StockCharts ChartSchool provides published technical-study calculation and interpretation context: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays
- StockCharts PPO explanation, normalized EMA spread: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/percentage-price-oscillator-ppo
- StockCharts Stochastic Oscillator formula and smoothing variants: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/stochastic-oscillator-fast-slow-and-full
- Official thinkorswim Stock Hacker lists instrument-universe selection, filtering, exclusions and watchlist-like result behavior: https://toslc.thinkorswim.com/center/howToTos/thinkManual/Scan/Stock-Hacker
- Current provider study settings and selected market/broker data must be independently verified. These URLs explain methods but do not validate a profitable strategy or reproduce software functionality on the website.

## Validation contract

1. `tests/test_tutor_guided_practice_v1.mjs`: all 36 modules link to true source-guide IDs; exactly 20 indicators and 16 watchlists; all nine teaching stages and misconception annotations retained. WMA, PPO, fast stochastic, %R, ATRP and volume mean checked independently with neutral zero-range/warmup behavior.
2. Same unit contract: all six specialized watchlist rules explicitly reject fabricated unknown identity, historical adjustment, incomplete multi-timeframe, invalid reference and missing snapshot conditions; a soft score cannot override vetoes.
3. `tests/test_tutor_guided_practice_browser_v1.mjs`: fictional indicator visuals, fixed-period PPO, one scanner table at a time, risk-first high-score rejection and frozen snapshot checks at mobile/desktop widths. No optional paid model POST, real brokerage order or local-storage action.
4. Production acceptance requires GitHub source SHA + matching successful Cloudflare production deploy, targeted Tutor CI, and sitewide browser workflow. Real Founding 600 learning acceptance remains separate.

## Outstanding roadmap (truth-in-labeling)
- **41 remaining original indicator study briefs** do not yet have their own Guided Practice interactive lesson (61 − 20).
- **6 remaining advanced watchlist research briefs** do not yet have a specialized interactive lesson (22 − 16).
- All **50 strategy/workflow source briefs** need individual chart-linked guided decision experiences if the goal is 100% interactivity; their prior original written playbooks are not absent.
- The 300-topic source archive group inventory exists, but full per-topic crosswalk of exact source IDs, effective-date evidence, citations and verified lesson coverage is still pending.
- Historical replay still needs licensed and verified time-stamped OHLCV, news, halts and quote evidence; this batch adds no new authentic historical execution cases.
- Full quantitative analysis, financial statement research, options position risk and adaptive misconception history require additional work and independent QA.

## Revision log

| Date | Revision | Changes |
|---|---|---|
| 2026-10-28 | 1.0 | Batch 03: six indicator formulas, six advanced watchlist hard gates, content and synthetic/regression acceptance |
