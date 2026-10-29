# Free & Paid Journal + Advanced Trade-Plan Builder Integration — Phase 1
**Document:** SMFGU-JOURNAL-TRADEPLAN-20261029-001
**Project:** The Stock Market: From the Ground Up
**Date:** 2026-10-29
**Branch:** main (Owner's single-branch rule)
**Status:** Source implemented, targeted CI and deployment must be verified at the **final** commit; real authenticated Owner and Free/Paid beta sessions remain separate acceptance gates.

## Reuse, not duplication
- The Free and Paid Journal share the **existing decision_journal** table, original Free weekly quota enforcement and immutable `trade_plan_snapshots` locking contract.
- The Advanced Workbench continues to save private, append-only `ADVANCED_TRADE_PLAN_SNAPSHOT_V1` versions in existing `tool_workspace_records` under tool code `WATCHLIST_WORKBENCH`.
- Paid Journal Analytics retains its existing server-enforced `JOURNAL_ANALYTICS` entitlement and existing self-reported performance calculations. No duplicated book of trades, duplicate SKU, or unverified provider feed.
- All work uses existing Auth/RLS/role and privacy boundaries.

## Free Journal
- Basic Research & No-Trade Review measures local authorized Journal rows: decision count; no-trade count; research evidence-notes presence; invalidation-notes presence; locked original plan count.
- Optional local Apache ECharts chart for the counts by record state; the numeric fallback remains usable without ECharts.
- Flags partial 3,000-record history rather than presenting a truncated total as complete.
- Existing Free Journal limit remains 15 new records per Monday 00:00 UTC week, with existing Simulator savings accounting; Free learning steps and no-trade observations remain available.
- These measurements are presence-of-notes counts, not verified catalyst quality, trading outcomes, educational grades, backtesting or win probabilities.

## Paid Journal Analytics
- A separate new, authenticated, server-computed `/api/journal-research-quality-v1` now reports document completeness with denominators and missing counts, recorded NO TRADE share, plan locking, documented plan adherence, strategies studied and grouped personal Journal record types. No raw notes, journal IDs or holdings are returned.
- The existing paid analytics API for self-reported P&L/R, MFE/MAE and cost exclusion remains unchanged.
- The new paid panel uses member-scoped data and an optional Apache ECharts chart; the server verifies `JOURNAL_ANALYTICS` access on every request, including current Auth and role checks.
- No predictive win rate or market source verification is claimed.

## Cross-product saved plan handoff
- `/api/journal-plan-prefill?planId=<id>` is a **GET-only**, owner-scoped data read requiring current entitled `WATCHLIST_WORKBENCH` access. Source is an authorized saved plan snapshot, not a public link to sensitive plan data.
- A member can choose **Transfer saved version to Trading Journal** from the existing saved-version list.
- The Journal's existing **Create & Open Record** step remains required, so Free quotas, RLS, and status/membership constraints still apply.
- On the new unlocked draft, **Apply saved plan to this draft** fills visible fields for review (ticker, context, catalyst, source as-of timestamp, thesis, trigger, initial invalidation, entry, stop, target, risk-based shares and exit plan). The member explicitly presses **Save Draft** to persist to existing Journal and can lock later with the original protected mechanism.
- No trade, fill, P&L, competency award, or immutable snapshot is fabricated. Imported PLAN is mapped to WATCH rather than treating a proposed entry as a real execution. Empty draft and same-user checks prevent overwriting existing plans.

## Advanced Trade-Plan Builder Phase 1 improvement
- Existing research fields, long/short modeled risk, one-share reserve, stop vs stop-limit instruction, three target prices, spread/slippage/gap stress, partial fills and Chart-to-Catalyst ECharts remain.
- New **whole-share scale-out allocation** controls for Targets 1, 2 and stretch target require nonnegative integer percentages totaling 100%, with price validation and gross illustrative target result and blended R; protects rounding so allocated shares total the planned size.
- New saved snapshot versions include the modeled scale-out plan alongside original user-entered data; existing saved versions continue to load.
- Existing session-entered data are not auto-submitted as actual fills.

## Commercial status
- `JOURNAL_ANALYTICS` and `WATCHLIST_WORKBENCH` product-policy records were staged with `trial_access=true`, `paid_access=true` and proposed `purchase_durations=[1,7,14,30,180]`.
- Both policies remain in **legacy** mode; these are eligibility/catalog metadata, NOT checkout-activated offers, stand-alone SKUs, Stripe price authorizations, Lumen redemption or membership benefits.
- Feature bundles, add-on standalone Advanced Trade-Plan Builder pricing and trial issuance need separately approved catalog prices, entitlement grants, expiry/refunds, full Stripe TEST and Lumen confirmation acceptance. No LIVE paid transaction or credit deduction performed.

## Testing and remaining roadmap
Automated tests:
- `tests/test_journal_plan_handoff_v1.mjs`: owner scoped plan transfer, access denial, Free existing creation & immutable lock authority.
- `tests/test_journal_research_quality_v1.mjs`: no future/invalid rows, denominator, missingness, field source and restrictions.
- `tests/test_advanced_trade_plan_builder_v1.mjs`: risk and scale-out calculations, preserved snapshots, ECharts, deep links.
- `.github/workflows/market-analysis-v014146.yml` now includes the new API and frontend syntax checks.
Not yet implemented or independently accepted:
1. Authenticated browser acceptance of both Free and entitled Paid Journal and exact Save Draft/lock from a saved Workbench snapshot.
2. Direct automatic completed-plan-to-journal creation without explicit draft review is intentionally NOT implemented.
3. Deep licensed news/EDGAR/earnings/float/corporate-action feeds and catalyst-to-chart automatic verified historical publication provenance.
4. Paid-only research-to-trade conversion metrics across databases, detailed plan/actual comparison with proper ledger mapping, immutable thesis revision events, portfolio exposure modeling, trailing stop bar-by-bar modeling, partial fills and transaction fee reconciliation.
5. Separate add-on or Pick What You Want cash/Lumen checkout for micro tools, tests of trial expiry and membership inclusion, current retail entitlements.
6. Existing 419 Labs, Boot Camps, Market Tutor, Market Commons, skill grades and historical replay remain their own editorial/auth/market-data acceptance work. No assertion that all have been rewritten.
