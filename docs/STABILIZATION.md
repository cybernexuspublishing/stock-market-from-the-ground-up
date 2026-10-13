# v0.13.5.7.3 — Controlled Frontend Stabilization (Complete GitHub Baseline)

## Release scope and evidence

Derived strictly from **v0.13.5.7.2** (321 source files), which the Owner deployed and tested against the existing Cloudflare Pages/Supabase project. Owner-provided screenshots demonstrated that existing sign-in, OWNER role, Accounts & Access, membership display, Market Commons, and the Foundations Book II Learning Operations count of 46 Labs were functioning. Those screenshots also demonstrated a legacy top-bar collision, oversized homepage hero, intermittent statistics placeholders, wrapped dashboard tabs, misleading "View All Labs" actions, and an outdated production badge.

**This release does not change Supabase tables, run migrations, modify payments, alter KDP titles, grant entitlements, or replace credentials.** It retains all 419 Lab IDs and all 94 original Foundations IDs. No files were removed from the v0.13.5.7.2 repository baseline.

## Corrected modules

1. `assets/js/links.js` no longer appends five competing links directly to the global navbar. The existing navigation bundle now exposes Replay Training, Skill Assessments, Books & Previews, and Security/MFA in appropriate menus. My Books remains under the profile menu. Desktop and mobile availability is maintained. An existing Dashboard quick action is preserved.
2. `assets/css/layout-integrity.css` constrains the shared header brand/navbar/utilities, provides scrollable one-row dashboard tabs, and fixes administrator search-input contrast. The dedicated Market Commons navigation is still retained below the global header.
3. `assets/css/control-center.css` gives the redesigned homepage a workable two-column hero and correctly arranged member-statistics/feature cards at desktop, tablet, and mobile widths.
4. `assets/js/home-community.js` now survives the earlier homepage's asynchronous `<main>` replacement: it reattaches the same component and renders the latest authorized public API result instead of leaving stale placeholders. It retains the 60-second visible-tab refresh and does not invent member counts.
5. `assets/js/admin-core.js` changes the Learning Operations button to **View Selected Labs**, refuses navigation before a collection is chosen, and opens the same Operations Lab Registry where the selection is retained. Also makes the compatibility observer's notice update idempotent, preventing repeated DOM mutations.
6. `functions/api/admin-operations-v0135.js` returns an authenticated staff MFA rollout-policy Boolean. `assets/js/admin-operations.js` displays controls according to that policy (default fail-closed until read); all actual mutations still require server-side authentication, role checks, and are blocked in Showcase.
7. Production badge, `config.js`, `PROJECT_MANIFEST.json`, and middleware body metadata report **v0.13.5.7.3**. `sw.js` retains its stable URL but gets a new cache namespace to discard previous public cached assets during upgrade.

The existing versioned filenames ending in v0.13.5.7.2 are **intentionally not renamed**; changing them again would add reference, caching, and deployment risk without improving their behavior.

## Verified locally (not production proof)

- JavaScript/MJS syntax, JSON/webmanifest parsing, static HTML asset references, unique 419 Lab IDs, 94 original Foundations IDs, route protections, and the historical Showcase block.
- Chromium: navigation, single Dashboard profile link, safe links, hover/click/keyboard at 1440/768/390; one mobile drawer. Brand/header geometry additionally verified at 1440/1100/1024/940/901.
- Chromium: homepage DOM replacement while member-statistics fetch is in progress at 1440/1024/768/390; accurate cached response and no duplicate fetch/overflow.
- Chromium: dashboard tab bar stays in a single horizontal row, all tabs retain accessibility through scrolling.
- Chromium: "View Selected Labs" requires a book selection, retains the selection on the same registry, and does not duplicate action controls.
- Chromium: member and Admin book-scoped Lab registries and 50-record paging, including alternate collection.
- Mock server contract: staff AAL1 is allowed on authenticated OWNER read requests only if mandatory MFA is OFF, and rejected when mandatory MFA is ON. No live permissions were changed.

## Deploy / recovery

1. **Do not delete/recreate** GitHub, Supabase, or Cloudflare again. Keep the current working GitHub `main` commit available for rollback.
2. Extract the **complete ZIP** directly into your local repository root, replacing same-named files, and add the two new test scripts and this document. There are no required source deletions.
3. Prefer committing to a temporary GitHub preview branch. Cloudflare Pages should build it using the **existing** settings and environment variables; no new SQL/environment variables are required.
4. Inspect the preview with an anonymous browser and an authenticated Owner account. Check Market Commons, homepage, profile menu, Dashboard tabs, Admin users, collection-specific Learning Operations, and responsive widths.
5. If accepted, merge that branch into `main` and let Cloudflare perform its existing Git-based production deployment.
6. On an older browser that still shows previous styling, use a hard reload and allow the updated service worker to activate; do not delete production cookies/member accounts as a first step.
7. Rollback by reverting the Git commit to the prior working v0.13.5.7.2 source. Do **not** alter Supabase data or secrets as part of frontend rollback.

### Existing Cloudflare Pages build configuration (do not switch to Workers)

- Production branch: `main`; root directory: repository root/blank; output directory: `public`.
- Build command: `mkdir -p public && cp ./*.html ./config.js ./sw-v*.js ./manifest.webmanifest ./lab-catalog.json ./_headers public/ && cp -R ./assets ./data ./learn public/`
- The `functions/` directory remains in the repository root for Cloudflare Pages Functions and should **not** be copied into `public/`.

### Safeguards

Payment checkout, direct digital book sales while KDP Select safeguards apply, QR activation, mandatory CAPTCHA, mandatory staff MFA, and Showcase creation stay OFF unless expressly reopened after independent acceptance. The existing Supabase project and its SQL are unchanged; exact historical v0.13.5.4/v0.13.5.5 migrations remain unavailable for independent source-level verification. Browser tests are mocked/local; live Supabase RLS, production API writes, historical data licensing/accuracy, and comprehensive cross-browser testing remain outstanding.
