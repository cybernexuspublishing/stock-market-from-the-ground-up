# Sellable Beta Products — Product 03: Trading Journal & Performance Analytics

**Document ID:** SMFGU-SELLABLE-P03-20261026 · **Status:** IMPLEMENTED; exact-revision CI/deploy checked independently below  
**Project:** The Stock Market: From the Ground Up · **Source:** GitHub `main`, current release chain of October 26, 2026  
**Research archive:** `StocksToTrade-Browser-Research (8).zip` — Batch XXVI topics 251–260, 271–280 and 281–300 (all partial original educational research)  
**Roles:** Owner's technical representative, financial education/research, statistical analysis, JavaScript full-stack, database/RLS, accessibility, e-commerce and independent QA.  
**Scope:** Improve the **existing** Journal product, not duplicate the analytics engine, introduce an external data service, or modify LIVE Stripe.

## Evidence and product basis

Production Supabase readback showed:
- Existing `platform_tools.JOURNAL_ANALYTICS` SKU has `individual_price_cents=2999`, is active and listed with `checkout_enabled=false`.
- Existing storefront record `tool:JOURNAL_ANALYTICS` displays **$29.99**, `sale_ready=false`.
- `decision_journal` is RLS-enabled with `auth.uid()=user_id` scoped SELECT, INSERT, UPDATE, DELETE policies. Its inspected production dataset has zero rows; no real member cohort was fabricated to assert an end-to-end member journey.
- The existing private `/api/journal-analytics-v014114` checks `JOURNAL_ANALYTICS` through the shared authenticated entitlement server before querying. It uses a narrow field projection, account-specific `user_id` query filter, a strict 3,000-record no-silent-truncation rule and no-store response caching. It never returns raw trading notes or answer keys.

**Source-derived research:** Batch XXVI asks for a measurement contract containing units, inclusion rule, denominator, observation interval, cost basis, and missing count. It supplies five **fictional** observations: four resolved net-dollar outcomes +$120/−$50/−$30/$0 and one missing outcome, with 25% win rate, mean +$10, positive/absolute-negative ratio 1.5, running-net drawdown $80, and undefined average R without initial risk observations. It explicitly warns that this is not actual market history, account-equity drawdown, a forecasting signal or broker-confirmed trading record.

**Independent official context:** Investor.gov, SEC Investor Bulletin [Performance Claims](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47), September 15, 2022, discusses misleading omissions, expenses, backtests, cherry-picking and the limitations of past performance. Website does not reproduce copyrighted research page libraries, commercial trading platform UI or personally identifiable source-profile material.

## Problem → real source changes

**High: opaque denominators and missingness.** The earlier server computed correct summary metrics but did not publish a machine-verifiable breakdown of each statistic's population, missing sample, cost assumptions and time scope. User-facing product claims could therefore be misread. The deterministic existing `report()` now attaches seven `metricDefinitions` with:
- statistic code, label and unit;
- inclusion rule and actual denominator count;
- missing-observation count;
- declared cost basis and observation interval;
- explicit interpretation limitations.

The seven definitions cover win rate, mean recorded net, positive/absolute-negative ratio, R, running-net drawdown, MFE and MAE. The records themselves remain private; this is an aggregate-only methodological description.

**High: invalid outcomes counted as zero.** The `finite()` predicate now rejects whitespace, booleans, arrays/objects and malformed numeric strings while accepting an intentionally recorded numeric `0`. The trading-date predicate now rejects impossible normalized dates such as February 30. Neither change overwrites historical member input.

**UX:** The protected `journal-analytics.html` page now includes an accessible, text-safe methodology table. The existing `assets/js/journal-analytics.js` builds table cells with `textContent`, independently validates the seven fields and refuses to render metrics if the server's contract is missing or malformed. The existing `store-tool-journal-analytics.html` now links to the actual paid Analytics route and clarifies what the purchase does and does not provide; listing and checkout controls remain authoritative.

**Tests:** `tests/test_sellable_journal_metric_contract_research8.mjs` executes the unchanged real report function plus new metadata against Batch XXVI's original fictional cohort, verifies every statistic above, invalid date, blank/malformed P&L, empty samples and live/paper filter isolation, and ensures the protected API still uses server authorization and member-scoped no-store reads. The existing Boot Camp CI now executes this regression and JS syntax checks.

## Security, implementation and acceptance

- **IMPLEMENTED:** server-generated metric methodology, resilient numeric/date validation, accessible aggregate methodology view, paid route navigation, source-based regression, CI integration.
- **TESTED:** targeted CI only where exact completed results are available; a passing source test never demonstrates a signed-in buyer, a paid billing lifecycle, or real production analytics computation.
- **PROVEN:** read-only Supabase RLS and Store price flags, existing account-scoped authorization contract, provider Cloudflare deployment only for an exact matching revision once verified.
- **Not represented as PROVEN:** historical market accuracy, broker fills, account-equity returns, password/CAPTCHA browser login, actual member analytics results, performance forecasting, production-member usability.
- **Owner decision:** Accept the design and source corrections to their documented evidence tier. Maintain existing product identity and $29.99 pricing. LIVE selling shutdown, KDP restrictions, canonical Lab and Founding Members decisions remain unchanged.

## Rollback and no-data change

No SQL migration or database schema update was required. Rollback is a source-only revert of the particular Journal analytics library, page and client code to their prior GitHub versions, followed by an exact-revision test, assuming the old source is still compatible with the current API. Do not roll back through a paid-customer deployment without evaluating the measurement disclosure contract; doing so could remove accurate missingness warnings. No destructive production data operation or payment action took place.

## Next development

Continue with Market Tutor and educational Simulator products using existing shared billing, tool access, private progress and source registry. Any product description promising actual historical datasets must be checked against independently verified data rights, as research archive (8) does not itself grant redistribution or attest exact real trading outcomes.
