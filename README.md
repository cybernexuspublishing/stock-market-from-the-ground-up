**Current development candidate: v0.14.0.7 — Legacy + Market Commons report security repair (NOT deployed, NOT P0–P2 complete).** See `docs/CURRENT_RELEASE.md` and `docs/v0.14.0.7_FORUM_SECURITY_REPAIR.md`. This version requires two new write migrations in a controlled sequence.

**Current development candidate: v0.14.0.6 (not deployed; not P0–P2 complete).** See `docs/CURRENT_RELEASE.md` and `docs/v0.14.0.6_IMPLEMENTATION_SCOPE.md`.

# v0.14.0.6 — Security and Contract Hardening (Engineering Candidate)

The v0.14.0.5 roadmap remains controlling, but this release does not claim completion of the full P0–P2 program. All 77 tasks and their verification requirements are inventoried in `docs/v0.14.0.6_77_TASK_VERIFICATION_REGISTER.csv`.

## Previous baseline notes: v0.14.0.5


**Current owner-uploadable release candidate. Not production accepted. Do not activate paid checkout.**

Start with `docs/v0.14.0.5_ORDERED_MASTER_EXECUTION_PLAN.md` for the **77 work items in mandatory order**, then read `docs/v0.14.0.5_CHANGE_REPORT.md` and `docs/v0.14.0.5_RELEASE_QA.md`.

v0.14.0.5 adds *two specific server-side Owner account-status authorization guards*, updates live version/cache markers and documents remaining P0–P2 dependencies. It **does not** complete billing, all 419 reviewed lessons, historical trade evidence, or multi-tenant Grant Web Solutions public hosting. Existing v0.14.0.4 fixes and source stay intact.

---

# v0.14.0.4 — Controlled Security Corrections (Cumulative Candidate)

**Not a paid-launch or production acceptance declaration.** Cumulative from the uploaded v0.14.0.3 ZIP. The deployment remains Owner-controlled. Start with `docs/v0.14.0.4_ENGINEERING_AUDIT.md` for implemented changes, open P0–P2 work, SQL requirements, and the tests actually run.

# v0.14.0.3 — Cumulative Security, Forum Access, Account and GWS Draft Hardening

**ENGINEERING CANDIDATE — not production validated.** Complete release records: `docs/v0.14.0.3_ENGINEERING_STATUS.md` and `docs/v0.14.0.3_RELEASE_TESTS.md`. This cumulative full-source package is based on the **exact released v0.14.0.2 ZIP** and retains the first-class Admin Account Management workspace. It is not a replacement for the owner's manual deployment approval or independent review of live customer data.

Changes: Commons forum-level book/tool access under Postgres RLS and posting RPCs; legacy forum read access isolation including SECURITY DEFINER RPCs; legacy real TEST-entitlement creation routes blocked; synthetic TEST OnDemand access closed; Market Commons reports respect member-level RLS; payment webhook store/variant validation and payload minimization; member credential API guards; account deletion's required `DELETE ACCOUNT` phrase; Grant Web Solutions Owner-private draft history, safe preview and audited atomic rollback; service-worker cache version update.

**Database additions (apply in staging in order after the previous version):** `supabase/migrations/v0.14.0.3_COMMONS_ENTITLEMENT_PRIVACY_GUARDS.sql`, `.../v0.14.0.3_LEGACY_FORUM_READ_ISOLATION.sql`, then `.../v0.14.0.3_GWS_DRAFT_REVISIONS.sql`. All require earlier v0.14.0.0–v0.14.0.2 migration prerequisites. Never rerun older cumulative migrations indiscriminately. All paid checkout stays off; GWS client publishing remains off; historical tape/Level II and fully authored Labs require verified original content/data and rights.

---

# The Stock Market: From the Ground Up — Cloudflare Pages Website

**v0.14.0.2 — ACCOUNT MANAGEMENT NAVIGATION AND COMPLETE EDITOR PREVIEW. NOT PRODUCTION ACCEPTED.**

