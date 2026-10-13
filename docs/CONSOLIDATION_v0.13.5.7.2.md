# v0.13.5.7.2 — JS / CSS consolidation and risk register

## Baseline and boundary

This full clean-baseline package starts from v0.13.5.7.1, which was reconciled from `main`, `audit/verified-cleanup-v01355`, and `v0.13.4-skill-development-showcase-admin`. No new Supabase SQL, book manuscript, payment setting, production entitlements, or repository branch is modified by generating the ZIP.

**Merge technique:** The previous self-invoking modules remain separately scoped inside each combined file. The original business logic is preserved except for targeted frontend corrections listed below. This reduces HTTP requests and removes duplicated ownership without exposing internal functions globally. Independently secured APIs remain separate.

## Exact consolidation and deletion map

| Previous source file(s) | New authoritative file / state | Why |
|---|---|---|
| `assets/js/v0.13.5.3-home-stats.js`, `assets/js/v0.13.5.4-home.js` | **`assets/js/v0.13.5.7.2-home-community.js`** | One homepage counter, one polling timer, one API source; adds support for the modern `.v132-home-hero-grid` replacing the original hero (which explained invisible counters). |
| `assets/js/v0.13.5.3-signup-password.js` | **merged into `assets/js/signup.js`** | One registration source containing the visible strength guidance and pre-submit validation; direct `createAccount` now also enforces 10–120 characters, upper/lowercase and the accepted symbols. Supabase Auth must be separately configured. |
| `assets/js/v0.13.5-admin-ops-link.js`, `assets/js/v0.13.5.3-admin-accounts.js` | **`assets/js/v0.13.5.7.2-admin-operations.js`** | Removes account-editor script injection race and retains the authoritative Owner editor, including DOB input mask and account CRUD. |
| `assets/js/v0.13.5-admin-books.js`, `assets/js/v0.13.5.3-book-sales.js`, `assets/js/v0.13.5.4-replay-price.js` | **`assets/js/v0.13.5.7.2-commerce-presentation.js`** | One catalog presentation bundle loaded only for admin/store/membership. Keeps all payment, pricing, and KDP restrictions in their original backend/API services. |
| `assets/js/v0.13.5-dashboard-metrics.js`, `assets/js/v0.13.5-settings-layout.js` | **`assets/js/v0.13.5.7.2-member-dashboard.js`** | Common member Dashboard initialization with independently scoped metrics and settings. |
| Seven superseded `assets/js/v0.13.2.x`–`v0.13.4.2-service-worker.js` registration files | **removed** | They are not referenced by the current application entry points. Old browser worker URL shims `sw-v0131.js` to `sw-v01342.js` stay available for safe upgrade compatibility; one current registrar remains. |
| `assets/css/v0.13.5-admin-unified.css`, `assets/css/v0.13.5.3-admin-accounts.css`, `assets/css/v0.13.5.3-book-sales.css` | **`assets/css/v0.13.5.7.2-admin-operations.css`** | Consistent admin stylesheet, injected in HEAD before user interaction. |
| `assets/css/v0.13.5.3-home-community.css` | **merged into `assets/css/v0.13.5.4-control-center.css`** | Homepage counter layout and admin responsive style no longer require competing stylesheet registrations. |
| Duplicated WHAT/WHY/WHEN/OBJECTIVE / HOW teaching markup in member and Owner Lab preview | **`assets/js/v0.13.5.7.2-lab-narrative.js`** | Shared presentation-only function; separate student response/progress writes and admin read-only boundaries remain mandatory. |

| `assets/js/v0.11-global.js`, `assets/js/v0.13.4.1-mobile-auth.js` | **`assets/js/v0.13.5.7.2-navigation.js`** | One script entry for the canonical desktop signed-in menu and responsive mobile drawer, with existing separate initialization logic preserved. |

## Explicitly retained, by design

- `v0.13.5.7.2-navigation.js` bundles the canonical `v0.11-global.js` desktop menu and `v0.13.4.1-mobile-auth.js` responsive drawer as two independently scoped modules in their original load order. Other old enhancers have no separate profile-menu renderer; duplicating/rewriting them would risk signed-in and signed-out navigation contracts.
- Auth/session/route-policy scripts and Cloudflare middleware are separate security boundaries, not safe candidates for a mega-script.
- `admin.js`, `admin-v011.js`, `admin-v013.js`, `v0.13.4-admin.js`, `v0.13.5.4-admin-core.js`, and `v0.13.5.5-accounts-access.js` retain domain-specific responsibilities. There is still legacy Admin overlap to retire **after** role-based live end-to-end tests; moving code to one huge file without such tests does not establish correctness.
- Member historical Lab `site_lab_progress` saves and administrative preview remain separate. The only extracted code creates escaped instructional HTML. No synthetic Level II/tape market events were added.
- `journal-common.js` and the Journal's various editing, reporting, simulator and review modules remain independent workflows.
- Public `site.js` remains directly included in static pages for standalone page behavior; removing it requires updating more than 50 HTML entry points and retesting.

## Critical unresolved operational prerequisites

1. The exact previously executed v0.13.5.4 and v0.13.5.5 SQL migration sources are not present. **Do not rerun old SQL.** Verify database contracts with `supabase/admin/v0.13.5.6_DATABASE_CONTRACT_READ_ONLY.sql` against the existing original Supabase project.
2. Existing roles must be tested on **actual** Owner, Admin, Moderator, Member, Dummy, and Showcase accounts. Mock checks cannot establish production permissions.
3. Some older Learning Operations mutations retain mandatory-AAL2 checks independent of rollout settings. They remain unchanged, and user-visible operations may be unavailable until the legacy endpoint authorization is reconciled server-side.
4. Cloudflare's GitHub connection may need reauthorizing after the GitHub repository was recreated. Preserve the existing Cloudflare Pages project and its environment variables; do not recreate Supabase.
5. A valid Historical Lab ID is not proof of real stock prices, historical quote licensing, corporate-action correctness, tape data or educational accuracy. Those require source-backed market research and validation.
6. An initial new browser build and a previously registered service-worker browser both require acceptance testing, particularly offline access to protected pages.

## Four QA gates for your new baseline

1. Source integrity: compare deleted file paths with updated HTML, middleware, and active service-worker runtime asset references; run JS/JSON/HTML link checks.
2. Browser runtime: use desktop, tablet and mobile test fixtures for exactly one Dashboard profile link, homepage member counters and no double refresh timer, admin editor and Lab display.
3. Business/data security: preserve KDP digital exclusivity restrictions, no automatic subscription checkout, synthetic Showcase-only demos, authorized Owner-only writes, read-only preview.
4. Production acceptance: test Cloudflare Pages Functions and existing Supabase connection under all relevant roles before promoting to your live baseline.

**Not a claim that every frontend/backend issue or external trading-data record has been fully verified.**
