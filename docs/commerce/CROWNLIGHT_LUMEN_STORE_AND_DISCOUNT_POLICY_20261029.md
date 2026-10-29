# Crownlight Lumens — Member Rewards Store and Capped Checkout Discounts
Date: October 29, 2026
Project: The Stock Market: From the Ground Up
Status: Existing chart/ad-free redemption paths preserved and exposed in the Lumen Store; **cash discounts, new trials and unpriced products are not commercially activated**.

## Controlling member policy
- All unused **Lumens never expire**: purchased, earned, included, free, promotional and administrative grants. Legacy member-facing Sparks refers to the same balances; the underlying Sparks SQL names and historical identifiers stay unchanged for compatibility.
- Time-limited benefits received through Lumen redemption end at their disclosed timestamps. Standalone trials do not automatically renew or convert to subscriptions.
- Do not spend credits twice, withdraw credits for cash, allow account-to-account transfers without a separately authorized product, or charge for benefits already included in a current membership.
- The proposed 200-credit verified-registration promotion remains **inactive**. A proposed $20 promotional value describes up to $20 of eligible discounts across multiple purchases, not cash or a guaranteed single-purchase $20 deduction. Promotional awards need verifiable one-time grant records distinct from earned, included and purchased credits.

## Proposed cash-checkout cap — source implementation (not operational)
Authoritative source: `functions/_lib/lumen-discount-policy-v1.js`.
- Valuation for eligible checkout discount: exactly **10 US cents per Lumen**.
- Maximum **20%** of the eligible order subtotal after other discounts, including valid Founder discounts.
- Maximum **$10.00** per eligible order, even when 20% is higher; the lower cap controls.
- Whole Lumens only; only the credited balance can be used; no cash redemption.
- Calculation excludes taxes, shipping, gift cards, purchasing Lumens, recurring subscription renewals, apparel, donations, and other non-eligible products.
- Initial eligibility is first-party one-time digital book, course, tool or pass SKUs. Server must verify seller/price, customer eligibility, discounts and actual wallets before applying anything.
- The currently deployed policy endpoint is read-only and reports **discount checkout disabled**; its preview arithmetic MUST NOT be used to take money, debit wallet, or grant access.
- Future Admin Control Center should allow the Owner to adjust cap only through versioned server-validated publication and a checkout preview; never make UI numbers authoritative.
- Transaction flow, once approved: verify server product and discounted subtotal -> verify membership inclusion -> quote redemption and balance -> show exact cost, remaining Lumens and price due -> signed processor/transactional payment authorization -> atomic idempotent debit and fulfillment -> audited receipt/compensating reversal on failure. Do not debit or promise refunds from successful-page redirects.

## Lumen Store
Member route: `/lumen-store.html` is a compatibility entry to existing `/store-sparks.html`, now labeled **Crownlight Lumen Store**. This preserves all old links/bookmarks without introducing a second wallet or duplicate SKU. Current already-authorized pathways:
- Ad-Free: existing `/api/member-sparks-adfree`, server price catalog and member entitlement checks.
- Chart Studio Advanced/Professional: existing `/api/member-sparks-chart`, confirmed price in `gu_sparks_price_catalog_v1`, server entitlement checks, idempotent credits and UTC expiry.
- In-lab optional reveal/skip actions remain where originally taught and do not award assessment mastery.
- Currently disabled credit bundles remain disabled, pending coherent bundle prices and tested Stripe/ledger fulfillment.

Future, not for sale: short-duration Advanced Watchlist & Trade-Plan Builder passes and small research-tool passes (1/7/14/30/180 days), member avatar/profile cosmetic packs, original downloadable practice worksheets, optional practice conveniences and later physical apparel. No released prices or fulfillment have been invented for these categories. Account customizations must not confer moderation, certification or paid memberships. Physical apparel needs real inventory, shipping, returns, taxation and customer support before listing a purchasable SKU. Proposed catalog: `data/crownlight-lumen-marketplace-v1.json`.

## Constraints and release acceptance
- Live checkout and the welcome grant are NOT enabled by legal publication or catalog visibility.
- Audit balances and preserve all non-expiring credits; source-side previous literature claiming 60-day included rollover is superseded by the non-expiring V2 database rule.
- Do not remove the existing Free instruction, ordinary retries or active Founding Member benefits.
- Validate real authenticated member redemption, idempotency, insufficient balance, duplicate click, included tier, suspended account, order expiration and refund/reversal before commercial beta acceptance.
- Reconcile any legacy member-facing prices and label texts with authoritative server records.
- Current GitHub source test: `tests/test_lumen_store_policy_v1.mjs`; existing Store acceptance workflow also invokes this test.
- SQL publication: `supabase/migrations/20261029_lumen_discount_cap_prospective_v1.sql` (prospective Terms v2.4 and Crownlight credit terms v2.3).
- Payment activation requires separate Owner instruction and genuine processor/checkout evidence, not an assumed authorization from this document.
