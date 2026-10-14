# The Stock Market: From the Ground Up

**Development candidate: v0.14.0.10 — Idempotent Admin Sidebar and Module-Mount Preservation**

See `docs/CURRENT_RELEASE.md` and `docs/v0.14.0.10_ADMIN_SIDEBAR_DUPLICATE_ROOT_CAUSE.md` for changed source, regression testing and verification. No new SQL is needed for this specific sidebar repair. v0.14.0.10 does **not** complete all remaining P0–P2 capabilities. Existing 419 Historical Lab identifiers, membership controls, Admin modules and Market Commons source are preserved.

Cloudflare Pages: `bash scripts/build-pages.sh` → `public`. Pages Functions are served from repository-root `functions/`. Owner performs all deployments and SQL execution.

## v0.14.0.10 — Sidebar duplicate-action repair

- Retains existing original Admin module mount roots (including `v135-unified-operations`) while grouping the real button nodes. Prevents module watchdogs treating an initialized module as absent and recreating buttons repeatedly.
- Stable action-key deduplication removes duplicate DOM buttons while retaining the earliest live action node and its click handler.
- Existing Owner-managed registry configuration and all installed backend/module controllers are unchanged.
- No SQL required for this release; the Owner may still need to apply the separately documented `v0.14.0.9_ADMIN_CONTROL_REGISTRY.sql` if it has not been applied. Do not run it twice.
- Deployment: preview branch, browser test with populated Admin sidebar for >30 seconds, then production promotion under Owner control.
- Pending `v0.14.0.7` forum SQL B is a separate operation, only after original and Commons reporting tests pass.

See `docs/v0.14.0.10_ADMIN_SIDEBAR_DUPLICATE_ROOT_CAUSE.md`.
