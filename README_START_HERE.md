# v0.14.0.31 R1 — COMBINED PAYMENT + ADMIN ACCOUNT / COMMUNICATIONS REVISION

**Project:** The Stock Market: From the Ground Up  
**Owner-approved baseline:** GitHub main `4fd986cdb470958e3080180f90dc3bdbbb2ae8b7` (v0.14.0.30)  
**Release:** `v0.14.0.31-R1` (supersedes the NOT-UPLOADED v0.14.0.31 ZIP; do not upload both)  
**Release status:** Source candidate; NOT a certified live commerce system.  
**Delivery:** Existing GitHub DIRECT-UPLOAD **complete files at their repository paths**. Overlay these files, preserve all unrelated source. **No patch script.**  
**Google Drive location:** Not created/synchronized to Drive; repository is the source of truth.  
**Document ID:** GU-WEB-BE-20261015-011-R1.

## What's merged

Everything in the previously prepared v0.14.0.31: optional Stripe physical-checkout source, KDP-signed author-copy offer and fulfillment queue, pre/postflight SQL, CI corrections and tests. You have NOT uploaded the earlier version, so use **THIS replacement package ONLY**.

New R1: Admin → **Communications & Messages** navigation and staff in-app message composer by username, sent notice history; username first column for supported account-related tables; member contact shortcuts; Admin Commerce staff shipping queue; OWNER and optionally ADMIN access to just-in-time shipping addresses (requires Owner toggle and staff MFA); OWNER switches for member notices, ADMIN notices, ADMIN shipping access, Lemon Squeezy master checkout, Stripe signed-book checkout, website registration visibility. Screens/controls render from additive JavaScript; existing admin/account/forum assets preserved. This does **not** replace the website with a mockup.

### Payment isolation and switches

- **Lemon Squeezy remains the designated provider for digital eBooks, memberships and tools.** Existing backend flags: `commerce.checkout_enabled` (OWNER UI) PLUS Cloudflare `ENABLE_PAID_CHECKOUT`. No physical items may be sold through Lemon Squeezy.
- **Stripe is OPTIONAL for author-signed physical books only.** `commerce.signed_books_checkout_enabled` (OWNER UI) PLUS Cloudflare `ENABLE_SIGNED_BOOK_STRIPE`; separate SKU/price/order/verified webhook. Both are initially disabled as configured. Do not turn them on before real staging test receipts, refund/chargeback support and consumer terms.
- **Lulu Direct** stays separately enabled/disabled as an external print option, not signed by the owner.

### Access to shipping data

New secure RPC `gu_staff_signed_shipping_session_v01431r1` verifies: active OWNER OR active ADMIN when Owner-activated `commerce.admin_shipping_address_access_enabled=true`; member account, no restricted/suspended/showcase flag, **Supabase AAL2 MFA**, an actually paid/on-hold signed book order. Only after that does the Cloudflare Function query Stripe. Addresses are not persisted into Supabase tables; rendered on demand and cleared from screen after 60 seconds. A background tab/browser with an exposed address remains a practical endpoint risk: use a secure staff workstation and least-privilege access.

### Username identity

The member-facing username is the primary display in supported Account/Access tables (membership, expiration, library, tool passes, flags, support and audit actor) with a direct **Message** control where appropriate. Internal UUIDs remain the true transaction foreign keys. Avoid selecting members by duplicated full names. The main existing Accounts table also moves Username ahead of email. Signed book queues and communication history include usernames. A global sitewide per-table identity acceptance test remains pending for unrelated modules.

### Communications

**P0 lock:** a database trigger also protects these Owner-only switches (including Stripe/Lemon checkout and registration visibility) from the legacy generic `setting_save` API. Changes via the older generic Site Settings text editor will be refused; use the dedicated OWNER controls. This prevents a non-Owner with `settings.manage` from silently enabling ADMIN shipping access.

Existing member `user_notifications` is reused; not a new unreliable inbox. New staff composer resolves username to a unique eligible member server-side; insert + audit occurs in the same PostgreSQL transaction. OWNER messaging defaults ON; ADMIN messaging defaults OFF. Both require actual staff MFA and separate Owner settings. Existing owner-created notices remain readable/managed by legacy Owner notice editor; the database trigger also checks send toggles for legacy inserts.

### Registration/Authentication

Website `site.registration_enabled` controls the visible registration form (UI fail-closed on unknown state). **This is not a security control against direct Supabase `auth.signUp` API access.** To truly prevent signup, disable new-user creation in Supabase Auth configuration and validate on staging; website configuration cannot make that provider change. Password complexity, email confirmation and session timeouts also require provider-side enforcement. Do not advertise these as toggleable only from the website.

## Deployment and database order — DO NOT combine destructive or unreviewed writes

1. Upload this **single** combined R1 direct-upload ZIP to GitHub; use existing Pages build. It does not execute SQL.
2. Inspect latest GitHub Actions for **this exact commit**; all workflows should pass. The previous v0.14.0.30 had two stale mock tests, fixed in the v31 included tests.
3. In staging, run `supabase/admin/v0.14.0.31_SIGNED_BOOK_PREFLIGHT_READ_ONLY.sql`. Review and only then stage `supabase/migrations/v0.14.0.31_SIGNED_BOOK_STRIPE_REVIEW_REQUIRED.sql`.
4. Run `supabase/admin/v0.14.0.31R1_ADMIN_COMMS_PREFLIGHT_READ_ONLY.sql`, review the R1 SQL, stage `supabase/migrations/v0.14.0.31R1_ADMIN_ACCESS_COMMS_REVIEW_REQUIRED.sql`, and run **both** v31/R1 postflights.
5. Verify real-role negatives: normal member; ADMIN with toggle OFF; ADMIN AAL1 vs AAL2; OWNER AAL1 vs AAL2; suspended/restricted and Showcase; recipient private access; refund/canceled order address denied; legacy messaging OFF prevents insertion. Never use SQL Editor superuser results as member authorization evidence.
6. Enable each provider and message channel only after Owner review and functional tests. No real signed KDP book order is automatically placed: owner must order author copies and physically sign/ship.

**Known outstanding:** live Stripe/Lemon Squeezy end-to-end paid and refund runs, Supabase role simulation, KDP author copy real purchase, tax nexus/refund/consumer disclosure review, and comprehensive sitewide forum/labs/account E2E. Release validation does not certify production compliance or regulatory suitability.
