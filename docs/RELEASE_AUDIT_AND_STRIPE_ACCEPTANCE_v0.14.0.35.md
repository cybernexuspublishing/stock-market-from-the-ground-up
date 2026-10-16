# v0.14.0.35 — Sitewide Membership & Stripe Audit / Approved Book Benefits

## Document Control

| Field | Value |
|---|---|
| Company | Cyber Nexus |
| Imprint | Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up |
| Document | RELEASE_AUDIT_AND_STRIPE_ACCEPTANCE_v0.14.0.35.md |
| Type | Markdown technical release and acceptance report |
| Document ID | GU-WEB-STRIPE-MEMBERSHIP-20261015-v014035 |
| Date | October 15, 2026 (review basis) |
| Version | 0.14.0.35 |
| Status | **Owner-approved policy; source release candidate; SQL staging review required** |
| GitHub location | `docs/RELEASE_AUDIT_AND_STRIPE_ACCEPTANCE_v0.14.0.35.md` |
| Google Drive location / file ID | Not established; no Drive copy claimed |
| Baseline | GitHub main `d02a9fe0bba155b71f4ca951d188aa6bc6e9aa89` (v0.14.0.34) |
| Dependencies | Existing v0.14.0.30 private eBook schema, active platform plans, Stripe sandbox + Product/Price IDs |
| Purpose | Align member-facing pages and paid-book eligibility with the approved benefits, without activating payment providers |

## Verified source findings

* GitHub head is v0.14.0.34. **18 of 18 workflows** on that commit concluded success when checked; `main` is **not branch-protected**. This is source CI evidence, not full UI/system acceptance.
* `assets/js/membership-platform.js` contained outdated Lifetime marketing language ('permanent'/'Never expires'), and did not show the approved 5 eBooks. `FULL_MONTHLY` and `FULL_ANNUAL` plan records originally had `includes_all_books=false`, so their companion benefits were missing from access resolver output.
* `PICK_WHAT_YOU_WANT` was hidden from public catalog because `public_visible=false`; it should be visible as **$0 base fee**, where only selected paid tools incur subscriptions. Frontend enrollment remains closed until verified Stripe entitlements are finished.
* Existing `assets/js/my-books.js` correctly distinguishes book **companion access** from full book files. `assets/js/digital-library-v01430.js` previously granted downloads solely based on direct purchased digital orders, so paid Lifetime lacked its newly approved eBook entitlement.
* Five individual cover files exist in GitHub under `assets/images/books/` and are now defaulted by `assets/js/commerce-common.js` when a database product omits `cover_image_url`. Final cover images still require comparison to approved publication/KDP artwork. Do **not** use the generic placeholders for the final five Stripe book listings.
* Digital books currently use KDP Select-related, private-storage, and file availability gates. The v0.14.0.35 migration retains every one of those conditions while adding narrowly scoped active Lifetime account eligibility. The five proposed website prices are **prepared as metadata only**, not a KDP pricing update or payment activation.
* Stripe Managed Payments backend at `functions/api/stripe-managed-sandbox-v01432r2.js` is **OWNER-controlled sandbox only**. Events at `stripe-managed-webhook-v01432r2.js` are **test-only receipts**. They do NOT issue live memberships, standalone tool subscriptions, or download entitlements. Do not claim Stripe is production ready.
* Backend owner payment configuration uses `STRIPE_MANAGED_PRICE_MAP_JSON` in Cloudflare Pages, not the historical Lemon Squeezy Variant ID fields. New product images and price maps do not auto-register products in Stripe.
* The site's forum, login security, all account workflows, screen reader support, payment/refund lifecycle, and all production paths have **not** been verified end to end in this run. No claim of full-site certification is made.

## Approved membership policy implemented in candidate

