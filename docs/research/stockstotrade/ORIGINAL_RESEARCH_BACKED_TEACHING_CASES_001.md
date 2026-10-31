# Original research-backed teaching examples — Evidence Pack 001
**Document ID:** SMFGU-EDU-EVIDENCE-CASEPACK-001
**Version:** 1.0 | **Date:** 2026-10-31
**Status:** Editorial-ready examples, **not approved production lessons**
**Project:** The Stock Market: From the Ground Up
**Repository:** docs/research/stockstotrade/
**Google Drive:** Not created
**Scope:** Improvements for already existing 419 Labs and 247+5 Academy/Free days; do not add curriculum records.

All numbers and issuers below are **fictional demonstrations**, not historical data, market projections, or advice.

## Example 1 — Quote, last sale, and order execution
**Primary evidence:** SEC Investor Bulletin, updated 2026-08-18: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14

**Concept:** A last-traded price is a past execution, not an executable offer. Market order price is not guaranteed; limit order price is bounded but fill is not guaranteed.

**Worked demonstration:** At 10:00:00 ET, hypothetical ticker FICT has a last sale of $20.00. At 10:00:01 ET the displayed best ask is $20.08 for 25 shares. An order to purchase 100 shares cannot be assured 100 shares at $20.00 or $20.08. The 25-share offer may change, and the remaining 75 shares may require higher prices or may not execute depending on order type.

**Counterexample:** A buy limit of $20.05 does not authorize paying $20.08, but the limit order can remain unfilled.

**Fresh transfer:** Last sale $7.50, ask $7.57 for 10 shares, intended buy 80 shares. Name the required missing evidence; state why a total fill at either price is not demonstrated.

**Assessment boundary:** Ungraded self-check; protected score must use a separately generated case and private rubric.

## Example 2 — Source chronology and Form 8-K
**Primary evidence:** SEC Investor.gov: https://www.investor.gov/introduction-investing/investing-basics/glossary/form-8-k ; https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/how-read-8

**Concept:** Certain material issuer events generally require Form 8-K within four business days, with exceptions; an 8-K filing is not necessarily the earliest market disclosure.

**Worked demonstration:** A fictional issuer issues a dated public news release at 08:45 ET. A hypothetical 8-K filing is accepted at 15:10 ET on the same day. A 09:30 ET participant could potentially have read the release but not the later 8-K. The analyst must verify actual release distribution and EDGAR timestamps before using this logic for real cases.

**Counterexample:** A news article published at 11:00 ET retrospectively discussing the release is not evidence that the 8-K existed at 09:30 ET.

**Fresh transfer:** Fictional event: press release 16:10 ET Tuesday, filing 08:15 ET Wednesday. What source could the Tuesday-after-close learner know? Why is a Wednesday chart no proof of what Tuesday readers knew?

**Assessment boundary:** No score until independent source order and timestamps are captured.

## Example 3 — Candlestick structure and intrabar limits
**Evidence basis:** OHLC arithmetic, not a purported historical trade.

**Worked example:** FICTIONAL five-minute OHLC: O=$20.00, H=$21.50, L=$19.50, C=$21.00. Real body = |21-20| = $1.00. Full range = 21.50-19.50 = $2.00. Upper wick = 21.50-max(20,21) = $0.50. Lower wick = min(20,21)-19.50 = $0.50. Body share = 1/2 × 100 = 50%.

**Counterexample:** If H=L, range is zero; body/range is undefined, not 0%. One completed OHLC bar alone cannot prove whether high occurred before low.

**Fresh transfer:** FICTIONAL O=12.40, H=12.90, L=12.10, C=12.20. Student calculates body, range and wicks and explains which sequence facts remain unknowable.

**Assessment boundary:** Do not expose protected exact answers in public scored lessons.

## Example 4 — Risk per share and hypothetical position size
**Evidence basis:** Basic arithmetic and SEC caveat on market and stop fills; no execution guarantee.

**Worked demonstration:** Hypothetical entry $12.00, planned invalidation $11.60, maximum planned loss budget $40.00. Risk per share = $12.00-$11.60=$0.40. Arithmetic maximum by planned stop gap = floor($40.00/$0.40)=100 shares. This does NOT establish maximum realized loss: gaps, halt, spread, fees and stop-market slippage can increase realized loss.

**Counterexample:** A planned $11.60 stop is a trigger/plan, not a guaranteed $11.60 sell execution.

**Fresh transfer:** Entry $8.20, invalidation $7.95, proposed risk budget $25. Calculate theoretical shares and name execution and liquidity limitations.

**Assessment boundary:** Fictional model; independent assessment must test actual spread/fee and no-trade decision separately.

## Example 5 — Distinguish scanner results from trading evidence
**Third-party research candidate:** https://stockstotrade.com/stock-scanner-vs-screener/

**Concept:** A scanner signal is a filter match at a defined moment; it does not verify primary catalyst, executable liquidity, or profitability.

**Worked demonstration:** Fictional scan settings: minimum share price $2.00; 5-minute volume ≥100,000; daily relative volume ≥2.0 under a specified lookback definition. Fictional ticker ABCF qualifies at 10:05 ET with price $3.20, 5-minute volume 120,000, and defined relative volume 2.2. It is a research candidate, not a buy recommendation. Require data-feed timestamp, universe exclusions, float as-of date, corporate-action adjustment and spread check.

**Counterexample:** A stale float or delayed volume record may falsely identify a ticker as meeting the filter.

**Fresh transfer:** Ask learner to evaluate one candidate with missing spread and one with fully defined fictional inputs, choose WATCH or NO TRADE with justification.

**Assessment boundary:** No assertion of edge without defensible backtest and trade costs.

## Editorial acceptance requirements
Before inserting any case into production, verify its exact target Lab/day ID; first-principles instruction, fresh case independence, display accessibility, numerical checks, assessment isolation, and appropriateness for that lesson. Do not change approved 671-unit inventory or publish protected grading keys.
