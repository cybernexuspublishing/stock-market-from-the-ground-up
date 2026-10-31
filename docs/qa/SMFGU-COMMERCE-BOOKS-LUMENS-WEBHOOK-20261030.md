# SMFGU — Books, Crownlight Lumens, and LIVE Webhook Acceptance

**Document ID:** SMFGU-QA-COMMERCE-20261030-002  
**Filename / type:** `SMFGU-COMMERCE-BOOKS-LUMENS-WEBHOOK-20261030.md` / Markdown  
**Project:** The Stock Market: From the Ground Up  
**Location:** GitHub `cybernexuspublishing/stock-market-from-the-ground-up` / `main` / `docs/qa/SMFGU-COMMERCE-BOOKS-LUMENS-WEBHOOK-20261030.md`  
**Google Drive location and file ID:** Not assigned; no duplicate file created  
**Version:** 1.0  
**Status:** PARTIAL ACCEPTANCE; paid purchases, signed LIVE delivery, and Lumens package purchases not accepted end-to-end  
**Date:** October 30, 2026 (some evidence on October 31 UTC)  
**Dependencies:** Primary SMFGU Stripe TEST/LIVE, Supabase, Cloudflare Pages, secure member session, real provider event delivery.  
**Purpose:** Record precise verified controls, changes, gaps, and cleanup.

## Book correction and verification

Five separate digital titles are rights-attested and present in private storage with EPUBs of approximately 4–5 MB each. Their Supabase `gu_digital_books_v01430` rows have sales and downloads enabled, exclusivity expired, and corresponding `catalog_products` records show direct digital and website checkout enabled, KDP Select disabled. Each LIVE Stripe Price and Product was verified active at: Foundations I $10.99, Foundations II $10.99, Foundations III with RCT $11.99, Day Trading $14.99, Reading the Tape $14.99.

**Changed:** Five `gu_storefront_items_v014174` records to `visible=true`, `status=for_sale`, `sale_ready=true` after guarded source-asset checks; changed Foundations Book III `catalog_products.sales_status` to `published`. Synchronized the five Stripe LIVE Product metadata `site_checkout_enabled=true`, `launch_state=for_sale`. Preserved `fulfillment_verified=false`; no paid event falsely claimed.

**Verified production smoke test:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41149500242 (PASS). The five book checkout GET preflights returned available and accurate prices; public Store displayed all five sale-ready.

**Inventory:** 61 registered Store SKUs; **12 customer-visible sale-ready** = 5 books, 3 Founding Memberships and 4 à-la-carte tools. The two book bundle listings, 15 Boot Camps/clinics, six included features, hidden memberships and currency packages are not added to this sellable count.

## James_Test My Books download testing

An authorized, 12-minute QA-only `LIFETIME` grant was temporarily created solely for download testing. It was **canceled** with an explicit QA audit marker immediately after a first browser-runner pathname error (`/my-books` instead of `/my-books.html`). Subsequent database verification showed `James_Test` on FREE, with no active QA grant. No paid order or synthetic provider event was created. The first run is https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41149822162 (failure unrelated to file payload). The browser test was corrected to support both URLs and to require server denial when the authenticated member has no entitlement; passing that test demonstrates access control, not a paid purchase.

**Still open:** A genuine Stripe TEST checkout paid via official card -> signed webhook -> book ledger paid -> My Books entitlement -> actual EPUB download -> refund -> disappearance of entitlement. A manual QA grant is never equivalent to provider-verified paid fulfillment.

## LIVE $0 diagnostic and webhook

Prior genuine zero-dollar LIVE session `cs_live_a1bbjaB1N0UNjQqTQTM9YTDUuLfHBPF8YFuAHG7ZOirAOa3q9h4eAazJeQ` remains `complete/paid`, amount 0, no PaymentIntent or subscription, with valid GU71 metadata. Its actual event `evt_1UVaw9JL0O4GGVBHKjQTd21w` remains `pending_webhooks=1`. LIVE webhook delivery has **not** passed; original endpoint delivery-attempt HTTP details and a genuine provider retry/new completed signed Checkout are required. Do not forge a signature, claim that session granted membership, or rotate LIVE secrets as an unverified guess.

A second isolated $0 LIVE session was created by authorized Stripe administrator tools to check transport but remains OPEN/UNPAID; this created no event or entitlement and does not establish success. Existing GU71 remains a zero-cost one-time diagnostic and never grants membership.

## Crownlight Lumens package purchasing

**Customer-facing package data** `data/crownlight-sparks-store-v014167.json` defines five coming-soon packages: **25/$5**, **55/$10**, **90/$15**, **125/$20**, **275/$40**. Global `checkoutEnabled=false`; each package's checkout also disabled.

**Database/Stripe mismatch:** Three hidden old storefront entries and LIVE Stripe Products/Prices remain: `SPARKS_10` $3.99, `SPARKS_30` $9.99 and `SPARKS_75` $19.99. Their Stripe Product metadata says `site_checkout_enabled=false`, `fulfillment_verified=false`, `launch_state=coming_soon`. This does not match the five bundles displayed on the website.

**Decision:** Do not activate obsolete or newly advertised bundles for real-money checkout. Purchased-Lumens end-to-end acceptance is blocked because no verified, bound five-package checkout -> genuine signed provider payment -> nonexpiring member credit bucket -> replay-safe ledger -> full-refund reversal path has been demonstrated. Existing tests of mixed Lumens *spending* and QA shadow credits are not tests of *purchasing* Lumens.

## Open acceptance items

1. Finish provider-signed TEST book purchase, bound paid grant and file download/refund/revocation using a QA member.
2. Diagnose Stripe's failed/pending GU71 event from genuine delivery-attempt HTTP responses; confirm a new or retried Stripe-signed event is acknowledged 2xx.
3. Align the five package catalog SKUs and pricing in all systems, implement TEST-only protected bundle purchase/credit/refund ledger and verify with real TEST card events; only then authorize LIVE product exposure.
4. Preserve original customer entitlement and payment records, and prevent any nonzero LIVE QA charges absent a genuine user-controlled payment method.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-30 | Books metadata reconciled; 12/61 catalog count; QA tests and grant cleanup; zero-dollar webhook event pending; Lumens five-vs-three catalog discrepancy. |
