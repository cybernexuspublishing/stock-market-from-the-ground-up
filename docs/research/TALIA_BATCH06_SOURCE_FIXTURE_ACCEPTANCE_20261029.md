# Talia — Batch 06: Source-specific Numeric Fixtures and Remaining Acceptance Gates

**Date:** October 29, 2026  
**Project:** The Stock Market: From the Ground Up  
**Implementation:** Five additional source-described methods, each with an explicit synthetic chart or external fictional reference fixture, no real market-data provider impersonation.

## Exact count

134 existing nine-stage source-only Guided Practice modules remain unchanged: 61 indicators, 22 advanced watchlist, 50 STT named research workflows, one SEC/issuer event-only chronology.

**53 indicators** now have first-party numeric calculations with declared source/model variants, up from 48. **Eight indicators remain interpretation-only** because their complete methods depend on 52+ bars and/or multi-security, options, or proprietary vendor inputs.

## New implemented examples

| Module | Numerical work | Evidence and licensing limits |
|---|---|---|
| Parabolic SAR | Classic two-seed price-based SAR with 0.02 AF step, cap 0.20 and prior-two-bar clamp | Historical price series is fictional; a SAR point is not an executable stop order |
| Supertrend | Declared HL2 ± 3×Wilder ATR(10) carry-forward band method and close-based direction transition | Platform implementations differ; no proprietary vendor trend predicted |
| Classic Pivot Points | P=(H+L+C)/3 with separate **invented previous session** H=21.40, L=17.90, C=19.50 | Deliberately NOT claimed to be the actual previous session of the chart |
| Matched-Time Relative Volume | Current fictional cumulative bar volume ÷ average cumulative to same elapsed minute across **five invented previous sessions** | Separate day curves are a classroom fixture, not live market-volume history |
| Relative Price versus Benchmark | Present completed fictional security close ÷ separately generated aligned base-100 synthetic benchmark | Not a real index/ETF, no real corporate-action or total-return adjustments |

Source methodology: ChartSchool technical-indicator catalog, thinkorswim manuals, and the owner's STT source archive; every first-party calculation is an educational implementation with openly specified parameters. Where no full reliable input series is present, the curriculum must show the variant/fixture's limits.

## Eight interpretation-only indicator subjects

1. Full 9/26/52 Ichimoku Cloud with correct displacement and a sufficiently long completed-bar source.
2. StockCharts Technical Rank (SCTR), using vendor-defined scoring not a reproduced proprietary formula.
3. Genuine advance/decline line requiring dated market breadth across a defined universe.
4. New 52-week highs minus lows requiring year-long prices and issuer membership.
5. McClellan Oscillator requiring appropriate 19/39 EMA input from historical market-wide net advances.
6. Percent above moving average requiring all universe securities and consistent price basis.
7. Put/call volume ratio requiring full comparable option-volume scopes/venues and classification.
8. VIX-context index calculation requiring eligible options strips, terms, strike and Cboe methodology rather than single-stock OHLCV.

These eight remain teachable as concept, formula, use case, limitation, simulation decision, misconception feedback and transfer. They cannot be honestly called **calculated live trading signals** with the current single-stock synthetic fixture.

## Exact 300-topic source register audit

An updated separate 300-row crosswalk v2 was built by joining the original numbered archive `RESEARCH_001_300_COVERAGE.json` to the same upload's `RESEARCH_SOURCE_REGISTER.csv`. The 320-row source register supplies source URLs that were absent from the original crosswalk: 1,245 missing reference URLs have been rehydrated, bringing all 1,683 crosswalk source citations to a recorded URL; 300/300 topics now reference at least one URL. This demonstrates **source register metadata completeness only**: links may be paid, account-only, dated or partially reviewed, and link existence alone does not verify the source claim, live availability or commercial redistribution rights.

All 300 topic-level curriculum mappings explicitly retain `not_yet_individually_approved`; no editorial review was forged. The user receives a separate v2 Markdown and machine-readable JSON with source ID, original archive status, candidate link, access description, archived review status, legal/source caveat and disposition.

## Historical replay status

CREX April 28, 2020 original issuer event time remains verified from the 3:01 p.m. ET press release and its same-day SEC Form 8-K. No independently checked exact exchange OHLCV, NBBO, halt/correction record, redistribution rights or broker fills are present. The issuer event-only lesson is therefore not a verified price/trade replay.

A genuine commercial historical replay requires: authenticated rights/permission to display source data, feed scope and provider data lineage, adjusted/raw corporate-action controls, independent crosschecking with an exchange or SIP reference, completed bars frozen at the pre-outcome decision, bid/ask and slippage uncertainty, protected editorial assessment, and genuine member acceptance.

## Release rule

Only mark the implemented calculation batch accepted when **Market Tutor Trust + Guided Practice browser testing at both widths + production Cloudflare commit match** succeed. Full sitewide CI and actual member comprehension remain separate; no noncharging automated test can substitute for the latter.
