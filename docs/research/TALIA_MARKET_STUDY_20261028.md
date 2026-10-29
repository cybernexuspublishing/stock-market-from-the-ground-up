# TALIA MARKET TUTOR — MASTER STOCK-MARKET STUDY & EXPANSION AUDIT
Revision: 2026-10-28 | Source-oriented original educational study | Owner approved
Status: New 133 source-only, ungraded teaching briefs require exact-commit CI and deployment acceptance. No claims of profit or real-member mastery.

## I. Audited baseline before this expansion
A — 30 canonical official competency guides in `data/competency-study-guides-v01499.json`
B — 22 separate glossary descriptions in `functions/_lib/tutor-topics-v01492.js`
C — 32 STT source-informed research guides in `data/tutor-research-guides-v1.json`
D — 18 conditional entry/hold/exit/WAIT/NO TRADE decision playbooks in `data/tutor-decision-playbooks-v1.json`
E — 13 advanced investing, order-flow, fundamental and options decision playbooks in `data/tutor-advanced-decision-guides-v1.json`
F — 1 original replay chronology guide stored as `supplementalGuides` in the canonical competency asset.
**Baseline = 94 authored teaching guides (30+32+18+13+1) and 22 glossary descriptions = 116 authored reference entries.** Duplicate concepts across sources are intentional and these numbers are not unique competencies or completed Labs.

## II. New instructional content (batch 03)
61 new indicator and market-measurement explainers, from moving averages, RSI/MACD, stochastic, ADX/Aroon, Ichimoku, Keltner/Bollinger/Donchian, ATR and standard deviation to VWAP/anchored VWAP, OBV/CMF/MFI, Volume Profile, market breadth and implied-volatility context.

22 advanced watchlist/scanner research lessons: scope, security identity, source freshness, Boolean filters, candidate lifecycle, premarket gaps, time-matched relative volume, liquidity, catalysts, halts, SSR/borrow, price maps, multi-timeframe alignment, named strategy lanes, hard risk vetoes, queue review, alert versus entry, reproducible snapshot, calendar, sector-relative checks, prior runners and NO TRADE records.

50 original strategy/workflow *reasoning* entries corresponding to STT.zip Phase 8 routing (all 50 named workflows). Source documentation also includes Phase 9 entry archetypes and Phase 10 risk logic. These are educational descriptions, not current vendor product specifications, copy-pasted proprietary rules or positively validated strategies. Six entries are explicitly marked unverified proprietary vendor methodology: Oracle Signal, Oracle Double Tap, FLUX Afternoon Continuation, Alpha Dark Anomaly, Alpha Manual Override, IRIS Score/Trigger.
**New authored briefs = 133; after successful publication, teachable catalog = 227 guides (94+133) plus 22 separate glossary entries = 249 authored reference entries.**

## III. Research source hierarchy
1. User STT.zip: 118 archive entries; machine-readable Phase 8 describes 50 strategies, 44 feature definitions, 9 scanner lanes, 16 challenger hypotheses, 8 candidate states and zero statistically validated strategies. Phase 9 has 11 entry archetypes, 12 chart states, 16 gating conditions and 15 vetoes. Phase 10 contains 16 risk formulas, 11 risk archetypes, 8 kill switches, 14 no-trade controls, and modeled order-risk methods. These are research architectures rather than realized trades or live scanner guarantees.
2. User StocksToTrade-Browser-Research (8).zip: 5496 archive entries (largely browser dependencies/profile). The education notes include the numbered 001–300 educational inventory, indicator calculation/method comparisons, 50-strategy research, watchlist and source/rights caveats. The research README describes 300 source-linked topic decisions, 317 unique cited source IDs and 93 original arithmetic checks; this does not mean 300 website Tutor lessons or strategy/outcome validation.
3. Current website production `main` code: authoritative for existing A–F counts, authentication, optional consent-gated model use and current public Tutor retrieval.
4. Public references checked in current research:
- StockCharts ChartSchool technical indicators & overlays and market breadth catalogs: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays and https://chartschool.stockcharts.com/table-of-contents/market-indicators
- thinkorswim Studies and Strategies: https://toslc.thinkorswim.com/center/reference/Tech-Indicators
- thinkorswim Stock Hacker, watchlists and custom columns: https://toslc.thinkorswim.com/center/howToTos/thinkManual/Scan/Stock-Hacker and https://toslc.thinkorswim.com/center/howToTos/thinkManual/MarketWatch/Quotes.html
- SEC Investor.gov EDGAR and filings: https://www.investor.gov/introduction-investing/getting-started/researching-investments/using-edgar-research-investments
- FINRA April 20, 2026 intraday-margin transition guidance: https://syndication.finra.org/content/understanding-new-intraday-margin-requirements
- CME educational trade-plan and position sizing: https://www.cmegroup.com/education/courses/building-a-trade-plan/trading-strategies-in-your-trade-plan
- OCC Options Industry Council Greeks: https://www.optionseducation.org/advancedconcepts/volatility-the-greeks

