# Founding Store & Crownlight Sparks wallet — engineering change and release acceptance

Date: 2026-10-26. Branch: `main`. Canonical production: `stock-market-from-the-ground-up-d1r.pages.dev`.

## Owner's requested public beta, not invitation-only

This site is intended for public promotion and public signup, with **two paid Founding subscriptions** as the sole current membership offers. The existing paid subscription checkout remains disabled until separate LIVE payment-owner acceptance. Public Store copy must not claim payment availability when the server refuses checkout. No LIVE charges, provider writes or subscription creation were attempted in this release.

## Completed work

- `supabase/migrations/v0.14.0.296_founders_only_store_visibility.sql` successfully applied in Supabase with atomic audit event `admin_audit_log.id=76`. Exactly FOUNDING_30 and FOUNDING_60 are public; eight legacy/other plans hidden, all legacy new checkout flags disabled. Their `active` flags and existing member entitlements are preserved. Founding checkout remains false; prices and term/benefit rules unchanged. Guarded visibility-only rollback prepared in `supabase/rollbacks/v0.14.0.296_founders_only_store_visibility_ROLLBACK.sql`; never run without Owner authorization and backup.
- `store.html` makes Founding memberships the default, removes old Memberships tab, retains book and released tool tabs, and links to a Sparks-only shop.
- `assets/js/store.js` hides the unrelated legacy membership cards, unstarted roadmap concepts, and draft/archived books. Started-but-not-released items show Coming Soon. Only server-eligible/purchasable released products may show Beta OPEN. Compact status ribbon CSS in `assets/css/store-release-finish-v014234.css`.
- `assets/js/store-inventory-ui-v014174.js` hides existing extra membership SKUs from the older full catalog; server-authored coming-soon/release_ready overrides can continue to appear after independent Owner publication.
- `functions/api/member-sparks-wallet.js` reads the original `groundup_question_pass_summary` ledger RPC with service-role authority *only for the authenticated member identity*. It rejects anonymous, showcase, restricted and suspended accounts. It returns actual available, included, purchased and Owner-issued Sparks separately; it never mints credits or returns customer data for requested arbitrary user IDs. Private no-store response.
- `assets/js/navigation.js` adds the current Sparks amount next to the signed-in username, with accessible How To Use and Buy More links; mobile drawer includes the wallet indicator. Unavailable ledger is shown as unknown rather than a fabricated zero.
- `dashboard.html` displays total, included, purchased, Owner-issued, next included expiry, rules, Buy More.
- `store-sparks.html` shows only the three existing package SKUs (10/$3.99, 30/$9.99, 75/$19.99) using `data/crownlight-sparks-store-v014167.json`. The catalog currently says **proposed pricing / purchases DISABLED**, so the UI does not invent a paid checkout. `scripts/build-pages.sh` now copies this approved public JSON into the deployed static build.
- `admin.html` Products includes a shortcut to the **existing** private EPUB/PDF upload control in Commerce. `assets/js/admin-products-v01489.js` wires this action to the real AAL2-gated digital uploader. No replacement uploader or duplicate book records.

## Independently verified configuration, not simulated receipts

- Supabase `platform_plans`: 2/2 Founding offers public, all other plans hidden, all `checkout_enabled=false`; audit id=76 records prior state.
- Existing private Storage bucket `gu-digital-ebooks`: `public=false`, 50 MiB limit, accepts PDF and EPUB. As of this review the bucket has zero objects. Owner uploads must be genuine owned, rights-verified files, not generated copies; KDP Select digital exclusivity remains controlling.
- `functions/api/digital-book-download-v01430.js` checks actual entitlement before a 60-second signed URL. Existing checkout routes require signed-in users; **guest book checkout is NOT yet supported or accepted**.
- Current founding plans in `gu_founder_plans_v014173`: $49.99 every 30 days / 10% purchase benefit; $59.99 every 60 days / 15% benefit. Shared 600-seat reservation contract retained.
- All previously examined Cloudflare LIVE checkout/fulfillment flags remain FALSE. This batch did not authorize or activate LIVE payments.

## Known unfinished features and product acceptance

The Owner also requested capabilities that cannot be claimed shipped merely from this Store/wallet work:
- New generalized item categories/CRUD, multi-image upload for all merchandise, image-based reviews/moderation, guest *book-only* checkout, physical pickup/delivery availability calendars, image branding uploads, provider-verified profit/expense reporting and period/category/bestseller filters.
- The existing Admin has book/tool editors and private ebook upload, recent orders and Stripe shadow reconciliation. These existing features are not evidence that the missing generic merchandise/reviews/calendar/finance features are complete.
- Real provider Stripe LIVE charge/refund testing remains Owner-excluded. A public paid beta requires explicit separate legal/payment approval and genuine end-to-end successful paid enrollment, signed webhook, cancellation, entitlement and refund verification.
- CI results MUST be reported at exact source SHA; queued, cancelled or source-mocked PASS does not mean real account/product deployment acceptance.
- Source inventory books listed as publication_candidate/in_development or KDP Select cannot be falsely shown as delivered or free of distribution restrictions. No book manuscript files were uploaded in this release.

## Noncharging release QA

`tests/test_member_sparks_wallet_v014296.mjs` checks customer-id isolation, no-store, valid sums, anonymous/Showcase/suspended denial, wallet UI and public Founding-only listing. `.github/workflows/owner-store-acceptance-v014180.yml` includes source checks, pre-existing Store tests and a Pages build verifying `public/store-sparks.html` and `public/data/crownlight-sparks-store-v014167.json`. Earlier checkout/Store tests requiring the previous five-plan Store were aligned to new Owner offer; no billing security checks were deleted. Check Actions for exact-SHA outcome before claiming TESTED.

## Release outcome

Founding-only public Store visibility: **PROVEN in Supabase**; actual public storefront source: **IMPLEMENTED** until exact-SHA deployed browser evidence. Sparks wallet private member source: **IMPLEMENTED**, not genuine-user production-proven. Existing digital upload and signed delivery: **existing architecture verified**, no customer purchase/download evidenced in this batch. Generic store operations: **OPEN**. Public LIVE founding payment activation: **disabled**.
