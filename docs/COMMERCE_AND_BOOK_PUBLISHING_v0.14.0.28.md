# v0.14.0.28 — Combined Commerce and Book Publishing Development

**Project:** The Stock Market: From the Ground Up  
**Publisher:** Crown & Lantern Press / Cyber Nexus  
**Document:** GU-WEB-BE-20261015-009, Revision 1  
**Date:** 2026-10-15  
**Controlling GitHub baseline:** `028e9806f9d3a4e50c3e340172c17b7f943b452c` (v0.14.0.27).  
**Status:** Development release candidate. This does NOT make paid checkout live.  
**Deployment method:** Existing direct-upload source overlay; preserve all other tracked files.  
**Database execution:** NOT performed. SQL is review-required and should be validated on a separate staging project.  

## Existing platform capabilities independently located

- Lemon Squeezy checkout Functions for platform plans/tools and format-aware books: `/api/checkout`, `/api/checkout-v0135`.
- Existing signed Lemon Squeezy webhook and idempotent order code: `/api/lemon-webhook`; prior fulfillment procedures are separate from this release.
- Supabase `catalog_products` already carries Amazon Kindle/paperback/hardcover links, `kdp_select`, direct-digital/physical flags and metadata. The public Store already displays separate Amazon format URLs.
- `site_orders`, `site_order_items`, `site_subscriptions`, `user_library`, `checkout_intents` and related infrastructure exist in migrations. These are NOT evidence that live payments, refunds, returns, taxes, or authenticated purchases have been tested end to end.
- v0.14.0.17 Owner reporting policy migration was reported executed successfully by the Owner in the previous turn. Run the existing `supabase/admin/v0.14.0.27_REPORT_POLICY_POSTFLIGHT_READ_ONLY.sql` to verify installed permissions if not done; no additional copy of the migration should be applied.

## P0 correction: the previous checkout allowed a forbidden physical provider path

`functions/api/checkout-v0135.js` previously built a Lemon Squeezy checkout for format `paperback` and `hardcover` if a catalog flag/variant had been set. **Lemon Squeezy expressly prohibits physical goods.** The new source rejects those formats before creating an intent or calling the provider; `assets/js/checkout-platform.js` no longer offers them in its selector. It preserves legally permitted digital quote/intents and existing plan/tool checkout, which use a different endpoint.

Reference: https://docs.lemonsqueezy.com/help/getting-started/prohibited-products

## Print book checkout and fulfillment — recommended low-overhead path

**Vendor: Lulu Direct Buy Button / Checkout Link + Stripe.** For a printed book purchased from the website, Lulu handles checkout, shipping calculation, applicable taxes, book production and shipment. The Owner controls each retail product/price through Lulu. No user credit-card or delivery address data is passed through the Ground-Up website for these orders. Lulu's buyer orders and tracking live in Lulu's dashboard and buyer communications until verified order-sync integration is added.

Owner prerequisites (not yet completed by software): create a Lulu account; verify eligibility/Stripe payout identity and bank; upload accepted print-ready **interior and cover PDF** files per edition; establish separate **paperback and hardcover** Lulu projects; set prices covering print, shipping, tax, Stripe/Lulu fees and desired margin; obtain each edition's Lulu Direct URL. Lulu Direct Buy Button has no up-front setup charge but per-order fulfillment/payment fees apply.

Official documentation: https://help.luludirect.lulu.com/en/support/solutions/articles/64000311603-how-to-create-and-manage-a-lulu-direct-buy-button

The new `Admin → Commerce → Print Book Sales — Lulu Direct` form uses owner-scoped Supabase RPCs to save per-title URLs and enables print only when a URL is present. Only HTTPS Lulu domains are accepted, source `metadata` is preserved, optimistic locking prevents overwrites, and an audit record is committed in the same transaction. **MFA (Supabase AAL2) is mandatory for link changes**, because a malicious payment-destination change could defraud customers. Non-Owner members and Showcase accounts are refused by SQL. The Store shows one direct button for each configured format, while preserving the existing Amazon print links. Existing data is not auto-edited.

Do not link a Lulu Direct URL until you have ordered and inspected a proof, verified the edition, pricing, shipping regions, customer-facing terms, privacy and refund processes, and run test purchases. The link's official `lulu.com` host is verified in browser AND SQL. A third-party destination is not an in-site payment stored in `site_orders` until a secure reconciliation contract is developed. Never give print buyers a digital download automatically.

**Alternative: Owner orders a KDP author copy manually after website payment.** KDP permits resale of **author** copies, but not proof copies (marked Not for Resale). Owner-managed KDP fulfillment would require a separate provider capable of physical payments (e.g. Stripe Checkout), verified payment webhooks, shipping/tax quotes, a protected recipient-address order queue, refunds/chargebacks, and KDP-author-copy ordering performed manually from the Owner's KDP/Amazon account. KDP does not provide a documented self-serve author-copy ordering API for this workflow. **This manual payment/order queue is NOT implemented or enabled by v0.14.0.28**. Lulu's automatic fulfillment is the recommended, faster and safer default; manual KDP can follow if specifically desired.

