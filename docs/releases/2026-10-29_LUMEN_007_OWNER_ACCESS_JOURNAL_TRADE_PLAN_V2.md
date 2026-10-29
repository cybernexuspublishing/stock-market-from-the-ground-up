# Seven-cent Lumens, Owner Access and Journal/Workbench Phase 2
**Project:** THE STOCK MARKET: FROM THE GROUND UP  
**Date:** October 29, 2026  
**Branch:** main  
**Status:** Additive source and database changes committed; product activation and fully authenticated member acceptance separately gated.

## Controlling policy
- **1 Lumen = $0.07** nominal eligible checkout redemption value, replacing $0.10.
- Whole Lumens may fund **100% of an eligible digital product's price**, without the earlier 20%/$10 cap.
- Whole-credit rounding uses `ceil(eligible cents/7)` for full payment; a final Lumen may cover 1–6 cents and never generates cash change.
- Unused Lumens **never expire**, irrespective of credit origin. Temporary digital access and fixed-term trials do expire at their disclosed timestamps and do not automatically renew.
- A prior requested approximately $20 sign-on bonus is preserved prospectively at **286 Lumens (up to $20.02)**, once after eligible account registration and email verification. **Not live**: a separate anti-duplicate, source-labeled promotional issuer and verified reconciliation are needed before any grant.
- Lumen credit bundles remain disabled; their price-per-credit and redemption values are independent and must be displayed clearly. No real paid cash transactions were initiated.

## Working infrastructure
- `functions/_lib/lumen-discount-policy-v1.js`: disabled checkout quote calculator updated for 7 cents, 100% eligible subtotal coverage, exact whole-credit rounding and no discount cap. Cash/mixed checkout is **not active**.
- `gu_lumen_tool_offers_v1`: 10 **DRAFT/unpriced** prospective Journal Analytics and Watchlist Workbench passes, durations 1/7/14/30/180 days. The Owner may set a fixed price in cents; Lumen cost is server-generated `ceil(price_cents/7)`.
- `gu_lumen_tool_redemptions_v1`, `gu_lumen_tool_debits_v1`, and restricted `gu_lumen_tool_redeem_v1`: atomic Lumen-only tool purchase with shared user-level wallet lock, eligible-account checks, already-included protection, idempotency, debit audit and fixed-term `user_tool_passes` creation. The database function is service-role only; anon/authenticated execution denied.
- `/api/member-lumen-tool-passes` and `assets/js/lumen-store-tool-passes-v1.js`: authenticated member options and confirmed purchase of server-priced ACTIVE fixed-term offers only; existing ad-free and Chart Studio redemption are retained. Drafts cannot be purchased.
- `/api/owner-lumen-tool-offers` and `assets/js/admin-lumen-tool-offers-v1.js`: Owner-only price and state editor in Admin Control Center → Products & Prices → Tools, optimistic revisions and audit history, explicit active-offer confirmation. No offer automatically activated.
- **Commercial completion pending:** approved exact prices, authenticated Owner editing, zero/insufficient balance, double-click/idempotency, included benefit, refund/reversal policy and audit, expiration and account-switch scenarios. Initial activation must be handled separately by Owner.

## Owner access
- Existing `user_has_tool_access` already grants verified active OWNER roles access to registered platform tools; additional Workbench program status gating now recognizes OWNER while retaining staff restrictions.
- Existing Chart Studio owner tier access remains in effect.
- Released, authorized digital books can be downloaded by verified Owner without purchasing individually. **Book-rights controls remain mandatory:** file exists, attested rights, KDP Select restrictions, active status and download status. Unreleased/unlicensed/missing files cannot be made available by role alone.
- Labs and Boot Camps currently use their independent role/learning/publisher gates; OWNER is recognized at existing platform tool entitlement checks. A full signed-in Owner click-through on every Lab and Boot Camp still must be demonstrated. No purchased membership/financial ledger entries are fabricated for Owner.

## Research provenance and decision outcomes
- Existing Workbench saved `ADVANCED_TRADE_PLAN_SNAPSHOT_V1` records remain immutable historical versions.
- New private `gu_journal_research_links_v1` contains member ID, source record ID, Journal ID, source-observed time, source-published time and original save time. Direct client table privileges are denied. Links are append-only with a database mutation guard.
- `/api/journal-research-links-v1` checks BOTH records' authenticated owner and recorded source chronology before creating a link, and supports private Journal history reads.
- After a member applies a Workbench plan to a fresh Journal draft and saves the draft, the client attempts automatic source association. Source facts remain tagged MEMBER_REPORTED, not independently verified historical datasets.
- `assets/js/journal-source-variance-v1.js` adds member-only locked-plan vs actual analysis: modeled original risk/share, modeled initial loss, position cost, actual entry deviation, exit deviation, net divided by original modeled risk, recorded plan adherence and process ratings. Missing actual numbers remain missing, never zero. Journal model is not broker reconciliation.

## Trailing stop teaching
- `assets/js/trade-plan-trailing-model-v1.js`: long/short trailing-stop scenario over **only the candles already revealed** from existing permitted member-provided CSV. A completed bar's high/low may move the next bar's stop, never retroactively determine the same bar's stop.
- Gaps are explicitly illustrated; no claims of guaranteed stop-market/stop-limit fills, order sequencing, real execution or hidden future data. The new Workbench timeline panel shows current revealed-only results.

## Source acceptance still outstanding
- Authenticated production Owner, Free and paid end-to-end browser tests.
- Publishing third-party historical OHLCV only with source verification, permitted display rights and approved historical replay provenance.
- Automatic news/SEC/earnings/corporate-action feeds still require verified providers, licensing, first-public timestamps and no-lookahead acceptance.
- Cash/mixed Lumen checkout against existing Stripe products is **not** enabled; only released direct Lumen-only passes can transact.
- Purchased cash products, paperback orders and other physical goods require their existing independent payment/fulfillment systems and are not automatically free for Owner.
