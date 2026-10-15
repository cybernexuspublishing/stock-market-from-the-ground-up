# The Stock Market: From the Ground Up — v0.14.0.29
**ID:** GU-WEB-BE-20261015-010  
**Date:** October 15, 2026  
**Baseline audited:** GitHub `main` `c6c65dccf88bae4190dae9229ef7348c59bf9052` — v0.14.0.28  
**Scope:** Real GitHub Actions results, targeted code contracts, manual signed KDP author-copy commerce channel design.  
**Status:** Source-candidate only. No live checkout, shipping orders, eBook uploads, or database writes performed.

## Evidence: latest GitHub Actions, exact HEAD
The v0.14.0.28 commit started 10 workflows: **8 PASS / 2 FAIL**.
- `Backend Contract v0.14.0.26` failed at source test `tests/test_v014026_release.py` line 34 requiring `v0.14.0.25` text in **latest** `README_START_HERE.md`. The README was updated for v0.14.0.28; the assertion is obsolete. Historical v025 source must remain, but no current README should be required to remain on v025.
- `Backend Contract v0.14.0.27` failed at source test `tests/test_v014027_release.py` line 13 requiring **exact** `VERSION: '0.14.0.27'` in `config.js`. The project is now v0.14.0.28. This is an obsolete static test expectation, not verified evidence of database failure.
- `Backend Contract v0.14.0.28` passed; other workflows including `Backend Contract v0.14.0.25`, sitewide governance and frontend source-contract checks passed.
- Both historical release tests are corrected in the release overlay to compare current version >= original baseline and maintain consistency across config, route policy and service worker, not bypass runtime contract tests.
- GitHub `main` reports **branch protection: false**. The project needs rulesets/required checks to prevent red-code merges. Do not claim protected pipelines while this remains false.
- The website Cloudflare production deployment SHA, actual Supabase migration postflight, private user flows, real signed payments, and KDP orders were NOT verified by passing source workflows.

## Source review: print and digital channels
- `v0.14.0.28` separates physical editions from Lemon Squeezy; this is required since physical products are prohibited by Lemon Squeezy.
- The existing `v0.14.0.28` admin RPC stores Lulu checkout links but the Owner requested **manual author-signed KDP author copies as the preferred option**, while keeping Lulu optional and independently enableable.
- `v0.14.0.29` introduces only the missing **configuration and truthful storefront status**: signed author-copy interest can be shown but does **not** accept payment, promise a shipping date, collect postal addresses or create fictitious purchases. Lulu links can be turned on/off while retaining saved URLs. Owner AAL2 authentication, row-lock optimistic version check, audited changes and function grants are database enforced.
- This release's SQL is additive and **review-required**. A ZIP upload to GitHub does not run SQL. User screenshots show v28 migration ran successfully, but install and role-negative acceptance require v28 postflight evidence.
- The v28 legacy link editor can still change the legacy `direct_physical_enabled` flag. Once a v29 fulfillment-mode record exists, the storefront honors `lulu_enabled` as authoritative. Other potential print integrations using legacy flags must be migrated to the newer contract before production signoff.

## Primary workflow: manually signed author copies (not activated yet)
1. **Merchant + checkout:** integrate Stripe Checkout (physical goods allowed) with server-calculated published price, shipping, tax policy and an exact SKU/edition reference. Store customer billing/shipping data only in access-restricted systems. Payment URL return alone is NOT proof of payment.
2. **Atomic provider verification:** verify Stripe webhook signature on raw payload; idempotently persist a paid order and the precise delivery address/fulfillment selection. Confirm provider paid state, currency, price, tax and product before acceptance. Handle expiration, duplicate webhooks, refunds, chargebacks and disputed orders; never fulfill unpaid orders.
3. **Owner fulfillment queue:** OWNER-only and proper staff roles see paid orders with restricted recipient data. Track `paid → KDP author copies ordered → received by author → signed → packed → shipped → delivered`, alongside `refunded/canceled/on_hold` transitions. Every staff change must be audited and concurrency-safe.
4. **KDP author copy:** the Owner manually orders a *published/live* **author copy** through KDP and receives it personally. KDP does not supply an authorized author-copy ordering API in this project; never automate purchasing through shared credentials, browser bots or undocumented services. Authors may resell author copies; do not resell proof copies marked Not for Resale.
5. **Signature and shipment:** personally sign the physical book, pack it, label it and ship it to the customer through a separate supported shipping provider. This incurs TWO potential shipping legs (KDP-to-Owner, Owner-to-buyer), print cost, packaging, tax and processing fees. Set a transparent production/handling SLA and cancellation/refund policy. No Prime/free shipping on KDP author-copy purchases.
6. **Reconciliation:** member's *My Purchases* displays only verified website orders, shipment/tracking and support; digital eBook licenses remain separate from companion access. Do not grant any digital file for a paper purchase without an independent digital license and copyright rights.
7. **Lulu Direct alternative:** Owner can activate per-title (per paperback/hardcover) Lulu Direct checkout links; Lulu/Stripe collect payment and ship directly, **not signed by the Owner** unless a separately validated signing workflow is established. Third-party Lulu purchases are not website orders until verified integration exists. Enable/disable per book without destroying its stored links.

## KDP Select protection
Until a title's actual 90-day Select enrollment term has ended and automatic renewal is disabled, never distribute that title's eBook outside authorized Kindle channels. The on-site KDP Select toggle is merely a software guard: switching it off does **not** itself terminate the publisher's contractual obligations. Private EPUB/PDF downloads require rights review, owned final approved files, private Supabase Storage, short-lived member-only links, purchase entitlement and refund revocation; not implemented by this increment.

## Systemwide residual release blockers
- Physical payments via Stripe, financial reconciliation, shipping addresses/PII, returns/taxes/customer service, and signed book order queue: **not implemented in v29**.
- Advanced Market Commons (including member-to-member notifications), moderation actor verification and administrative report limits: source/database contracts exist, live role-negative/end-to-end tests remain incomplete.
- All 419 historical labs, first-try assessment audit, paper simulator with no hindsight, journal analytics, AI Tutor, and Grant Web Solutions: feature completeness and cross-tenant/security boundaries not independently certified.
- GitHub Actions 10/10 required after overlay; branch protection required for robust releases; Cloudflare production SHA, Supabase postflights, Stripe/Lulu sandbox transactions, signed physical fulfillment and downloaded-book entitlements require separate acceptance.

**Official references:**  
Amazon KDP author copies: https://kdp.amazon.com/en_US/help/topic/G7BBN68RYX5UMDZF  
KDP author-copy ordering: https://kdp.amazon.com/en_US/help/topic/GVEG4YA9G2T7N6DR  
KDP Select exclusivity: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7  
Lulu Direct checkout: https://help.luludirect.lulu.com/en/support/solutions/articles/64000311603-how-to-create-and-manage-a-lulu-direct-buy-button  
Lemon Squeezy physical-goods prohibition: https://docs.lemonsqueezy.com/help/getting-started/prohibited-products