References: https://kdp.amazon.com/en_US/help/topic/G7BBN68RYX5UMDZF and https://kdp.amazon.com/en_US/help/topic/GVEG4YA9G2T7N6DR

## Amazon publication in three formats

- Publish each **paperback** and **hardcover** separately in KDP. Hardcover has separate cover specs and usually requires its own ISBN; print-ready PDFs must be reviewed in KDP's print preview and proof ordered before selling.
- **KDP free ISBN cannot be reused with Lulu or another publishing service.** To use the same ISBN for the same paperback format outside KDP, buy/control an ISBN registered to the correct author, format, title and imprint. A hardcover uses a distinct ISBN. If using a Lulu-only channel/project instead, follow that provider's ISBN rules and avoid duplicate edition identity.
- Set the actual Amazon Kindle, paperback and hardcover URLs in the site's existing Owner catalog interface once Amazon lists each edition; do not fabricate product links.

References: https://kdp.amazon.com/en_US/help/topic/GTJ8LBXL6Z4WV5QX and https://kdp.amazon.com/en_US/help/topic/GAVW3FZZAKA2KY3B

## Digital purchases and private eBook downloads — important copyright/contract gate

**DO NOT distribute the actual downloadable EPUB/PDF from the website while that ebook is enrolled in KDP Select.** KDP Select's digital exclusivity applies for each title's applicable 90-day term even if a customer owns a print copy, redeems a companion key, or holds a Lifetime platform membership. Physical books are excluded from that digital exclusivity. Track each ebook's term and whether it auto-renews, independently per edition. The current catalog uses `kdp_select=true`; v0.14.0.28 preserves that fail-closed state.

Reference: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7

When a title is definitively out of KDP Select and its rights allow direct sale, the later digital asset release will need a PRIVATE Supabase Storage bucket, non-public original assets, per-edition immutable revision IDs, verified signed-payment fulfillment from Lemon Squeezy, separate downloadable-book entitlements (NOT the companion access flag), paid/refunded/charged-back ledger controls, no-hindsight sample-only public pages, member-bound short-lived download links, audit/rate limiting, and an owner upload/withdraw procedure. A checkout redirect parameter must never grant access.

**No eBook file was provided with this request. v0.14.0.28 does not upload or expose EPUB/PDF bytes, and it does not claim direct digital fulfillment works today.** Only owner-approved publication-ready originals should be used, with final customer canonical versions unchanged.

## Combined remaining milestones — consolidate releases, not acceptance controls

A. **Commerce/Publication:** print checkout and Amazon listings (this increment), subscription/digital provider activation and webhook QA, private ebook delivery only when KDP terms allow, paid-order reconciliation, accounting, consumer rights, refunds.

B. **Core Platform:** staff roles/administration, Market Commons alerts/moderation, book keys, all 419 historical labs and answer grading, simulator, journal, tutor, GWS tenant isolation; batch API/security fixes into fewer aligned releases.

C. **Production acceptance:** staging test matrix, role-negative RLS, multi-member test, webhook replay/refund/idempotency, accessibility, mobile, Cloudflare deployment SHA parity, backup/recovery, monitoring and rollback plan.

There is no responsibly fixed ZIP count. No milestone is signed off solely because its SQL objects exist or because CI source tests pass.

## Staging deployment and acceptance gates

1. Upload direct source ZIP to GitHub preserving unrelated repository files. Cloudflare static/private build boundary must pass; no SQL executes during GitHub deployment.
2. Run `supabase/admin/v0.14.0.28_PRINT_CHANNEL_PREFLIGHT_READ_ONLY.sql` on staging. Review actual `catalog_products` schema, then test and apply the review-required migration on staging.
3. Run the postflight. Anonymous must NOT be granted either RPC; `authenticated` EXECUTE grants may show true because the **inner SQL** performs current active Owner checks. Explicitly test unsigned, normal member, expired Owner, suspended account and Showcase: all must be denied. Owner with AAL1 must be denied a save; eligible Owner with AAL2 may save.
4. Create a non-live Lulu sandbox/test checkout project and verify links only show for published titles, each edition's destination matches its printed format, no ecommerce spoofing, no crossed book IDs, and mobile 320px UI works. Confirm attempts to buy physical through Lemon Squeezy return 403 and do not create `checkout_intents`.
5. Check Lemon Squeezy subscription flows separately with provider test mode, signed webhooks and replay/refund acceptance. Do not switch `ENABLE_PAID_CHECKOUT` ON until confirmed.
6. Do not distribute KDP Select EPUB/PDF files; do not promise that Lulu orders appear in `My Purchases` or grant digital access. Require an authenticated fulfillment integration before making either claim.

**Explicitly pending:** Amazon KDP paperback/hardcover publication; Lulu project creation and Stripe onboarding; all payment provider credentials; real printed proof/order; eBook asset uploads/legally permitted downloads; and customer acceptance testing. No live purchases are enabled by this source ZIP.
