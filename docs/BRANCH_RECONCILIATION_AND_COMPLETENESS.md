# v0.13.5.7.1 — Three-branch reconciliation and complete baseline scope

## Verified live GitHub branch inventory (October 12, 2026)

| Branch | Tip SHA | Git files at tip | Relationship to `main` | Action |
|---|---|---:|---|---|
| `main` | `4f9aad845417cec4691c827dba4c80699e003a0f` | 452 | Audited production-code baseline | Incorporated into v0.13.5.7 source |
| `audit/verified-cleanup-v01355` | `8a658ca26012aeea4e360cd64fb256e303ef73bb` | 443 | Exactly one commit ahead of `main`, none behind | Nine proven-unused removals and four corrections reconciled |
| `v0.13.4-skill-development-showcase-admin` | `a301180d040d538bf4d04b900941988ddd60ca0b` | 291 | **Sixteen commits behind `main`, zero ahead** | Previously merged via PR #1; no unique unmerged implementation to cherry-pick |

A GitHub commit ancestry check confirms the old skill-development/Showcase branch is already included in `main`. Cherry-picking that branch wholesale would reintroduce older implementations and could overwrite more recent security, billing or account-management fixes. **The right merge is to retain the newest runtime implementations from `main` and the controlled audit corrections**, not to concatenate older source versions.

## Explicit cleanup-branch reconciliation

| Change from the cleanup branch | Baseline result |
|---|---|
| Remove nine unused older JS/CSS files | All nine are absent. Additional retired artifacts are classified in `docs/REMOVED_BASELINE_FILES.csv`. |
| Add `admin-lab-preview` to staff route policy | Included; route-policy Git blob matches cleanup-branch blob `a220ede5097b8ed201715030dfc176ba65d9010e`. |
| Extend optional staff MFA boundary to newer Admin routes | Included and superseded with hardened middleware; `REQUIRE_STAFF_AAL2_V135` still defaults OFF. |
| Correct the service-worker precache for existing auth-boundary asset | Included with further v0.13.5.7 public cache versioning and protected-route denial. |
| Replace stale v0.6 project manifest metadata | Included, updated again to this branch-reconciled baseline. |

## Unique old-branch file: `sw-v0131.js`

Of 291 old-branch files, **only `sw-v0131.js` was missing from the GitHub `main` tree**. It had been deleted in a later commit. The historic implementation cached broad navigation responses and **must not** be restored literally. This baseline adds a minimal compatibility shim under the same URL that imports the current security-aware `sw.js` implementation. This preserves potential pre-upgrade clients while avoiding the original broad HTML caching policy. All other runtime functionality from that branch was already incorporated into `main` or upgraded after its merge. Not every older release note/test document is included: they were deliberately archived in the Owner's separate backup and source Git history.

## Critical missing state not solved by comparing Git branches

**Neither `main` nor the original old-feature branch provides an authoritative copy** of these migration source files:

- `supabase/migrations/v0.13.5.4_INTELLIGENT_CONTROL_CORE.sql`
- `supabase/migrations/v0.13.5.5_OWNER_MANUAL_ENTITLEMENTS.sql`

This baseline retains `supabase/admin/database-contract-read-only.sql` and prior historic migrations that were actually available. **Do not synthesize, execute, or replay missing migrations** without comparing against the deployed Supabase schema, permissions, functions and records. SQL in Git is not automatically executed by Cloudflare Pages.

## Scope and meaning of completeness

This ZIP includes the **complete clean application source as previously selected**, plus the one safe legacy-branch compatibility shim and reconciliation documentation. That covers HTML, frontend assets, Cloudflare Functions, first-party backend routines, historical Lab catalogs and IDs, current Admin/Accounts/Commerce/Community/Learning interfaces, available schema history, current tests and documents. It does **not** prove every feature works in production or make unimplemented scheduler, visual page-builder, payment collection, or real broker market-data integrations magically operational. Those distinctions remain in `docs/FEATURE_STATUS.md` and `docs/QA_AND_SOURCE_AUDIT.md`.

## Deployment safety

1. **Do not delete or recreate the GitHub repository itself.** That could sever your Cloudflare Pages Git connection.
2. Replace the tracked tree in one reviewed branch commit, preserving Git history and rollback ability; upload ZIP *contents* to the repository root.
3. Prefer a Cloudflare preview deployment. If deleting the old tree via the GitHub web UI, do not delete the `.git` repository or GitHub repository record, and avoid intermediate commits to live `main` that remove the website before uploading it.
4. Test existing and fresh browser sessions, cached service workers, Owner/Admin/Member/Showcase access, book/site-selected Lab pagination, account menu (exactly one Dashboard), historical member progress, checkout disabled status and read-only SQL database contracts.
5. Old branches can be deleted **after** successful acceptance; they need not be merged, and do not add working code beyond this branch-reconciled source. Git branch deletion is separate from deleting runtime source files.

**No Github, database, payment, or Cloudflare production changes were made when this ZIP was prepared.**
