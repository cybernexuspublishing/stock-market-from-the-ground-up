# Advanced Trade-Plan Builder — Research Integration and Modular Access Specification
**Date:** October 29, 2026  
**Project:** The Stock Market: From the Ground Up  
**Owner direction:** Use the existing sitewide research and education architecture; small tools can later be sold in Sparks or USD for durations of 1 day, 1 week, 2 weeks, 1 month or 6 months.  
**Current status:** Source implementation deployed or in CI; new commercial offers and prices NOT AUTHORIZED.

## Actual implementation in existing products
- Advanced Trade-Plan Builder (assets/js/advanced-trade-plan-v1.js) is currently delivered inside the already authorized WATCHLIST_WORKBENCH tool, not under a second independent SKU. It has independent research, risk, review, catalyst timeline and saved-version sections.
- Member-defined fields: ticker, company, pattern, source URL and event time, thesis, catalyst, direction, higher-timeframe context, levels, trigger, stop/invalidation, order mechanism, targets 1/2/stretch, risk budget, account capital, spread/slippage/gap stress, holding period, cancellation, alternative hypothesis and PLAN/WATCH/REJECT/NO TRADE classification.
- Modeling: long/short scenarios, risk per share, cash-equivalent capital cap, a visibly disclosed conservative one-share reserve, optional desired size, exposure, stress loss, target R:R, entry variance, partial-fill assumption. Does not model borrow eligibility, guaranteed stop fills, fees, portfolio leverage or brokerage execution.
- Owner illustrative example: Entry $5.00, stop $4.80, target $5.60, risk budget $25. The theoretical limit is 125 shares; the disclosed one-share classroom reserve produces **124 shares, $24.80 modeled loss, $620 notional and 3.00:1 target reward/risk**.
- New private versions use the EXISTING authorized advanced-tool-workspace endpoint and EXISTING tool_workspace_records store. Each Save creates a new scenario_review row marked ADVANCED_TRADE_PLAN_SNAPSHOT_V1. No existing watchlist entry, Journal grade or immutable outcome history is overwritten.
- The current candidate list offers Build Trade Plan using in-page member data; no private plan is sent in a public URL.
- ECharts uses the locally installed Apache ECharts loader for risk stress and saved-candidate decision counts; all values are member-reported. Watchlist Intelligence gives denominator, missing timestamps/sources, and current state counts, never unverified win rates or P&L.
- Optional Catalyst-to-Chart uses the existing validated local CSV importer (2 MB, 20,000 bars) and reveal-one / next ten / reset controls. The publication marker is hidden until the *entered source timestamp* is within the visible candle range. The CSV remains local to this browser screen. This is not authenticated blind historical replay or lawful redistribution of third-party data.
- Existing Market Simulator Plan, Replay Execution and Results & Journal tabs now have no desktop chart-height cap or nested scrolling requirement. Underlying execution remains protected by existing scenario and plan preconditions.
- Talia's Observe, Explain, Investigate, Interpret, Challenge, Plan, Practice and Review method now appears in the planner without changing the shared 419-Lab catalog, protected assessment authority or existing 134 Tutor modules.
- Journal transfer in this version is an explicitly manual Copy Summary + Open Journal handoff. Automatic cross-service Journal import is NOT IMPLEMENTED.

## Proposed Add-On and Pick What You Want architecture — NOT FOR CHECKOUT
Future feature identity: ADVANCED_TRADE_PLAN_BUILDER (PROPOSED; NOT an authorized tool code, Stripe ID or payment entitlement). Future purchasable variants may be (a) individual add-on, (b) Pick What You Want selection, (c) a bundle with small tools, or (d) included membership benefit. Every path must resolve via the one approved server authorization model.

| User-requested window | Fixed-term candidate | USD / Sparks | Price and expiry semantics |
|---|---|---|---|
| 1 day | 24 hours | Either | Not yet approved |
| 1 week | 7 × 24 hours | Either | Not yet approved |
| 2 weeks | 14 × 24 hours | Either | Not yet approved |
| 1 month | 30 days or calendar month | Either | Owner definition required |
| 6 months | 180 days or calendar six months | Either | Owner definition required |

Suggested composable small tools: Plan Risk Calculator, Catalyst/Issuer Evidence Checklist, Source-to-Chart Timeline, Multi-Target Worksheet, Fill/Slippage/Spread Stress Worksheet, Watchlist Intelligence, Journal Plan Comparison. Use existing engines and IDs, not duplicated calculators or storage. Pricing/combination rules are not invented.

Approval gates before cash or Sparks sales: actual SKU/plan registry entry; exact duration; USD price or Sparks amount; plan precedence and discounts; purchase confirmation; renewal/stacking/refund semantics; UTC activation/expiry; auditable atomic server-side Sparks debit plus grant; verified Stripe payment event; idempotency; member/Showcase/Owner authorization tests; lapse and revocation; legal copy; Owner LIVE payment authorization. Purchased Sparks retain their existing non-expiration policy; included Sparks retain their existing 60-day rollover rules.

## Logical entities — proposal, NOT applied migrations
Owner-proposed research categories are watchlists, watchlist_items, security_identity, research_observations, catalyst_events, candidate_states, scanner_definitions, scanner_observations, chart_annotations, trade_plans, research_alerts and research_reviews. First reconcile with existing Supabase tool_workspace_records, protected Journal records, Free Watchlist account-scoped storage, existing rights registry and RLS. This source pass does not add tables or migrate member data.

