# Owner Deployment and Verification — Current Candidate

**Candidate ZIP version:** v0.13.5.7.4. **Not deployed or live tested.** Based on the Owner's working v0.13.5.7.2 deployment plus all v0.13.5.7.3 stabilization corrections.

## Before uploading to GitHub — Cloudflare Pages build command WILL need updating

The old Cloudflare Pages build command referenced a release-numbered Lab JSON filename that is now retired. In your **existing** Cloudflare Pages project, change **Settings → Builds & deployments → Build configuration → Build command** to:

```sh
bash scripts/build-pages.sh
```

Keep production branch `main`, root directory blank, output directory `public`, and your existing environment variables/secrets. The new build script excludes backend SQL, internal `docs/`, source TS, and tests from the publicly served output. If using a preview branch, first ensure its build configuration supports this command. Do not switch Pages to Workers.

## One-time GitHub asset-name migration — required ONLY this release

1. Preserve current working `main` commit/backup for rollback. Do not delete or recreate any GitHub repository, Cloudflare Pages project, or Supabase database.
2. Create a local branch from the existing GitHub repository in GitHub Desktop, preferably `release/stable-filenames`.
3. Extract the complete ZIP; copy **contents** directly to local repository root. Overwrite same-named files. Do not copy `public/` (none is included) and do not overwrite `.git`.
4. **IMPORTANT: Copying new names over old names does not delete the obsolete old names.** Run `scripts/cleanup-retired-assets.ps1` (dry-run). After confirming the new files are present, run `scripts/cleanup-retired-assets.ps1 -Apply` from your PowerShell session. If you do not use PowerShell, delete the precise old source paths listed in `docs/ASSET_RENAME_MAP.csv` and `docs/RETIRE_PRIOR_BASELINE_FILES.csv`. Keep the `sw-v0135.js` compatibility shim.
5. Verify GitHub Desktop reports deleted old source asset paths and added new stable paths, with no accidental deletion of `functions/api/` or `supabase/migrations/`.
6. Commit to the temporary branch, push, and verify the Cloudflare **preview** deployment. Uploading extracted files using GitHub's website does *not* automatically remove the old tracked paths.
7. Once preview acceptance passes, merge/promote the branch to `main` using your normal manual workflow. Cloudflare should deploy it automatically with the new build script.

## Critical acceptance checks

- Anonymous routes, homepage hero/nav, member stats, sign-in, create account, password reset, safe redirect, and narrow/mobile views.
- One Dashboard entry under profile, Owner Admin entry only for authorized roles, keyboard/hover/touch menu operation, no Market Commons header overlap.
- Dashboard Skill Development tab/Activity tab one-row scroll, member entitlement counts, protected-route redirects, no private page caching.
- Admin: Accounts list and Owner controls, account View/Edit, role restrictions, memberships and price display (checkout stays OFF).
- Learning Operations: no initial all-Labs request; selecting Foundations Book II shows 46; each book/site group scopes results and pages 50 per request. Lab View remains read-only; Edit separate; member progress unaffected.
- Existing API paths still respond (`/api/username-login`, `/api/home-member-stats-v01353`, `/api/admin-operations-v0135` under proper authorization).
- Browser stale-cache test after SW upgrades from old `/sw-v0135.js` and older shims; old static asset redirects resolve. Verify actual Cloudflare headers, redirects and CSP.
- No active payment checkout/QR activation/Showcase provisioning/mandatory MFA/mandatory Turnstile. Never publish KDP Select titles via direct digital sale while exclusivity applies.

## Supabase and operational safeguards

Keep the same Supabase project and values of encrypted credentials. **Do not rerun SQL migrations**. The read-only `supabase/admin/database-contract-read-only.sql` checks object/column availability without assuming that an optional checkout_enabled column exists. It is not a substitute for actual authorized production RLS tests. Missing historical v0.13.5.4 / v0.13.5.5 migration SQL sources remain unresolved. No live database was modified by this release.

## Recovery

Restore the prior GitHub commit and previous Cloudflare build command if rollback is required. Revert source and build settings only; preserve authentication records, passwords, membership purchases, Supabase roles, and existing encrypted key values.

See `docs/PROMISES_AND_READINESS_MATRIX.csv` for requested features, source/readiness evidence and missing work before public launch. Treat unimplemented features as **not complete**, not aspirational filler.
