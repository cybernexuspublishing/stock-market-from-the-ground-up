# Talia — Curriculum Acceptance and Calculation Expansion (Batch 05)

**Owner request:** Work toward 100% verified instructional and historical replay acceptance, without inventing sources or claiming paid services are available.  
**Date:** October 29, 2026  
**Status:** Implementation and evidence audit; completion gates stated independently.

## Curriculum arithmetic

| Area | Current expected after Batch 05 | What this actually means |
|---|---:|---|
| Published public reference guides/glossary | 249 | Authored guide entries, not unique validated trade systems |
| Guided lessons | 134 | 61 indicator + 22 watchlist + 50 source-named STT strategy + 1 SEC/issuer event |
| Indicator lessons with a genuine synthetic calculation | **48** | Supported formula variants on fictional completed bars, not actual market quotes |
| Interpretation-only indicators | **13** | No invented proprietary, multi-security or options-derived values |
| Source research topics inventoried | **300** | Exact archive topic IDs and source IDs, not 300 editorial approvals |
| Approved real historical OHLCV cases added | **0** | CREX 2020 announcement is event-only; executable price/fill chronology unverified |

## Batch 05 calculations upgraded from interpretation-only

- Hull Moving Average: WMA(2×WMA(close,rounded N/2)−WMA(close,N),rounded sqrt(N)), explicitly state rounding.
- Kaufman Adaptive MA: efficiency-ratio N, smoothing fast=2 slow=30, declared SMA(N+1) seed.
- Two-EMA ribbon: EMA8 and EMA20 only; not the entire configurable vendor ribbon.
- Stochastic RSI: unsmoothed ratio normalized to RSI's own N-bar min/max, 0..1; no %D.
- TRIX: one-bar percentage ROC of third seeded EMA stage; warmup 3N−1 completed closes.
- KST: standard four component weighted smoothed ROC(10,15,20,30) / SMA(10,10,10,15), 45 completed closes.
- Aroon Up/Down: completed N+1-bar window, latest-tie algorithm; Aroon Oscillator=Up−Down.
- Directional Movement: Wilder-smoothed +DI, −DI and normalized DX; ADX seeded from N DX values and then Wilder-smoothed.
- Historical Volatility: sample standard deviation of N one-minute log returns, annualized by sqrt(252×390), clearly an illustrative RTH scaling choice rather than an observed daily series.
- Chandelier Exit: long highest-high(N)−3×ATR, short lowest-low(N)+3×ATR; not guaranteed broker stop prices.
- Fibonacci: fixed rolling low→high 61.8% level, no claimed discretionary structure or predicted reversal.
- VWAP deviation bands: session HLC3×volume **bar approximation** with one weighted standard deviation, no trade-accurate VWAP or live distribution.
- Chaikin Oscillator: EMA3−EMA10 of zero-seeded cumulative ADL with OHLCV bar sign proxy.
- Volume profile: fixed 8 price bins, allocate each completed bar's full share volume at its HLC3; the bin center with greatest approximate volume is **not** a genuine trade-at-price Point of Control.

Test requirements include exact library matches, sufficient warmup, null for invalid denominator/data, no use of unrevealed bars, correct unit interpretation, single chart/table rendering, differentiated misconception feedback, no official grades, no paid inference calls, no broker orders, no real data licenses altered.

## Remaining 13 specialty interpretations

| Domain | Current limitation and correct next evidence |
|---|---|
| Parabolic SAR | Needs an explicitly chosen recursive seed, reversals and acceleration factor, independently verified |
| Ichimoku Cloud | Needs 52+ completed bars and correct plotting of displacement without exposing future data at a past pause |
| Supertrend | Needs source-defined ATR band carry-forward and reversal variants, verified against independent example |
| Pivot Points | Previous completed session OHLC must be distinct from the chart session, not fabricated as if observed |
| Matched-Time RVOL | Needs multiple comparable previous dates at the same elapsed session time, not a guessed full-day average |
| Price Relative Strength | Needs independently dated, split/dividend-adjusted security and benchmark series |
| StockCharts Technical Rank (SCTR) | Vendor-defined proprietary component weighting; do not reproduce or invent official scores |
| Advance–Decline Line | Needs universe membership and contemporaneous net daily advancers/decliners |
| New Highs Minus Lows | Needs full qualifying security universe and rolling 52-week observation boundaries |
| McClellan Oscillator | Needs matched advancers/decliners and 19/39 style historical breadth EMA warmup |
| Percent Above Moving Average | Needs a complete eligible universe and each security's relevant completed-price MA |
| Put/Call Ratio | Needs comparable venue, instrument and contract-volume data, with index/equity scopes defined |
| VIX Index | Needs full Cboe qualifying option strike/term inputs and index formula conventions; synthetic exercise is not live VIX |

## 300-topic crosswalk — evidence findings

The user-supplied `StocksToTrade-Browser-Research (8).zip` source crosswalk has 300 distinct IDs in thirty 10-topic groups with 438 linked public-source references across rows. **76 topics have zero resolved external public source URLs** in the imported crosswalk. They may have archive-private source IDs and notes, which does not mean the research does not exist; it means the public link cannot currently be independently audited from this file.

Automatic candidate mapping breakdown: 24 topic-keyword candidate associations, 266 broad-context associations, 10 subjects without a candidate. **Editorial approvals: zero.** Do not change this field to `approved` merely because the topic has a plausible code or the originating research says `EDUCATIONAL_RESEARCH_COMPLETE`. The actual educational, legal and source chronology review must inspect each item's claims, relevant source passages, publication/market-data rights and as-of-time relevance.

## Historical replay — source and licensing gate

**CREX April 28, 2020 issuer event verified.** Original issuer release displays 15:01 ET and its SEC 8-K describes the announced ThermalMirror product. These sources establish announcement chronology, not an independent market quote or price move.

Relevant historical price data services: NYSE Daily TAQ offers historical transactions/quotes (venue and product scope varies), while Nasdaq Data Link terms restrict redistribution and software-as-a-service use unless authorized. A free public webpage view or a downloaded user-only provider PCAP is not itself authorization to publish historical candles commercially. Never infer a filled trade or historical positive expectancy from such material.

Evidence needed to accept first genuine market replay: authorized reproducible source file with display/redistribution approval, exact issuer and effective corporate actions, UTC plus ET timestamps, correct session and feed coverage, exchange halt/correction processing, independent OHLCV audit, source publication time, pre-outcome paused decision, explicit slippage/bid–ask and non-fill limits, independent editorial sign-off, and authenticated learner browser acceptance.

## Acceptance labels

- **Complete: source-research inventory** — 300 numbered records present; no editorial validation implied.
- **Complete: source-only interactive delivery** — 134 modules already integrated and targeted-tested.
- **Candidate: numerical calculator expansion** — 48/61 indicator calculations; CI and browser confirmation must pass on the exact GitHub SHA.
- **Not complete: authenticated 300-topic editorial certification.**
- **Not complete: real historical market replay and authorized commercial display rights.**
- **Not complete: actual Founding 600 learner comprehension.**

100% accepted must mean every *required* gate is supported by evidence, not merely that each topic has a row and a selectable nine-stage exercise.