1. **Full Monthly ($69.99/month) and Full Annual ($699/year):** released first-party tools + all first-party book **companion learning**. Full downloadable eBooks remain separate purchases.
2. **Lifetime ($2,499 one-time):** first-party platform membership while the website remains operational and the account stays active/in good standing, subject to published Terms. The **five designated downloadable eBooks** are included once Amazon KDP Select/exclusivity ends, rights have been verified and each authorized file is actually ready. Lifetime status does not make private files public and does not bypass KDP protections. Third-party services are excluded unless expressly included.
3. **Pick What You Want ($0 base):** customer chooses separate individual tool subscriptions. No all-tool or all-book grant. Server-side payment and entitlement fulfillment for independently added/canceled tools is still required. Prevent upsell claims that subscribing to Pick alone unlocks paid tools.
4. **Founding offers:** remain closed and unchanged. **Free:** unchanged.
5. **Website eBook price proposals approved for preparation:** Book I $9.99, Book II $10.99, Book III WITH RCT $11.99, Day Trading $14.99, Reading the Tape $14.99. Existing configured prices are preserved by the migration. Amazon Kindle price is not touched.

## Security and production blockers (P0)

- **Do not run reviewed SQL directly against production** without staging, backup and authorized acceptance. Membership access is customer-facing: validate a real Full Monthly/Annual account, a paid Lifetime account, a terminated/restricted account, a Showcase account, and a member with only a book key.
- The new `gu_lifetime_ebook_eligible_v01435` checks only an explicit, active Lifetime plan grant or Lifetime subscription; OWNER status alone gives no private book files. Eligibility is then intersected with existing approved-file, active title, KDP Select and digital-rights gates. No bulk account grants are created.
- Stripe Managed Payments merchant eligibility, terms, subscription taxation, digital eBook rights, price IDs, signed webhooks, provider sandbox charge/refund/renewal, order ownership, idempotency and cancellation/revocation are **not accepted**. Avoid collecting real sales until independently verified.
- Digital product delivery to Lifetime members may generate obligations after website closure or account termination; Lifetime terms, refund policy, consumer rights and intellectual-property distribution require professional jurisdiction-specific review.
- Member-visible tool/subscription pricing from Supabase must match Stripe's *specific Price IDs* including interval, currency, recurring vs one-time; existing sandbox price verification does not prove ongoing webhook grants.
- `main` branch protection and required status checks must be enabled independently; local ZIP does not change repository protection settings.
- Avoid claiming the five included eBooks are available while enrolled in KDP Select; even free member digital delivery during exclusivity is restricted by Amazon's terms: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7
- Stripe Managed Payments requires account acceptance and compatible transactions: https://stripe.com/managed-payments ; checkout uses managed_payments[enabled] server-side.

## Installation order

1. Download/inspect this source overlay and apply only its named paths to GitHub `main`; preserve all unrelated files. **No file writes or deployments were done by generating this package.**
2. Run GitHub Actions and verify same-commit success; smoke-test Store, Membership, My Books, Admin Payments, market forum and auth.
3. **Staging first:** run `supabase/admin/v0.14.0.35_PREFLIGHT_READ_ONLY.sql` and save evidence; review `supabase/migrations/v0.14.0.35_MEMBERSHIP_BOOK_RIGHTS_REVIEW_REQUIRED.sql`; execute only after approval; then run `supabase/admin/v0.14.0.35_POSTFLIGHT_READ_ONLY.sql`.
4. Test actual roles with member JWTs and direct RPC calls; check negative authorization, KDP Select ON, rights unavailable, missing file, refunded book order, payment retries, plan cancellation, customer restrictions, and actual download.
5. Stripe Sandbox: create 8 eligible products/prices described in `docs/STRIPE_SANDBOX_PRODUCTS_v0.14.0.35.json`; **do not** create $0 base Pick/Free in Stripe. Once real Stripe Price IDs exist, map through the Cloudflare server-only `STRIPE_MANAGED_PRICE_MAP_JSON` environment variable. Keep `STRIPE_MANAGED_TEST_CHECKOUT_ENABLED` and any live checkout switches disabled except during authorized sandbox test.
6. Implement and accept the missing **verified Stripe webhook -> plan/tool/eBook entitlements -> subscription lifecycle** integration before lifting the customer purchase hold. This release intentionally does not invent real Stripe products, secrets or Price IDs.

## Revision History

| Date | Version | Change | Approval |
|---|---|---|---|
| Oct. 15, 2026 | v0.14.0.35 | Membership/book benefit alignment, Lifetime digital eligibility, individual cover fallback, protected provisional eBook pricing, Stripe setup documentation | Owner approved arrangement; implementation awaits staging/production acceptance |
