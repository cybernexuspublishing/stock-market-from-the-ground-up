# StocksToTrade transcript research intake and Tutor integration — 2026-10-29

| Document control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Document ID | SMFGU-RSCH-STT-VIDEO-20261029-001 |
| Filename | STT_VIDEO_TRANSCRIPT_RESEARCH_INTAKE_20261029.md |
| File type | Markdown research register |
| Version | 1.0 |
| Date | 2026-10-29 |
| Status | Source-informed original educational adaptation; exact-commit CI and production verification required |
| Google Drive location | Not assigned; GitHub `docs/research/` is the source repository location |
| Dependencies | Talia existing Tutor catalog and optional ASSETS loader; Cloudflare Pages build pipeline; market-tutor Trust CI |
| Purpose | Attribute user-supplied research, set evidence limitations, document educational integration and follow-on editorial work |

## Scope and provenance

Owner supplied multiple pasted StocksToTrade and SteadyTrade YouTube transcripts plus twenty separately attached pasted-text extracts on 2026-10-29. The provided transcript extracts are the research input; individual YouTube URLs, source video files, authenticated screenshot frames, original market data and original publication dates were **not supplied or independently verified** in this intake. Auto-generated transcription is especially error-prone for tickers, timestamps, numeric prices, and speaker names. This file does not republish the third-party transcripts.

The 14 learning cards below are first-party summaries and corrective teaching notes, not reproductions of third-party text or licensed chart material. Their STT-VIDEO identifiers are internal topic records, **not asserted original video IDs**. This new work extends prior `TALIA_STT_SOURCE_KNOWLEDGE_20261028.md`; it does not replace the earlier ZIP-derived source register, the 30 canonical competencies, the 419 registered Labs or 134 existing practice modules.

## Source-to-original-learning register

| Internal research ID | Original lesson topic | Machine-readable lesson ID |
|---|---|---|
| STT-VIDEO-01 | Candlestick OHLC and intrabar-sequence uncertainty | `VIDEO_CANDLE_SEQUENCE` |
| STT-VIDEO-02 | Price gaps, doji bodies and separate volume bars | `VIDEO_GAP_VOLUME` |
| STT-VIDEO-03 | Stop-market, stop-limit and trailing-stop execution limitations | `VIDEO_STOP_REALITY` |
| STT-VIDEO-04 | Precommitted trade thesis, trigger, invalidation and exit objectives | `VIDEO_TRADE_PLAN` |
| STT-VIDEO-05 | Volume versus executable liquidity and position size | `VIDEO_LIQUIDITY_SIZE` |
| STT-VIDEO-06 | Opening dip and later high-level reclaim as an observational pattern | `VIDEO_DIP_RECLAIM` |
| STT-VIDEO-07 | VWAP holds, reclaims and afternoon continuation uncertainty | `VIDEO_VWAP_AFTERNOON` |
| STT-VIDEO-08 | Prior-day-close red-to-green versus individual candle colors | `VIDEO_REDGREEN_PDC` |
| STT-VIDEO-09 | Breakouts, whole-dollar levels and failure confirmation | `VIDEO_BREAKOUT_LEVELS` |
| STT-VIDEO-10 | Hot sectors, sympathy candidates and catalyst verification | `VIDEO_SECTOR_EVIDENCE` |
| STT-VIDEO-11 | Short squeeze mechanics and evidence limits | `VIDEO_SHORT_COVER` |
| STT-VIDEO-12 | Trading journal source records, position sizing and review | `VIDEO_JOURNAL_EVIDENCE` |
| STT-VIDEO-13 | First completed red five-minute bar as a possible exit-review cue | `VIDEO_FIRST_RED_EXIT` |
| STT-VIDEO-14 | Cash, margin and 2026 intraday-margin transition | `VIDEO_BROKER_MARGIN` |

## Evidence safeguards and corrections

