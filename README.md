# The Stock Market: From the Ground Up — Cloudflare Pages Website

**v0.14.0.0 — PREVIEW RELEASE CANDIDATE. NOT PRODUCTION ACCEPTED.**

This is the complete GitHub-root website source, based on the Owner-uploaded v0.13.5.7.7 snapshot (401 tracked files). It preserves the existing Cloudflare Pages Functions, Supabase integrations, historical Lab catalog (419 IDs; original 94 Foundations IDs), Dashboard, forum/Market Commons, Admin Control Center, and UI.

New features include: OWNER-only membership visibility and checkout-disable controls; draft founding offers ($49.99 monthly, $499 annually, currently hidden/inactive); server-reviewed graded steps for a single seeded candle-mechanics exercise; private book-authored Lab content storage with a separate private Owner SQL import; server-side paid feature checks for simulator and protected market-data operations; rolling 60-minute activity stats and optional labeled demonstration ranges; atomic forum reporting; and a Grant Web Solutions Owner-only **draft** registry. All these features need the manual additive SQL migration and, for Labs, the separate private SQL seeds before they can be used. No live payment enrollment is enabled.

**Not complete:** verified historical market observations for all Labs; live brokerage/market-data infrastructure; full branching replay execution and first-class graded skill evidence across all Labs; multi-tenant Grant Web Solutions client publishing; fully functional automated operations, backup/restore, and payment-provider reconciliation. Code presence is not production validation. See `docs/CAPABILITIES_AND_GAPS.md` and `docs/SECURITY_OPEN_FINDINGS.md`.

## Manual deployment workflow (no automated writes by assistant)

1. Back up the existing GitHub commit and the **existing** Supabase project.
2. Run the read-only `supabase/admin/v0.14.0.0_PREFLIGHT_READ_ONLY.sql` and review missing prerequisites before any migration.
3. If prerequisites match, manually run `supabase/migrations/v0.14.0.0_OWNER_PLANS_AND_INTERACTIVE_TRAINING.sql` once. The Owner must separately load the two private Lab seed SQL files outside of public GitHub (do not place them in this ZIP/repository).
4. Run `supabase/admin/v0.14.0.0_POSTFLIGHT_READ_ONLY.sql` and verify counts, roles and RLS.
5. Push this source to a GitHub **preview branch**, then build Cloudflare Pages with `bash scripts/build-pages.sh` and output directory `public`. Cloudflare will separately compile the root `functions/` directory.
6. Test with nonprivileged, Owner, test and Showcase accounts; verify checkout remains disabled, one correct reviewed training example, history persistence, private SQL exposure controls, and forum permissions. Only then consider promoting to main.

Never paste private API keys, encrypted credentials or the private authored 94-Lab/answer-key SQL into GitHub. Do not rerun historical migrations automatically. KDP Select and publication restrictions remain in place.

Active frontend filenames are stable; only the outer ZIP carries the release version. Immutable historical SQL migrations, established API paths and service worker compatibility URLs are deliberate exceptions.
