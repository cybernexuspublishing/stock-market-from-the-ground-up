# v0.14.0.0 — Owner deployment, SQL, and recovery instructions

**No migration has been run by the assistant. No GitHub, Supabase or Cloudflare changes have been pushed.**

## Source baseline
- User-uploaded exact v0.13.5.7.7 repository ZIP was extracted and inventoried (401 files).
- This package supersedes v0.13.5.7.7 for local development. The deployment configuration remains `bash scripts/build-pages.sh` with output `public`.
- ZIP extraction is at the repository root. Stable active JS/CSS filenames are preserved. Only ZIP release name and deliberately versioned SQL/API compatibility files carry versions.

## Safe sequence
1. Preserve the current working GitHub commit; create a **preview branch** for v0.14.0.0.
2. Run `supabase/admin/v0.14.0.0_PREFLIGHT_READ_ONLY.sql` in the **existing** Supabase project. Record results. Do not modify existing migrations. Verify that `platform_plans.checkout_enabled` exists, and that `user_has_tool_access(uuid,text)`, `forum_reports`, `profiles`, `admin_user_roles` and the audit table exist.
3. **Review and manually execute** `supabase/migrations/v0.14.0.0_OWNER_PLANS_AND_INTERACTIVE_TRAINING.sql` **once** if the prerequisites pass and the Owner approves the new schema. This is an additive production schema change; database backup and rollback plan are required. It inserts two **disabled/draft** founding plans, adds Owner plan-visibility RPC, server-only question bank/attempts, server-only GWS project drafts and atomic forum reports.
4. **IMPORTANT PRIVATE CONTENT LOAD:** Download the separate `v0.14.0.0_OWNER_PRIVATE_LAB_CONTENT_SEED_DO_NOT_UPLOAD_TO_GITHUB.sql` and `v0.14.0.0_OWNER_PRIVATE_F2_C07_L01_REVIEWED_ANSWER_SEED_DO_NOT_UPLOAD_TO_GITHUB.sql` **from the ChatGPT artifacts**, NOT from the website ZIP. These files contain paid instructional text and a private answer key. **NEVER place them in the public GitHub repository or a publicly downloadable website directory.** Run them in the existing Supabase SQL Editor *after* the schema migration. They seed 94 approved book-derived Labs and one six-question mechanical grading example, with no claim of independent historical data verification. Do not rerun them blindly; they use `ON CONFLICT DO NOTHING` to preserve edited versions.
5. Run `supabase/admin/v0.14.0.0_POSTFLIGHT_READ_ONLY.sql`. Verify `Private authored Foundations Lab records = 94`, `Reviewed question sets >= 1`, and two founding plans remain inactive, invisible and with checkout OFF.
6. Do not deploy new Cloudflare Functions before the schema AND private instructional seeds are installed. Missing RPCs will intentionally fail closed.
7. Upload the complete new ZIP contents to your preview Git branch; preserve original directory layout and keep `scripts/build-pages.sh` as Pages build command.
8. Preview-check authentication, OWNER-only plan and GWS screens, one fully authored F2-C07-L01 assessment, book-only Guided access, Market Simulator paywall and Market Commons reporting.
9. If preview passes, commit/merge `main` and review production logs before inviting or billing users. No live checkout, book activation, Showcase production grants or mandatory staff MFA is enabled by this release.

## Required environment variables
Existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (secret) and `PUBLIC_SITE_URL`. Do not replace encryption secrets. Keep `ENABLE_PAID_CHECKOUT` **unset or false**. Keep `REQUIRE_STAFF_AAL2_V135`, mandatory Turnstile, production Showcase entitlement and QR launch off until separately accepted.

## Founding offer governance
Two draft memberships are created by the migration, **not for sale**:
- `FOUNDING_MONTHLY` — $49.99/month (`4999` cents)
- `FOUNDING_ANNUAL` — $499/year (`49900` cents)
Both are `active=false`, `public_visible=false`, `checkout_enabled=false` by default. The Owner plan-visibility RPC intentionally **refuses to publish** them. Billing variants, offer limits, eligibility, grandfathering duration, renewal disclosures, consent, provider reconciliation and cancel/refund flows require explicit approval and implementation before activation. Existing $69.99/$699/$2,499 list prices remain unchanged.

## Three different membership controls
- `active=false`: do not offer a plan to new purchasers; this is **not cancellation** of existing subscriptions.
- `public_visible=false`: hide the plan from the public catalog, also exclude it from purchase eligibility.
- `checkout_enabled=false`: disable that plan's new checkout without changing existing contractual entitlements. Only OFF is permitted through the new Admin UI; never turn payments on through these controls.
- Legacy frontend static membership plan fallback is suppressed when the real catalog is unavailable, to prevent showing stale retired/hidden offers.

## What is actually graded
Only `F2-C07-L01` has a newly seeded six-question, book-derived **mathematically reviewable** answer key. Source state explicitly says `book_authored_unverified_market`. It is **not** independently verified historical OHLC or licensed Time & Sales. The answer key is delivered **separately** from the public GitHub upload. More exercises require editorial answer-key review and independent market source validation where applicable. Completion and response completeness are not evidence of trading mastery.

## Security caveats
- Premium simulator screen and BYO market-data bars now make a server-side entitlement check. Purely local CSV rendering on a public web app is technically copyable; actual privileged storage, API and assessment writes must remain server-authorized.
- The authored 94-Lab payload and answer-key seed are **separate private SQL artifacts and are excluded from the website ZIP**; the new bank/attempt records are private (service-role-only), but the existing legacy `lab_attempts` path still has its earlier schema/RLS behavior and cannot be represented as a secure new graded assessment.
- GWS client-site project registry is **draft-only** with server OWNER guard and service-role access; it is NOT a multi-tenant hosted client platform, not a custom-domain publisher and not a finished customer CRM.
- Forum report submission gains a database advisory-lock/quota/duplicate operation. Other forum posting/moderation endpoint rate limits, abuse protection, concurrency and RLS still require live audits.
- `v014_owner_plan_visibility` updates a plan and writes an audit event atomically in PostgreSQL. The existing GWS draft editor and instructor editor have best-effort audit only; complete regulated audit coverage remains a requirement.

## Rollback
Use the previous GitHub commit to revert frontend/Function code. Do not blindly `DROP` new tables or the new RPCs after users have created attempts; retain records, take a database backup and plan a compatible rollback. Versioned lesson attempts cannot be edited by browser clients. Preserve protected reader data and entitlements.

## Legacy pricing path safety
The old `/api/admin?action=plan_save` mutation is disabled because it can overwrite new plan visibility in a nontransactional upsert. Existing plan viewing and Owner plan availability controls remain. Separate provider-verified price changes are pending an audited transaction and Lemon Squeezy product reconciliation. The customer-facing plan/tool purchase links are displayed as disabled until the server-verified checkout is deliberately enabled and reviewed. Do **not** turn checkout on by editing frontend flags.

## Retry safety
The v0.14.0.0 SQL now pins attempts to a reviewed rubric version, reuses unfinished sessions, and requires `expectedStep` for compare-and-swap answer submission inside a row lock. A stale duplicate answer is rejected, never advanced into the next question. The Owner must use this exact revised migration, not any earlier draft.