"Accredited" is not assumed for all commercial educator sources. SEC/FINRA are regulatory references; OCC/CME are derivatives industry education; thinkorswim and StockCharts are commercial technical documentation. Each is authoritative for its own documented methodology and scope, not for profitability of a claimed strategy.

## IV. Instructional contract for every added guide
- WHAT is measured / what the pattern or watchlist does
- HOW it is computed or how its decision predicate is applied
- WHY learning it is useful for research, observation and risk planning
- HOW to use it with bar interval, session, corporate-action and quotation source declared
- LIMITATIONS: double-counting correlated indicators, lookahead, false signals, insufficient sample and execution constraints
- INVALIDATION or NO TRADE gate
- ORIGINAL FICTIONAL EXERCISE and non-graded comprehension question
- SOURCE URLS and archive lineage
- No current-ticker individualized buy/sell, no private Lab answers, no market-data redistribution, no live order or trading guarantee.

## V. Intended product architecture
`data/tutor-indicator-study-v1.json` — 61 original source-informed indicator briefs.
`data/tutor-watchlist-study-v1.json` — 22 original advanced workflow briefs.
`data/tutor-strategy-study-v1.json` — 50 original setup-research briefs.
`functions/_lib/original-competency-tutor-v014100.js` — optional public catalog loader, fail-closed validation, safe fallback and teach-first formatter.
`functions/api/market-tutor-v01492.js` — source-only generation for new master study, even when AI requested. Existing real-member auth and entitlements unchanged.
`tests/test_tutor_market_study_v1.mjs` — 133 record integrity, historical source and URL checks, retrieval, fallback, and synthetic authenticated zero-charge response.
`.github/workflows/market-tutor-v014147.yml` — adds exact-commit CI regression for this batch.

## VI. Outstanding education versus validation
- 133 authored briefs are NOT 133 fully animated, interactive nine-stage Lab journeys or 133 statistically validated trading methods.
- 50 named STT strategies are archival strategy categories. Source study Phase 8 itself reports ZERO statistically validated positive-edge strategies.
- The historical replay guide remains conceptual. Still needs legally reusable time-stamped historical OHLCV, corporate action, halt, quote and event data and instructor-reviewed annotations.
- Website Advanced Watchlist and Scanner Builder require their own implemented functionality, access/persistence/security, UI and CI; the 22 lessons are educational only and do not create those app features.
- Full source-to-curriculum mapping of all 300 research IDs remains open, despite available source-linked research decisions.
- Improve personalized learner diagnostics, retrievability, active recall, conflicting examples and protected assessment coverage while keeping grading separate.
- Review changing market and brokerage regulations on their own effective/transition dates; FINRA 2026 intraday margin change has broker transition through October 2027.

## VII. Release and scorecard rules
Baseline before this batch: 94 teaching guides + 22 glossary = 116 authored entries.
New work authored: 61+22+50 = 133 source-only guides.
New intended published total: 227 teaching guides + 22 glossary = 249 authored entries.
No new scored competencies: 30 unchanged. No change to 419 canonical Lab IDs.
No new verified historical replay cases: zero certified in this batch.
No personal advice, trade order, LIVE payment, paid inference, production database or Lab assessment alteration.
Acceptance requires tested exact GitHub SHA and matching successful Cloudflare deploy. Real Founding 600 member journeys remain separate.
