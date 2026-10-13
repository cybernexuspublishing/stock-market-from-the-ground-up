# Stable file paths and release procedure

**Release candidate:** v0.13.5.7.4. **This entire repository ZIP is not deployed.** The version is in the ZIP filename and a small set of metadata / UI values; it **must not be added to filenames of future editable frontend resources.**

## Canonical naming rules

- Active frontend scripts: `assets/js/navigation.js`, `assets/js/home-community.js`, `assets/js/admin-core.js`, etc. One fixed path per responsibility; **replace the same file** in future releases.
- Active stylesheets: `assets/css/layout-integrity.css`, `assets/css/control-center.css`, etc. Do not create `styles-vNext.css` files.
- Catalog: `lab-catalog.json`; service worker: `sw.js`; build script: `scripts/build-pages.sh`.
- The ZIP filename is the release identifier. Keep version metadata in `PROJECT_MANIFEST.json` and `config.js` for diagnostics; filename identity remains stable.
- The owner uploads/pushes manually; never automatically push or execute SQL.

## Three essential backwards-compatibility exceptions (DO NOT RENAME)

1. **Existing Cloudflare Pages Functions public `/api/*-v013...` URLs** remain unchanged. They are HTTP contracts used by current and cached clients. Renaming the function filename *changes the endpoint URL* and could break real accounts. A future deprecation needs confirmed redirect/shim behavior and an API compatibility test. Do not create *new* versioned API endpoints by default.
2. **Supabase SQL migration files** retain their original versioned filenames permanently for reproducibility and audit history. Renaming does not rerun migrations, but destroys provenance correspondence. Some promised v0.13.5.4 and v0.13.5.5 SQL sources are still missing: do not invent or reapply them.
3. **Historic `sw-v*.js` aliases** remain as tiny imports to `sw.js` so installed browsers can upgrade. Do not delete these before checking controlled upgrades on live browser clients. All active new registration uses `/sw.js`.

The above exceptions are intentional: a literal 'zero version strings anywhere in a ZIP' would be incompatible with a safe upgrade. They do **not** require adding new duplicate frontend files in future releases.

## NEW Cloudflare Pages build command — ONE-TIME REQUIRED CHANGE

In the EXISTING Pages project, update **Build configuration -> Build command** to:

```sh
bash scripts/build-pages.sh
```

Keep build output directory `public`, production branch `main`, root directory empty. The previous build command explicitly copies `v0.13.3_LAB_CATALOG.json`, which this release renames to `lab-catalog.json`: **the old command will FAIL against this release.** Change the Cloudflare build command when promoting this release, otherwise **do not push to `main`**. Test on a preview branch first with the new build command. The script exposes public pages/data/assets but NOT functions, docs, tests, SQL, source TS, or secrets. Pages Functions are picked up from `functions/` at the repository root.

## Owner replacement procedure

Extract ZIP **contents** directly into a local clone of `cybernexuspublishing/stock-market-from-the-ground-up`. GitHub Desktop detects all renamed paths as old deletions and new additions; **renamed old paths must be removed**, not left in GitHub. Do not delete/recreate the repo, Cloudflare or Supabase. Check the exact `docs/ASSET_RENAME_MAP.csv` disposition before commit and verify old asset files are gone. A dry-run and deliberate one-time cleanup are provided by `scripts/cleanup-retired-assets.ps1` (`-Apply` to delete); it only deletes an old path if the corresponding new file is present. The legacy `sw-v0135.js` shim is intentionally retained. If uploading through GitHub browser, manually delete old names; web-upload alone does not delete tracked files. Never create a version-number wrapping directory. Keep rollback commit.

## Tests and rollout

Perform local source checks and headless browser tests, then Cloudflare preview acceptance (Owner/Member/anonymous, private API, cache migration and new build script), then merge `main`. No live Supabase data writes, secret regeneration, member/role grant or payment activation are needed for this release. If any test fails, revert Git commit and restore the previous build command as needed.
