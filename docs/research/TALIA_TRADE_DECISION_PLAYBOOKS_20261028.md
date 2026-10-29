# Talia Tutor — Entry / Hold / Exit / Wait decision teaching, batch 01
Date: 2026-10-28. Owner request: source-informed scenario coaching for *why* a setup may justify a hypothetical entry, hold, exit, or NO TRADE.

## Research sources and boundaries
Original, rewritten educational frameworks informed by the owner's `STT.zip` (scanner states, setup variants, risk/entry archetypes and execution) and `StocksToTrade-Browser-Research (6).zip` (data scope, candles, evidence chronology, stops, relative volume, market data and research validation).
Independent public sources reviewed: CME Group trade-plan criteria and risk sizing, SEC Investor.gov order and stop-order bulletins, Fidelity's exit planning and intraday studies, Schwab chart patterns and volume interpretation, and StockCharts' VWAP, support/resistance and breakout scanning resources. Reference URLs are individually recorded per playbook in `data/tutor-decision-playbooks-v1.json`; the contents are **original** educational paraphrases and fictional case prompts, not imported copyrighted course material.
The source archives do not certify any tested strategy's positive expectancy. Some source educational pages discuss futures; transfer of planning concepts to stocks requires explicit scope and broker-specific mechanics.

## Delivery
18 separate trade-decision playbooks teaching:
- decision-state framework; confirmed breakout; retest; failed breakout;
- trend pullback; VWAP reclaim/rejection; opening-range break;
- gap continuation/fade; range boundary; HH/HL continuation;
- structural reversal; support retest; mean reversion; short breakdown;
- news catalyst chronology; partial exit/time stop/position management.

Every playbook independently explains **what to watch**, **entry evidence**, **hold evidence**, **exit evidence**, **WAIT vs. NO TRADE**, **invalidation**, **execution/data limitations**, an original fictional timeline and an ungraded self-check. No current-ticker signal, automated order, stop guarantee, investment recommendation or hidden future bars.

`functions/_lib/original-competency-tutor-v014100.js` optionally loads the static public playbooks only for decision-intent questions; topic-specific ranking prevents generic entry/exit language from hiding the actual setup. If this asset is absent or malformed, the original thirty official competency guides and older source-only catalog remain accessible.
`functions/api/market-tutor-v01492.js` retains authenticated access, verified conversation, the NO personalized advice rule, and its privately controlled quota. A retrieved decision playbook always uses its authored **source-only** five-decision format, even when the client requests model inference; no new paid provider calls.
`tests/test_tutor_trade_decision_playbooks_v1.mjs` runs in Market Tutor Trust CI. It checks all eighteen playbook contracts, twenty-/fifty-word topic collisions, optional-catalog fallback, authenticated synthetic Tutor reply, no billing and no competency grades.

## QA limits
This is tested authored teaching and synthetic auth; real Founding 600 member/browser acceptance, historical-data licensing, and strategy-performance validation are separate.
The 30 official competencies and the canonical 419 Lab IDs are not edited by this expansion.