**Current release guidance:** `docs/v0.14.0.2_ACCOUNT_MANAGEMENT_FIX.md` and `docs/v0.14.0.2_TEST_RESULTS.md` supersede the release UI and testing notes. The approved v0.14.0.1 security remediations remain included and their deployment checks remain mandatory. Account Management and Create Account are always visible first-level Control Center navigation items; the full editor includes identity, names, exceptional Owner username correction, email, private date of birth, staff role, membership, profile, flags, Auth suspension, notes, and direct book/tool access links. **DO NOT APPLY `supabase/migrations/v0.14.0.2_owner_account_identity_override.sql` until v0.14.0.1 migrations, schema compatibility, role guards, and backups have been verified in staging.**

**Previous release guidance:** `docs/v0.14.0.1_NEXT_PHASE_SECURITY_AUDIT.md`, `docs/v0.14.0.1_ENGINEERING_RISK_REGISTER.md`, and `docs/v0.14.0.1_RELEASE_TEST_RESULTS.md`. This update fixes Supabase-direct Market Commons TEST/SHOWCASE post bypass, historical forum-report constraint incompatibility, legacy real-entitlement demo routes, official guide attribution controls, paid book-authored question access, and plan/checkout reactivation. It requires the **additional** v0.14.0.1 additive SQL after the existing v0.14.0.0 migration and the separately-held private instructional seeds. **Do not push to production without read-only preflight and live role/account tests.**

### Preserved v0.14.0.0 source provenance

This is the complete GitHub-root website source, based on the Owner-uploaded v0.13.5.7.7 snapshot (401 tracked files). It preserves the existing Cloudflare Pages Functions, Supabase integrations, historical Lab catalog (419 IDs; original 94 Foundations IDs), Dashboard, forum/Market Commons, Admin Control Center, and UI.

New features include: OWNER-only membership visibility and checkout-disable controls; draft founding offers ($49.99 monthly, $499 annually, currently hidden/inactive); server-reviewed graded steps for a single seeded candle-mechanics exercise; private book-authored Lab content storage with a separate private Owner SQL import; server-side paid feature checks for simulator and protected market-data operations; rolling 60-minute activity stats and optional labeled demonstration ranges; atomic forum reporting; and a Grant Web Solutions Owner-only **draft** registry. All these features need the manual additive SQL migration and, for Labs, the separate private SQL seeds before they can be used. No live payment enrollment is enabled.

**Not complete:** verified historical market observations for all Labs; live brokerage/market-data infrastructure; full branching replay execution and first-class graded skill evidence across all Labs; multi-tenant Grant Web Solutions client publishing; fully functional automated operations, backup/restore, and payment-provider reconciliation. Code presence is not production validation. See `docs/CAPABILITIES_AND_GAPS.md` and `docs/SECURITY_OPEN_FINDINGS.md`.

## Manual deployment workflow (no automated writes by assistant)

1. Back up the existing GitHub commit and the **existing** Supabase project.
2. Run the read-only `supabase/admin/v0.14.0.0_PREFLIGHT_READ_ONLY.sql` and review missing prerequisites before any migration.
3. If prerequisites match, manually run `supabase/migrations/v0.14.0.0_OWNER_PLANS_AND_INTERACTIVE_TRAINING.sql` once **only if not already applied**. The Owner must separately load the two private Lab seed SQL files outside of public GitHub (do not place them in this ZIP/repository). **Then, after independent review, apply `supabase/migrations/v0.14.0.1_FORUM_WRITE_AND_CHECKOUT_GUARDS.sql` once**. In staging, subsequently review and apply `supabase/migrations/v0.14.0.2_owner_account_identity_override.sql` exactly once to authorize Owner-only exceptional username correction without weakening ordinary member username immutability. Only after all staging checks pass should production deployment be considered.
4. Run `supabase/admin/v0.14.0.0_POSTFLIGHT_READ_ONLY.sql` and verify counts, roles and RLS.
5. Push this source to a GitHub **preview branch**, then build Cloudflare Pages with `bash scripts/build-pages.sh` and output directory `public`. Cloudflare will separately compile the root `functions/` directory.
6. Test with nonprivileged, Owner, test and Showcase accounts; verify checkout remains disabled, one correct reviewed training example, history persistence, private SQL exposure controls, and forum permissions. Only then consider promoting to main.

Never paste private API keys, encrypted credentials or the private authored 94-Lab/answer-key SQL into GitHub. Do not rerun historical migrations automatically. KDP Select and publication restrictions remain in place.

Active frontend filenames are stable; only the outer ZIP carries the release version. Immutable historical SQL migrations, established API paths and service worker compatibility URLs are deliberate exceptions.
