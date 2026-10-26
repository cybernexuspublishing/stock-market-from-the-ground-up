# Sellable Beta Products — Product 01: Historical Replay Learning

Date: October 26, 2026 · Repository: `cybernexuspublishing/stock-market-from-the-ground-up` · Branch: `main`.

## Owner policy and roles

Roles: Acting Owner, product and education architect, checkout/billing engineer, PostgreSQL engineer, full-stack engineer, RLS/security reviewer, QA/release engineer, accessibility reviewer.

Continuous beta means shipping useful instructional and storefront functionality incrementally. **Do not create a second product SKU or invented course price** when the approved paid training membership already exists. This release does not enable LIVE sales, process charges, create subscriptions, issue Sparks, activate a KDP-Select digital channel or declare an unreviewed mastery assessment valid.

## Provider-backed commercial baseline (verified, read only)

Existing `platform_plans.ONDEMAND_MONTHLY` is **$19.99 per month** (1,999 cents) and `includes_all_tools=false`. Approved Store description is **Historical Replay Learning — Monthly**. Current metadata `checkout_ready=false`; there is an independent Owner-controlled LIVE payment shutdown. No ONDEMAND_MONTHLY active plan grants or subscriptions existed during the preflight.

In the linked **Stripe TEST account only** (`acct_1URGkDJY9FI7byHB`), the existing product `prod_VRwjus5sQLtTad` (metadata `site_price_map_key=ONDEMAND_MONTHLY`) and active price `price_1URGl6JY9FI7byHBsbDqMilz` were independently retrieved; the price is recurring, USD 1,999 cents/month, `livemode=false`. No Stripe products or prices were written. The broader TEST catalog contains 57 product objects and 13 active price objects, including noncommercial ad QA objects and unapproved standalone concepts. Do not confuse raw TEST objects with sale-ready products.

## Critical defect corrected — purchased-product fulfillment

**Problem:** `user_has_tool_access(target_user,target_tool)` recognized broad premium plans and passes but not the specifically priced `ONDEMAND_MONTHLY` for `ONDEMAND_TRAINING`. A future paying subscriber could be denied the Academy despite active payment.

**Implemented + database-applied:** `supabase/migrations/20261026_training_membership_entitlement_fix.sql` adds a narrow branch for **this tool only**, honoring active, in-period ONDEMAND_MONTHLY plan grants or subscriptions and requiring a current real member without restricted/suspended/Showcase flags. It preserves all earlier full-plan, Owner and separately issued pass paths and creates one administrative audit entry. Production readback verifies both entitlement branches, the audit entry, unchanged price and absence of a global tool unlock. The catalog `checkout_ready` remains false; LIVE payments remain disabled.

**Rollback:** `supabase/rollbacks/20261026_training_membership_entitlement_fix_ROLLBACK.sql` refuses to revoke the corrected training entitlement while any active subscribers or grants exist. Preflight: `supabase/admin/20261026_training_membership_entitlement_PREFLIGHT_READ_ONLY.sql`.

## Substantive product page, not a placeholder

The existing `store-membership-ondemand-monthly.html` now loads `assets/js/store-training-programs-v1.js` and `assets/css/store-training-programs-v1.css`. The product describes authorized beta instruction and the limits of this training-only plan. The JS fetches the real `/api/bootcamp-academy?action=catalog` endpoint, validates **seven canonical programs and 247 instructional days**, and shows real program titles, summaries and routes without creating a duplicate curriculum or persisting scores in browser storage.

One optional public catalogue failure displays honest unavailability rather than inventing programs or offering payment. The parent Store detail still gets the current price from the existing commerce catalog and checks the existing protected checkout status. Member learning is independently authorized on each Academy route. Financial copy explicitly excludes separately billed thinkorswim OnDemand, brokerage services, external data, other tools, downloadable books, and automatic grading mastery.

The shared `assets/js/store-product-detail-v01484.js` description was also corrected to avoid treating unreviewed Lab assessments as published mastery or implying the simulator includes verified historical datasets when no rights-approved source is available.

## Reproducible tests and acceptance

- `tests/test_sellable_training_product_v1.mjs`: actual Academy GET catalog, canonical seven programs totaling 247 days, ungraded status, genuine source-backed product page, authorization boundary and migration safety contracts.
- `tests/fixtures/20261026_training_membership_delivery.sql`: isolated real PostgreSQL 16 fixture; reproduces old missing access, applies the exact migration, tests positive subscription and plan-grant routes; rejects unrelated Tutor, Journal, Simulator, Interactive Learning tool access, expired grants/subscriptions, suspended and Showcase identities; confirms Full Platform remains authorized, then exercises guarded rollback with no active customers.
- Existing `.github/workflows/bootcamp-v014144.yml` runs both as part of its normal CI, using a **separate test database** for the new PostgreSQL fixture and syntax-checking the added presentation script.

**Evidence classification:** Backend production function + values + audit: **PROVEN**. TEST Stripe product and Price: **PROVEN** via read-only test account. Code/CI registration and member product detail: **IMPLEMENTED** pending completed exact-revision automated tests and frontend production verification. No signed-in purchaser journey or real checkout/payment fulfillment claimed. Owner handles the later human member trials.

## Next products to advance

Prioritize (1) `INTERACTIVE_LEARNING` with clearly labeled guided beta and separate reviewed-grade states; (2) `JOURNAL_ANALYTICS` with truthful saved-history and privacy; (3) `MARKET_TUTOR` with metering/provider fallback; (4) `MARKET_SIMULATOR` as explicitly educational CSV/browser replay and rights-verified, server-controlled replay only. Existing TEST catalog prices are not enough to release any of them as approved sales. Additional Boot Camp and clinic product rows currently have **no approved standalone prices**. Until pricing and independent delivery are approved, offer only authorized teaching through the existing platform/training membership rather than a made-up direct Boot Camp checkout.

**Owner acceptance for this increment:** Accept source and corrected server entitlement as implemented/provider-verified to their actual evidence level; keep developing sellable beta products without stopping unrelated beta activities. No LIVE payment writes or transactions are authorized.
