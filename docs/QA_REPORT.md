# QA — v0.13.5.7.4 Stable Filename Baseline

**Local candidate only, not Cloudflare/Supabase production verified.** All prior approved v0.13.5.7.3 stabilization changes are retained. GitHub, database, payments and Cloudflare have not been modified.

## Local checks passed

- All **134** JavaScript/MJS files parse with Node syntax checking; JSON and WebManifest files parse.
- Static HTML references resolve; Cloudflare `functions/_middleware.js` names point at existing stable frontend files.
- **48 frontend JS**, **19 frontend CSS**, Lab Catalog JSON, canonical service worker, and archival TS source changed to durable names; **0 version-named files remain in assets/js or assets/css**.
- 68 static legacy asset URL redirects target real canonical files. 10 installed legacy service-worker entrypoint URLs remain compatible; current registration points at stable `/sw.js`.
- Existing Cloudflare Pages HTTP `/api` endpoints and historical Supabase migrations retain their names and handler contracts. Do not rename these without a separate compatibility migration.
- Cloudflare build script created **210 public files** and excluded `supabase`, `functions`, `docs`, `tests`, `src`, and `PROJECT_MANIFEST.json` from public output. Pages Functions remain in source root.
- Chromium tests: authorized Owner profile one Dashboard entry, anonymous sign-in header, hover/touch/keyboard at 1440/768/390; bundled header; admin links, safe navigation destination.
- Chromium tests: homepage single member-stats call after asynchronous DOM replacement, responsive layout at 1440/1024/768/390; no horizontal overflow; market header at 1440/1100/1024/940/901; one-row scrolling Dashboard tabs.
- Chromium tests: member collection-specific Lab loads and admin collection-specific Lab operations at 50/page; Book II 46; View/Edit distinct; selected collection retained.
- Node mock contracts: Lab API disallows missing/invalid collection, prevents unbounded reads; staff MFA policy OFF/ON enforced for tested scenarios; no live permission claims.
- Catalog **419** unique Lab IDs with **94/94** original Foundations IDs intact. 122 candidate historical entries have ticker and date; 297 do not (no promise of verified historical market tape or event accuracy).
- Legacy Showcase issuance blocked in source. Paid checkout, QR activation, mandatory CAPTCHA/MFA, and direct KDP Select digital sales not enabled by this release.

## Critical live acceptance outstanding

1. **Update existing Cloudflare Pages Build command** to `bash scripts/build-pages.sh` before promoting the renamed Catalog and worker. Existing script references an asset that this package intentionally removes.
2. GitHub baseline replacement must **delete old versioned asset files** after adding stable names; copying extracted ZIP alone does not clean old tracked paths. Use `scripts/cleanup-retired-assets.ps1` after copying, or remove exactly the paths in supplied manifests.
3. Confirm public old static asset redirects work on real Pages, and existing browser SW upgrade resolves stale cached filenames without private page caching.
4. Run Owner/Admin/Member/Showcase authorization test matrix with existing Supabase data. No live owner account write tests or database mutation tests have been performed.
5. Inspect `docs/PROMISES_AND_READINESS_MATRIX.csv`: visual Website Builder, scheduler, and full DB restore are not complete. Missing exact historical v0.13.5.4/v0.13.5.5 SQL sources and missing historical data provenance remain.

**No frontend content or book manuscript was added as filler.** Unverified features remain explicitly marked partial or pending.
