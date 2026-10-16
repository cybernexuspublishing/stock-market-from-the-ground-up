# v0.14.0.38 — Single CAPTCHA + Stripe Customer Lifecycle (Combined Candidate)

**Project:** The Stock Market: From the Ground Up  
**Company:** Cyber Nexus  
**Imprint:** Crown & Lantern Press  
**Prepared:** 2026-10-16  
**Status:** Source candidate / STAGING ONLY. NOT approved for production checkout.  
**Baseline:** v0.14.0.37 on GitHub `main` (commit `fafe49120b2bfa7a7c71e77481b54538a8144201`). The release contains the cumulative v0.14.0.37 source files to keep one compatible, path-preserving combined delivery.  
**Storage:** GitHub repository `cybernexuspublishing/stock-market-from-the-ground-up`; Google Drive path/document ID have not been provided.  
**ZIP format:** Direct-upload *source overlay*; preserve all unrelated files. This is not the complete repository.

## Scope

This single combined package includes all files from v0.14.0.37 plus targeted fixes:

- Prevent the project's authentication adapter from inserting a second Turnstile widget, with an idempotent boot and one token-consumer. Reject unknown legacy CAPTCHA forms instead of bypassing verification.
- Keep email/username/password sign-in and remove the **forced MFA redirect** that persisted in `assets/js/signin.js`. Backend role/password confirmation remain required for sensitive operations.
- Prepare **test-only** Stripe Managed Payments customer checkout for eight Owner-recorded products, using Stripe `price_` values supplied by secure Cloudflare configuration. No Price ID has been invented.
- Prepare one authenticated, signed, server-to-server webhook path and a staging-only transactional Supabase RPC for subscriptions (paid, failed, canceled, full-current-period refunded/disputed) and Lifetime purchases (paid, fully refunded/disputed).
- Protect paid entitlements with account status, approved price checks, immutable checkout intent binding, PostgreSQL event deduplication, Stripe API revalidation, term expiration, independent subscription ownership, and server-only SQL permission.
- Preserve the existing provider routing, KDP Select restrictions, approved Lifetime book benefits, Pick What You Want plan, signed-physical-book infrastructure, moderation and Market Commons behavior. No data migration has run automatically.
- Carry forward v0.14.0.37 Admin Payment Center and source-version corrections; version manifests, route policy, and public cache identify v0.14.0.38.

## PAYMENT SAFETY — CRITICAL

**Public customer checkout remains OFF.** The `scripts/build-pages.sh` script also rewrites *only* the preview build’s public Supabase URL/publishable key to the same staging project, and rejects branch `main`. New customer endpoints require ALL of the following: `GU_STRIPE_V38_STAGING=true`, `GU_STRIPE_V38_FULFILLMENT=true`, a different dedicated Supabase staging project reference in `GU_STRIPE_V38_STAGING_PROJECT_REF`, matching `SUPABASE_URL`, an `sk_test_` Stripe key, matching webhook signing secret, an approved public website checkout switch, enabled Stripe Managed route, eligible enabled catalog entries, and verified `price_` IDs. The known production Supabase project reference is explicitly refused by code. New events never accept live Stripe events.

The new payment migration `supabase/migrations/v0.14.0.38_STRIPE_LIFECYCLE_STAGING_REVIEW_REQUIRED.sql` must be manually reviewed, executed, and end-to-end tested **only on a cloned/staging Supabase environment**. The migration does not activate the website. Never run it on the production database without a separate professional review and release approval.

**Not production complete:** There is no demonstrated real Stripe checkout, live entitlement, live webhook replay, production recovery, tax/product eligibility approval, customer billing portal, full refund/chargeback audit, or multi-account browser E2E acceptance. Digital eBook checkout remains disabled during applicable KDP Select enrollment. Full refunds on old subscription invoices require manual review rather than silently revoking a newer paid term; partial refunds also require case review.

## Files to Review

- `docs/STRIPE_LIFECYCLE_ACCEPTANCE_v0.14.0.38.md` — design, scope, tests, remaining P0 gates and external configuration.
- `docs/STRIPE_STAGING_PRICE_MAP_TEMPLATE_v0.14.0.38.json` — `price_` placeholders; do not enter Product IDs here.
- `supabase/admin/v0.14.0.38_STRIPE_PREFLIGHT_READ_ONLY.sql` and `...POSTFLIGHT_READ_ONLY.sql` — database metadata checks, no data mutation.
- `tests/test_v01438_*` — local contracts, isolated browser, mock Stripe checkout and signed lifecycle.

**Revision:** v0.14.0.38 (2026-10-16) — combined v37 Admin/Stripe catalog overlay, one CAPTCHA owner, no forced MFA, sandbox-candidate subscription/entitlement backend. Not deployed or customer verified.
