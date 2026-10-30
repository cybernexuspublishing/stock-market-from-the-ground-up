# Advanced Trade-Plan Builder — Order Lifecycle Educational Extension V1

**Document ID:** SMFGU-TRADING-PLAN-ORDER-001
**Project:** The Stock Market: From the Ground Up
**Owner:** Site Product Owner
**Version:** 1.1
**Created / revised:** October 30, 2026
**Repository:** cybernexuspublishing/stock-market-from-the-ground-up · main
**Google Drive location:** Not assigned; GitHub is the document of record
**Filename / type:** 2026-10-30_ADVANCED_TRADE_PLAN_ORDER_LIFECYCLE_V1.md / Markdown
**Status:** Source implemented; exact-commit CI, production deployment and authenticated browser acceptance are independent gates.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-30 | Educational order-state transitions, member-entered fills and cancellation-race exercises |
| 1.1 | 2026-10-30 | Authorized temporary Chart Studio saved-plan overlays; additional read-only source tests and Supabase existence verification |

## Dependencies / controlling decisions

- Preserve existing authenticated WATCHLIST_WORKBENCH feature, member entitlements and account-scoped research.
- Percentage-based scale-out, multi-target risk, local revealed-candle trailing-stop instruction, source-linked Journal prefill, Journal research links, paid research quality analytics, and the new atomic Journal-transfer migration exist in the repository; this release does not duplicate or replace them.
- The migration file alone is not evidence that production SQL has been applied or that a full authenticated member journey passed.
- Free tier limits (20 manual watchlist symbols; 15 new Journal records/week and 10 simulator saves/week as previously approved) and Founding Member benefits remain unchanged.
- The owner-directed Pattern Day Trading content remains excluded.

## Implemented source changes

1. assets/js/trade-plan-order-lifecycle-v1.js: pure deterministic manually driven state machine, accepted states DRAFT, SUBMITTED, WORKING, PARTIALLY_FILLED, PENDING_CANCEL, FILLED, CANCELED, REJECTED, EXPIRED.
2. Explicit valid transitions for submission, acknowledgment, partial fill, complete fill, cancellation request, cancellation acknowledgment, rejection and expiry. Additional fills may occur after cancel request but before acknowledgment.
3. Member-entered whole-share quantity and positive hypothetical prices; never model overfills. Cumulative hypothetical quantity, remaining shares, notional and weighted average fill.
4. Validated timezone-aware, ordered timestamps and rejection of illegal transitions and future-dated events.
5. advanced-tool.html loads the new engine before the existing plan builder. assets/js/advanced-trade-plan-v1.js adds independently accessible 3. Order Lifecycle tab. assets/css/advanced-trade-plan-v1.css provides responsive controls and status/event history.

## Chart Studio temporary plan levels (source implemented)

- functions/api/chart-plan-levels-v1.js implements an independent read-only GET route. It checks the current WATCHLIST_WORKBENCH entitlement through the existing advancedToolContext and selects only the authenticated member's saved scenario_review row by ID and tool code. It returns only entry, stop and up to three target price references, ticker, direction and historical observation time. It returns neither raw research notes nor licensed candles.
- assets/js/chart-plan-handoff-v1.js supplies an optional authenticated simulator handoff using a numeric plan ID as a locator. Source values never appear in the URL, local storage, or another member's session.
- assets/js/crownlight-chart-studio-v2.js keeps imported plan levels strictly in memory (tempPlan), clearing them on account changes/sign-out; they are NOT saved with appearance preferences. Prices are displayed only if the chart's exact symbol matches and its latest REVEALED candle timestamp is strictly later than the member's source plan observation timestamp. Arbitrary source labels do not prove symbol identity.
- simulator.html loads the handoff and the plan history now links to it. Ordinary chart operation remains unchanged without the trade_plan query parameter.
- tests/test_chart_plan_levels_v1.mjs validates authorization, source row selection, chronology, invalid stops, privacy and UI integration.

**Read-only Supabase verification:** On October 30, 2026 the primary stock-market Supabase project returned existing public.gu_watchlist_journal_transfers_v3, public.gu_watchlist_to_journal_v3(uuid,bigint), public.gu_journal_research_links_v1, public.tool_workspace_records and public.decision_journal. This verifies objects exist, not that an authenticated live member automatically completed a transfer.

## Non-capabilities and restrictions

All events and prices are manual, fictional educational inputs. No broker order, live quote, actual trade, verified fill, Journal record, protected assessment, real P&L, stop guarantee, automatic stop-limit matching or transaction is created. The scenario is in-memory only, with no fetch, persistence or cross-member sharing. A pending cancel is not a confirmed cancel. This release makes no Stripe, cash or Crownlight Sparks changes.

## Automated tests and acceptance

tests/test_trade_plan_order_lifecycle_v1.mjs covers complete/partial fills, cancel races, terminal statuses, overfills, invalid actions, chronology and nonpersisted educational behavior. Included in .github/workflows/research-tools-v014145.yml.

Additional acceptance must establish successful exact-commit CI and production deployment, legitimate authenticated entitled-member browser interaction, Free entitlement denial, and mobile/responsive accessibility. Do not assert those gates passed solely because source code was committed.

## Remaining planned expansion

- Authenticated cross-session and historical replay acceptance of the now-implemented Chart Studio plan-level overlay; reject unverified source labels and demonstrate no future price references.
- Authorized automated SEC/issuer filing retrieval with actual source metadata, known publication and discovery timestamps, rate limits and no assumed rights to third-party news.
- Linked research-to-trade analytics with denominators, fee treatment, actual evidence and unknown fields instead of inferred trades.
- Duration-based cash or Crownlight Sparks tool entitlements sharing one server-ledger and price registry, preserving approved membership benefits. Exact one-month/six-month definitions, unit pricing, idempotent credits, payment-signed grants, refunds and revocations are separate commercial acceptance tasks.

**Prepared for:** Internal product, engineering, QA and release governance.
