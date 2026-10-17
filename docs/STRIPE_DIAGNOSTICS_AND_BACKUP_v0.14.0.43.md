# Cyber Nexus — Stripe Verification Diagnostics and Website Source Backups

| Metadata | Value |
|---|---|
| Company | Cyber Nexus |
| Project | The Stock Market: From the Ground Up |
| File | STRIPE_DIAGNOSTICS_AND_BACKUP_v0.14.0.43.md |
| Type | Markdown |
| Document ID | GU-WEB-ENG-014043-20261017 |
| Date / version | 2026-10-17 / v0.14.0.43 |
| Status | Engineering source candidate, live Stripe acceptance pending |
| GitHub location | docs/ |
| Google Drive ID/location | Not created / unassigned |
| Dependencies | Existing Supabase credentials and schema, Cloudflare Pages Functions, Stripe test-key and price mapping |
| Purpose | Owner-facing server error guidance, auditable source-only backups, intact existing backend boundary |

## Changes
- Read-only Stripe catalog API now returns bounded error codes for missing Cloudflare Supabase configuration, expired/missing JWT, unauthorized roles, missing Stripe test key, account mismatch, malformed JSON price map and provider failure.
- OWNER Admin UI converts error codes into actionable setup guidance without receiving any secret or making Stripe mutations. Invalid/HTML API errors also fail cleanly.
- Source backup Actions workflow archives only Git-tracked website files and supplies a SHA-256 checksum. The ZIP has no extra top-level directory and can be downloaded from the relevant workflow run. Retention is 30 days.
- Direct GitHub Source Code ZIP download is also available from the main branch through GitHub's Code -> Download ZIP menu. Github web archives are source snapshots, not full infrastructure backups.

## Stripe provider and database dependencies
To resolve runtime verification failures, an authorized operator must configure and check these existing Cloudflare Pages server settings:
1. SUPABASE_URL; SUPABASE_PUBLISHABLE_KEY; SUPABASE_SECRET_KEY.
2. GU39_STRIPE_TEST_SECRET_KEY: correctly scoped Stripe sk_test credential from the known sandbox account.
3. GU39_STRIPE_TEST_PRICE_MAP_JSON: the existing eight SKU-to-price_ ID mappings (not a new import).
4. GU39_SANDBOX_SHADOW_GATE: keep false while using the read-only verification endpoint. GU39_STRIPE_TEST_WEBHOOK_SECRET is needed only for later explicit sandbox webhook testing.

No keys are stored in the repository and none should be sent by chat. Supabase SQL source files can be committed through GitHub, but schema execution, production data inspections and secret management require separately authorized provider access.

## Source backup versus complete recovery
The source ZIP is restorable from GitHub alone. It does **not** export the active Supabase database, Supabase storage/auth users, Cloudflare environment/secrets, Stripe product configurations, or provider billing history. Full disaster recovery requires independent protected provider exports, secret escrow under Owner control, and a restore rehearsal; never commit those exports to a public repository.

## Release controls
No new SQL migration, no production grant modifications, no live Stripe subscription fulfillment, no KDP Select direct digital activation, no mandatory MFA/CAPTCHA enablement, no changes to pricing. The live checkout flag remains OFF. All eight products and prices still require authenticated provider-side 8/8 acceptance, then isolated webhooks and lifecycle tests.

## Revision history
| Revision | Date | Change |
|---|---|---|
| v0.14.0.43 | 2026-10-17 | Actionable Stripe setup diagnostics and automated downloadable source backups. |
