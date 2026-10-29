# Talia Guided Practice v1 — production Beta implementation and curriculum scope
Date: October 28, 2026
Owner-approved priority: make authored indicator and advanced watchlist studies teach-first, visual, interactive, source-based and corrective instead of definition-only.

## Important discovery and correction
The repository already contained 30 canonical competency guides, 22 glossary references, 32 STT research guides, 18 trading-decision playbooks, 13 advanced decision guides, 1 historical chronology guide and the new 133 indicator/watchlist/strategy guides.
However, `scripts/build-pages.sh` originally whitelisted only the original competency catalog among these Tutor curriculum assets. The optional ASSETS.fetch loaders therefore degraded to the 30-guide fallback on deployed Pages builds. A green CI test using mocked ASSETS was not evidence the optional public catalogs actually shipped. This sprint explicitly adds all seven public original Tutor catalogs to the Pages public-output allowlist and asserts nonempty output. No private scored questions or rubric exports are published.

## New actual instructional capability — the first 14 scenarios
- 8 original fictional indicator demonstrations: SMA, EMA, Wilder RSI, MACD histogram, true-range/ATR, Bollinger Bands, HLC3 bar-proxy VWAP, matched-clock RVOL. Each has visual or explicit metric calculation using the existing CrownlightIndicatorMath library on only the currently revealed synthetic OHLCV bars.
- 6 advanced watchlist investigations: candidate state separation, premarket source/quote verification, matched-time RVOL, spread/liquidity veto, primary catalyst chronology, and a NO TRADE decision ledger.
- One reusable client-side nine-stage instructor flow: **Start → Learn → Experiment → Predict → Practice → Assess (ungraded self-reflection) → Review → Transfer → Results**.
- Fictional bar slider, period control, price/volume graphic, simple OHLC/study values, editable scanner filter gates, per-candidate explainable eligibility, multi-choice evidence tests, specific corrective feedback, scaffold after 2 inaccurate tries and changed-case transfer check.
- Explicit time, feed and model limitations: HLC3 VWAP is a *bar approximation*, not exact consolidated trade VWAP; RSI uses Wilder smoothing; MACD uses explicit 12/26/9 lengths and needs seeded history; no forecast/directional certainty or fill guarantee.
- "Ask Talia to teach this another way" prefills the existing consent-protected Tutor composer. It **never auto-submits** or sends a paid AI request.
- All practice state stays in page memory, no localStorage, database records or mastery awards. Students can use the existing Tutor's separate optional and authenticated history flow by consciously submitting questions.

## Source references
- ChartSchool RSI and Wilder smoothing: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi
- ChartSchool MACD 12/26/9: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/macd-moving-average-convergence-divergence-oscillator
- Stock Hacker scan conditions, intersections and exclusions: https://toslc.thinkorswim.com/center/howToTos/thinkManual/Scan/Stock-Hacker
- Study filters, aggregation and extended hours: https://toslc.thinkorswim.com/center/howToTos/thinkManual/Scan/Stock-Hacker/studyfilters.html
- Local calculations remain under `assets/js/crownlight-indicator-math-v2.js`; no third-party licensed market bar redistribution.
- Original 133 authored guides `data/tutor-indicator-study-v1.json`, `data/tutor-watchlist-study-v1.json`, `data/tutor-strategy-study-v1.json` supply the instructional topics. Actual implemented practice is only the first 14, not all 133.

## QA contract
`tests/test_tutor_guided_practice_v1.mjs` verifies 14 scenarios, 9 named stages, guide code existence, source URL validation, lack of persistent client data, canonical 30+1 preserved, current bar-only indicator arithmetic, optional calculation warmup, exact gate outcomes, and source-file presence in Pages build script.
Market Tutor Trust workflow also runs `node --check` and copies/validates public `data/*.json`, JS and CSS. These are synthetic, nonpayment tests and do not constitute a real signed-in Founding 600 learner journey.

## Remaining curriculum work
- Interactive conversion inventory: 14 fully authored client guided cases in v1, of which 8 of 61 indicators and 6 of 22 watchlist briefs. Remaining **53 indicator briefs and 16 watchlist briefs**, plus **50 strategy briefs** are still source-only reference lessons. The 94 original guides have their existing Tutor/other Lab pathways, not new lessons automatically.
- Indicator specialist calculation variants, more chart/volume visualizations, explicit member-chosen timeframe, adaptive difficulty driven by actual approved progress, accessible chart annotation and teacher guidance.
- Advanced scanner *product* implementation is separate from a fictional filter exercise. New exercises do not create market alerts, real data subscriptions, order placement or a stored watchlist.
- Verified historic bars/events, correct chart usage licensing, replay/quote synchronization and source-specific casebook editorial approval remain independent.
- Per-ID reconciliation of the 300 source research topics and comprehensive options, accounting, long-term and quantitative studies remain open.

**Release rule:** use exact branch SHA CI and matching Cloudflare production deploy; do not mark 133 visual Labs complete. Never say a green source-only mock is a real member test.