## Remaining capabilities and downstream consumers
- Trade plans: percentage-based multi-target scaling, trailing-stop bar-by-bar simulations, order lifecycle and partial-fill execution, chase alternatives, portfolio exposure, immutable evidence/audit history, and authenticated automatic Journal transfer are separate engineering work.
- Deep catalyst/company research: licensed news feeds, earnings calendar, EDGAR integration, offering/split/ownership/float and balance-sheet history, FDA, former-runner and sector data, automatic source-score and rights-preserving historical company-event joins are NOT implemented by optional text inputs.
- Crownlight Studio: prefilled ticker/reference levels and chronological chart views require member-authenticated account/rights checks.
- Boot Camps/419 Labs/Talia: add source-specific exercises and editorial approval under existing teaching engine; do not duplicate Labs.
- Journal/Journal Analytics: future lawful joins to research-to-trade conversion, decision quality and modeled/actual costs. Do not infer real outcomes from saved research plans.
- Skills: research completeness and no-trade discipline must use actual graded or approved observational evidence, not self-checked source boxes alone.
- Historical Replay: no future observations before verified timestamps, independently accepted historical bars and publication rights.
- Market Commons: future sharing by explicit member consent and moderation, never exposing private trade-plan records by default.
- Training Editor/Admin Analytics: sourced lesson approvals, permissioned usage aggregates, error monitoring, no private research leakage.
- Membership Store: clarify Free education versus optional advanced tools only after product registry and actual access are reviewed.

## Acceptance status and source governance
Source math and integration tests: tests/test_advanced_trade_plan_builder_v1.mjs, existing workspace and watchlist life-cycle tests; Research Tools CI updated. Production/browser status must be checked against the exact main-branch commit.
New individual sales, prices, Sparks spending, new database tables, licensed market-data feeds, owner-verified end-to-end acceptance, out-of-sample profitable expectancy and 419-Lab editorial reapproval: **NOT IMPLEMENTED / NOT ASSERTED**.

**Rights:** Rewritten original education only. No vendor video transcript, screenshot, paid data, proprietary formula, or verified historical trade fill is reproduced by this feature.


## 2026-10-29 Owner-directed credit, paid-trial and sign-on bonus expansion

**Status:** Research and proposed public rebrand only; no active checkout, account-credit issuance, pricing alteration, database migration or LIVE payment authorization in this entry.

- **Rename direction:** Retire the member-facing name Crownlight Sparks. Recommended replacement brand: **Crownlight Lumens** (singular **Lumen**) to represent growing understanding through the Crownlight learning system. Owner's direction to rename is confirmed; the exact recommended wording remains subject to owner review and a name/trademark clearance check. Retain all existing technical `spark*` API paths, table/function names, ledger identifiers, SKU codes and historical audit references until a separate tested compatibility migration; do not reset existing balances.
- **Paid full-feature trials:** Eligible standalone tools, workbenches, research products or studio capabilities may offer a time-limited paid trial purchased using USD, Lumens, or an expressly priced combination. Each trial must use the authorized full-feature entitlement for the approved time period, with disclosed feature/usage quotas and a non-renewing default unless the member separately authorizes a renewal. Trials and permanent Free access are distinct, and lapse must not delete saved work.
- **Checkout discount rule:** The intended owner rate is interpreted as **1 Lumen = USD $0.10 (ten cents) off an eligible item's pre-tax price**; the phrase “0.10 cent” would mathematically mean $0.001 and must be clarified in customer terms as ten cents. Discount uses integer cents and integer Lumen quantities, is capped at the eligible subtotal, and never generates change, cash, financial assets, gift cards, withdrawn funds or a negative payable. Price/eligibility and grant/debit are re-verified on the server at checkout. Any memberships, recurring charges and discounts require explicit eligibility/stacking policy. Taxes/refunds must be handled consistently with payment-provider requirements.
- **One-time signup grant:** Proposed **200 promotional Lumens = up to $20.00 in eligible website discounts**, after verified eligible new-member signup (not a cash signup bonus). Grant exactly once with a unique, idempotent ledger event, anti-duplicate/fraud controls, and a visible member statement. The existing Free monthly grant, if active, remains a separately tracked program until owner decides whether to change it. Do not blindly award the bonus on every wallet GET, sign-in, or CAPTCHA completion. Promotional credits must be distinguished from purchased, earned, included and manually adjusted balance buckets for dispute, refund and marketing reporting.
- **Expiration:** Existing owner-approved V2 policy is that unspent credits do **not** expire across purchased, earned, included and operator-issued categories; this supersedes any superseded 60-day rollover wording elsewhere in this document. Time-limited purchased tool/trial entitlements **do** expire after their disclosed term. Do not create a credit-expiration regression during the rebrand.
- **Price/catalog discrepancy:** The current inactive package catalog lists 25 credits/$5.00, 55/$10.00, 90/$15.00, 125/$20.00 and 275/$40.00. These represent more than $0.10 paid per credit; the new fixed checkout-discount policy would offer less discount value than purchase price. Owner review must reconcile bundle prices, benefit-redemption rates, and credit valuation **before** enabling sales. Do not change LIVE prices or activate package checkout on assumption.
- **Member experience:** Display balance, estimated applicable discount, cash payable after Lumens, trial access window, and remaining balance in a transparent confirmation screen. Do not advertise the account grant as withdrawable cash or guaranteed purchasing power for every product. Preserve Founding Member included entitlements and avoid charging for already included tools.
- **Rollout gates:** Product/term eligibility; approved per-product trial USD/Lumen pricing and duration definitions; legal/rebrand terms and privacy language; correctly scoped signup grant; RLS/account separation; atomic confirmed-quote debit and entitlement grant; Stripe TEST payment/cancel/refund/webhook lifecycle; reconciliation/expiry/recovery; pricing catalog consistency; CI + browser acceptance; Owner LIVE authorization. No changes to the working financial ledger are authorized by this research amendment alone.

