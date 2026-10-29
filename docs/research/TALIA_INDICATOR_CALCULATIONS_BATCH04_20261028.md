# Talia — Indicator Calculation Expansion (Batch 04)

**Project:** The Stock Market: From the Ground Up  
**Date:** October 28, 2026  
**Version:** 1.0  
**Status:** Implementation candidate pending exact-commit Tutor/website CI and production deploy. No grading, real market feed, market order, Stripe or paid model calls.

## Exact progress

- Total Guided Practice lessons unchanged: **134** — 61 indicators, 22 watchlists, 50 source-named strategy research cases and 1 verified issuer event-only chronology.
- Existing 20 numeric indicator calculations retained.
- Additional 12 implemented in the existing first-party synthetic engine (see table), increasing **numeric indicator demonstrations from 20 to 32**.
- Specialty source-only interpretive indicator lessons decrease from 41 to **29**. Those remain clearly labeled `Not calculated`. The rest of the 61 have source-reading teaching and nine-stage reasoning even when current numeric chart data cannot support them.
- Original reference library remains 227 study guides and 22 glossary entries. Official 30 scored competencies and 419 canonical Labs unchanged.

## Added actual calculations

| Source guide | First-party fictional calculation and caveat |
|---|---|
| DEMA | 2×EMA(close,N) − EMA(EMA(close,N),N); second EMA seeded on first valid values, needs 2N−1 completed closes |
| TEMA | 3×EMA1−3×EMA2+EMA3 with sequential seeded EMA stages; needs 3N−2 closes |
| MACD histogram | Original MACD(12,26,9) signal histogram using first-party SMA-seeded EMA; no early future/unstable value |
| Commodity Channel Index | (latest typical price − average typical price)/(0.015×mean absolute deviation), zero MAD unavailable |
| Absolute price momentum | Last completed close minus close N bars ago, not percentage ROC |
| Bollinger %B | (close−lower)/(upper−lower), zero band width unavailable |
| Bollinger BandWidth | 100×(upper−lower)/middle, zero middle unavailable |
| Anchored VWAP | Fixed **fictional 09:42 ET anchor** and HLC3×bar volume proxy. Explicitly **not tick-exact** |
| Dollar Volume | HLC3×bar volume for one completed candle; approximate notional **not real sum of trade×shares** |
| Accumulation/Distribution Line | Zero-seeded cumulative close-location value×volume; not identified cash/counterparty flow |
| Percentage Volume Oscillator | 100×(EMA12(volume)−EMA26(volume))/EMA26(volume), main PVO line only |
| Force Index | Latest close change×current completed bar volume; not actual buyer aggressor classification |

All methods have deterministic completed-bar inputs, explicit warmup and denominator handling, period definitions and source caveats. The indicator values come from invented data and cannot be linked to real historical price claims.

## Sources and controls

- https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays
- https://toslc.thinkorswim.com/center/reference/Tech-Indicators
- Original owner STT.zip and StocksToTrade-Browser-Research (8).zip calculations, critically interpreted instead of copying source screenshots or transcripts.

For proprietary methods, market breadth, options-derived sentiment and genuinely multi-security studies that cannot be calculated from a single fictional OHLCV series, the engine continues to say `Not calculated`, not fabricate an independent signal.

## QA gates

`tests/test_tutor_guided_practice_v1.mjs` verifies exact 32 numeric/29 interpretive counts; source-lesson lineage; DEMA/TEMA seeded math, PPO/volume separation, Bollinger formulas, fixed AVWAP bar-proxy anchor, CCI denominator, signed-volume methods, warmup, no future-bar leakage and unchanged ungraded status. Browser tests exercise all 134 lesson IDs and retain zero paid inference or order execution.

**Remaining:** 29 specialty indicator methods are conceptual/interpretation practice only, 50 named strategy methods are source-grounded hypothetical decision exercises rather than performance/backtest-certified cases, and historical stock-price replay still requires independently verified legally reusable market data.
