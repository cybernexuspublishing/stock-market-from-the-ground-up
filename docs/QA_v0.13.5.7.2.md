# v0.13.5.7.2 — Four-gate consolidated source verification

This is the full-source clean-baseline candidate. It has not been deployed to Cloudflare and is not independently verified against live Supabase, KDP, or a market-data provider.

## Gate 1: Source, dependency, integrity
- Baseline was v0.13.5.7.1 (the complete three-branch reconciled source). The working source starts with its exact extracted file contents.
- 23 superseded JS/CSS files removed or merged. `docs/RETIRED_ASSET_MANIFEST_v0.13.5.7.2.csv` records paths. New bundled frontend files use the **same v0.13.5.7.2 version prefix**, not a later release number.
- Syntax checks pass for all 132 `.js`/`.mjs` scripts (including Cloudflare Functions and retained legacy SW shims).
- JSON/WebManifest parsing passes. HTML local `src`/`href` resources checked, and absolute assets referenced by runtime JS found existing.
- KDP-specific flags, checkout endpoints, Owner permissions, Supabase migration history, and all existing member accounts are not touched by generating this ZIP.

## Gate 2: Browser behavior (Chromium local fixtures)
- Header profile menu: 1440, 768 and 390px — **one** Dashboard link; Owner Admin link; signed-out path, hover, focus, Escape and click.
- New combined homepage member stats: 1440, 768 and 390px — renders to the left of **current v0.13.2 redesigned hero**, preserves its other two sections, one initial aggregate fetch rather than two competing timers.
- Admin Operations: combined account-management script loads and exposes `GroundUpAccountEditor.openById` without uncaught exceptions.
- Shared Historical Lab sections: WHAT / WHY / WHEN / OBJECTIVE, HOW with steps, HTML-escaped teaching content, no embedded student progress writes.

## Gate 3: Learning / business invariants
- Original **419** unique Historical Lab IDs and **94 of 94** original Foundations Lab IDs remain; catalogs are unchanged.
- Member Registry: no all-Lab request on startup, selected collection only, 50 records per page; tested 1440/390px.
- Admin Registry: collection gating, paginated Lab inventory, and two distinct View/Edit controls; tested 1440/760px.
- Lab API: invalid books rejected and collection-scoped backend 50-record pagination validated by mock cases.
- Existing payment/checkout, books, Showcase, and membership server handlers retained; **no claim** that they were fully regression-tested against the production database.

## Gate 4: Production acceptance — NOT COMPLETE
- Admin operations under real Owner/Admin/Moderator/Member/Dummy/Showcase sessions.
- Supabase Auth password policy vs client-side 10-character rule.
- Actual storefront discounts and provider billing; KDP Select compliance; QR flags; real entitlement handling.
- Historical Lab content fidelity, trading example price/volume/catalyst/tape provenance and look-ahead controls.
- Cloudflare deployment, old-service-worker migration, mobile real devices, email provider and payment webhooks.

## Known unresolved issues
1. Exact previously executed v0.13.5.4/v0.13.5.5 SQL sources are absent from GitHub; production database contracts need read-only verification, not guessed migrations.
2. Some old Admin endpoints require MFA despite the current policy to defer mandatory MFA. Do not weaken authorization without verifying backend RBAC.
3. Competing historical Admin panel navigation still exists; separate domain modules intentionally remain instead of one enormous, untestable script. Further retirement needs real role-based tests.
4. One authoritative desktop menu is tested in fixture; a previously cached service worker may still serve older scripts until the new deployment takes control.

**Conclusion:** Suitable as a new source baseline for staged upload and Cloudflare preview; not certified as a fully functioning production installation.