1. **Candlestick and replay chronology.** Color, OHLC, wicks and volume can be measured, but one candle cannot prove the order of intrabar events. A doji body can be small while the full wick range is large. Historical tickers and example prices mentioned in spoken clips are not independently accepted market cases.
2. **Stops and executable risk.** Stop-market triggers are not guaranteed execution prices; stop-limit orders can remain unfilled. Trailing stops, market hours, halts, spreads, quote depth, routing, and adverse slippage must be part of risk instruction. See SEC Investor.gov, updated August 18, 2026: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15
3. **Liquidity and position sizing.** A claimed daily one-million-share floor is the speaker's heuristic, not a universal execution guarantee. Keep share volume separate from time-specific quoted depth and effective spread.
4. **2026 U.S. margin change.** Older statements about three permitted day trades and a universal $25,000 PDT minimum must be labeled historical: new FINRA intraday-margin standards took effect June 4, 2026, with a permitted firm transition through October 20, 2027. Check the actual broker's implementation and account agreement. Official reference: https://www.investor.gov/introduction-investing/investing-basics/glossary/pattern-day-trader
5. **Market-hypothesis rigor.** Hot sectors, round-number levels, premarket dips, red-to-green moves, VWAP afternoon holds, low float and claimed short squeezes are observational setup language, not independently verified positive-expectancy signals.
6. **Hindsight and marketing.** Anecdotal trader profits, probabilities, claimed hit rates, broker offers and older commentary about a then-current market are not reproduced as current facts or investment recommendations.
7. **Copyright and rights.** No user-uploaded third-party transcript is added verbatim to this public repository. Do not publish vendor screenshots, video frames or proprietary scanner formulas without a documented reuse license. Do not embed outside affiliate campaigns.

## Implemented source architecture (pending CI and deployment verification)

- `data/tutor-video-transcript-research-v1.json`: fourteen first-party, source-grounded, ungraded cards, with concept, instructional procedure, risk limitation, invalidation, common mistake and transfer question.
- `functions/_lib/original-competency-tutor-v014100.js`: optional fail-closed static source loader; retrieved cards participate in the existing deterministic Tutor selection without changing the authenticated, permission-checked Tutor API or requiring additional paid AI.
- `scripts/build-pages.sh`: explicitly publishes the original public teaching asset, not private scoring rubrics or raw transcripts.
- `tests/test_tutor_video_research_v1.mjs` and Market Tutor Trust workflow: validate counts, source flags, retrieval, optional fallback, and build inclusion.

## Educational follow-through — NOT YET IMPLEMENTED

| Scope | Editorial action | Acceptance needed |
|---|---|---|
| Free Foundations | Add zero-knowledge OHLC/doji, risk-order, liquidity and trade-plan worked examples using existing teaching-first navigation | Real member experience, accessibility, original diagrams, no false grades |
| Boot Camp Academy | Link opening dip/reclaim, VWAP continuation, red-to-green and no-trade cases into the established nine-stage engine | Preserve existing program identities, protected scoring and cross-session resume |
| 419 Labs | Review only relevant original Lab IDs individually and amend teaching bridges after editorial approval | No arbitrary retitling, no fabricated historical OHLCV, no answer-key leak |
| Historical workbook | Research the named tickers and dates against licensed historical data and chart-use rights | Independently verified source, chronology and publication permission |
| Risk/Journal | Add stop-execution exceptions, spread/size, thesis drift and before/after timestamped review | Server controls, retention and role permission QA |
| Broker/rules guidance | Apply current FINRA transition note to all extant copy referencing legacy PDT rules | Broker-specific language, legal review and sitewide regression |

## Release gate and rollback

No payment, Stripe configuration, live charge, Supabase migration, curriculum mastery award, existing 419 Lab registry or member-owned data is changed by this research intake. Passing syntactic/static tests alone cannot verify a Cloudflare production deployment or authenticated learning journey. If retrieval fails, the existing canonical Tutor guides remain usable. Roll back this single commit if a new public source asset causes the build or Tutor contract suite to fail.

### Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-29 | 1.0 | Indexed transcript themes and prepared 14 original ungraded Tutor teaching cards | CI/deployment verification required |

**Footer:** Crown & Lantern Press — internal research provenance and first-party curriculum adaptation. Educational material only; no profit or execution assurances.
