# v0.14.0.28 — COMBINED COMMERCE + PRINT BOOKS — DIRECT-UPLOAD SOURCE ZIP

**Baseline:** `cybernexuspublishing/stock-market-from-the-ground-up` main `028e9806f9d3a4e50c3e340172c17b7f943b452c` (v0.14.0.27).
**Status:** development / staged acceptance; not a payment-system production certification.

## Install

Upload/overlay all files into their matching GitHub paths exactly as prior versions; **preserve every other existing repository file**. There are no patches, scripts to run, eBooks or provider secrets in this ZIP. Cloudflare builds the source, but **does not execute Supabase SQL**.

## This combined release implements

- P0 prevention of paperback/hardcover orders accidentally being charged through Lemon Squeezy (which prohibits physical products).
- Dedicated safe store purchase buttons for independently configured Lulu Direct paperback and hardcover checkouts; existing Amazon format links and learning companion remain unchanged.
- Owner-only, transactional and auditable print-channel setup inside Admin → Commerce, guarded by real Supabase roles and **AAL2 MFA**.
- Preserved Lemon Squeezy digital/monthly/annual/lifetime source paths, and strict KDP Select ebook exclusivity checks.
- Source/browser/API tests, read-only database checks and release notes for faster integration.

**Not live yet:** provider enrollment, Lulu print projects, actual book files, any buyer purchase, print-provider order sync into My Purchases, in-site manual Amazon KDP fulfillment payments, and direct EPUB downloads. Do NOT distribute full EPUB/PDF versions of KDP Select books from your site.

## Supabase review (separate from GitHub)

1. Read `docs/COMMERCE_AND_BOOK_PUBLISHING_v0.14.0.28.md`.
2. Staging: run `supabase/admin/v0.14.0.28_PRINT_CHANNEL_PREFLIGHT_READ_ONLY.sql`.
3. ONLY after review/authorization apply `supabase/migrations/v0.14.0.28_OWNER_PRINT_CHANNELS_REVIEW_REQUIRED.sql` to staging, and do not auto-apply to production.
4. Run `supabase/admin/v0.14.0.28_PRINT_CHANNEL_POSTFLIGHT_READ_ONLY.sql` and test OWNER AAL2/regular member/Showcase/unauthenticated.
5. For the v0.14.0.17 Owner reporting policy just installed, verify with the existing `supabase/admin/v0.14.0.27_REPORT_POLICY_POSTFLIGHT_READ_ONLY.sql`. Do not rerun the migration.

## After the print provider is ready

Create Lulu Direct account, printed projects, payment onboarding and separate paperback/hardcover checkout URLs; configure URLs as the authenticated Owner with MFA in Admin → Commerce. The new Store buttons activate only for configured, published print editions. Lulu checkout handles fulfillment; website checkout and the existing My Purchases ledger do not automatically receive Lulu purchases.

## Acceptance

Run GitHub `Backend Contract v0.14.0.28`, other required workflows, test catalog/auth in isolated staging and test one real provider print order before accepting live sales. Do not activate membership payments until end-to-end billing/refunds are accepted.
